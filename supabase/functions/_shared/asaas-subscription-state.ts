import { createAdminClient } from './supabase.ts';
import { requiresSecondObservation, subscriptionState, type SubscriptionState } from './asaas-subscription-state-core.ts';

type AdminClient = ReturnType<typeof createAdminClient>;
const READ_TIMEOUT_MS = 8000;
const CONFIRMATION_PAUSE_MS = 1000;

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

async function asaasGet(path: string) {
  const response = await fetch(`${requiredEnv('ASAAS_BASE_URL').replace(/\/+$/, '')}${path}`, {
    headers: {
      access_token: requiredEnv('ASAAS_API_KEY'),
      accept: 'application/json',
      'User-Agent': 'Comvaga/1.0',
    },
    signal: AbortSignal.timeout(READ_TIMEOUT_MS),
  });
  if (response.status === 404) return { status: 404, body: {} as Record<string, unknown> };
  if (!response.ok) throw new Error(`asaas_subscription_read_failed_${response.status}`);
  const body = await response.json().catch(() => null);
  if (!body || typeof body !== 'object') throw new Error('asaas_subscription_response_invalid');
  return { status: response.status, body: body as Record<string, unknown> };
}

export async function readAsaasSubscriptionDetails(subscriptionId: string) {
  const result = await asaasGet(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
  if (result.status !== 200 || String(result.body.id || '') !== subscriptionId) {
    throw new Error('asaas_subscription_details_unavailable');
  }
  return result.body;
}

export class AsaasObservationUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AsaasObservationUnavailable';
  }
}

export async function readCurrentSubscription(subscriptionId: string, customerId: string | null) {
  const result = await asaasGet(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
  if (result.status !== 404) return subscriptionState(result.body, subscriptionId);

  if (!customerId) throw new Error('asaas_subscription_not_found_unconfirmed');
  for (let offset = 0; offset < 1000; offset += 100) {
    const page = await asaasGet(
      `/subscriptions?customer=${encodeURIComponent(customerId)}&includeDeleted=true&limit=100&offset=${offset}`,
    );
    if (page.status !== 200 || !Array.isArray(page.body.data)) {
      throw new Error('asaas_deleted_subscription_lookup_failed');
    }
    const match = page.body.data.find((item: unknown) =>
      item && typeof item === 'object' && String((item as Record<string, unknown>).id || '') === subscriptionId
    ) as Record<string, unknown> | undefined;
    if (match) return subscriptionState(match, subscriptionId);
    if (page.body.hasMore !== true) break;
  }
  throw new Error('asaas_subscription_not_found_unconfirmed');
}

export async function reconcileAsaasSubscriptionState(
  admin: AdminClient,
  negocioId: string,
  subscriptionId: string,
  options: { eventId?: string; eventType?: string; eventPayload?: Record<string, unknown>; attemptCount?: number } = {},
) {
  if (!negocioId || !subscriptionId) throw new Error('subscription_reconciliation_identity_required');
  const eventSubscription = (options.eventPayload?.subscription || {}) as Record<string, unknown>;
  const deletedEvent = options.eventType === 'SUBSCRIPTION_DELETED'
    && eventSubscription.deleted === true
    && String(eventSubscription.id || '') === subscriptionId
    && Boolean(options.eventId);

  const { data: current, error: currentError } = await admin
    .from('business_subscriptions')
    .select('provider, provider_subscription_id, provider_customer_id, provider_status, provider_status_source, provider_status_revision')
    .eq('business_id', negocioId)
    .maybeSingle();
  if (currentError) throw currentError;
  if (String(current?.provider || '').toLowerCase() !== 'asaas'
    || current?.provider_subscription_id !== subscriptionId) {
    throw new Error('subscription_reconciliation_identity_changed');
  }
  if (current.provider_status === 'DELETED' && current.provider_status_source) return 'DELETED';

  let nextState: SubscriptionState;
  let source = 'asaas_api';
  if (deletedEvent) {
    nextState = 'DELETED';
    source = 'asaas_webhook_deleted';
  } else {
    try {
      nextState = await readCurrentSubscription(subscriptionId, current.provider_customer_id || null);
      if (requiresSecondObservation(current.provider_status, nextState)) {
        await new Promise((resolve) => setTimeout(resolve, CONFIRMATION_PAUSE_MS));
        const secondState = await readCurrentSubscription(subscriptionId, current.provider_customer_id || null);
        if (secondState !== nextState) throw new Error('asaas_subscription_state_inconclusive');
      }
    } catch (error) {
      throw new AsaasObservationUnavailable(error instanceof Error ? error.message : String(error));
    }
    if (options.eventType?.startsWith('SUBSCRIPTION_') && options.attemptCount === 1
      && eventSubscription.status
      && eventSubscription.deleted !== true
      && String(eventSubscription.status).toUpperCase() !== nextState) {
      throw new Error('asaas_subscription_event_api_conflict');
    }
  }

  const { data: applied, error: applyError } = await admin.rpc('apply_asaas_subscription_state', {
    p_negocio_id: negocioId,
    p_provider_subscription_id: subscriptionId,
    p_expected_revision: Number(current.provider_status_revision || 0),
    p_status: nextState,
    p_source: source,
    p_event_id: deletedEvent ? options.eventId : null,
  });
  if (applyError) throw applyError;
  if (applied?.result === 'applied') return nextState;
  if (applied?.result === 'unchanged_deleted') return 'DELETED';
  if (applied?.result === 'revision_conflict') {
    throw new Error('asaas_subscription_reconciliation_concurrent_update');
  }
  throw new Error(`asaas_subscription_reconciliation_${String(applied?.result || 'failed')}`);
}
