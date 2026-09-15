import { createAdminClient } from './supabase.ts';

const DEFAULT_ASAAS_BASE_URL = 'https://api-sandbox.asaas.com/v3';

type AdminClient = ReturnType<typeof createAdminClient>;

type ProviderSyncStatus = Record<string, unknown> | null | undefined;

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function asText(value: unknown) {
  return String(value || '').trim();
}

export function providerSyncErrorMessage(error: unknown, fallback = 'provider_sync_failed') {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || fallback);
  }
  return String(error || fallback);
}

function centsToReais(cents: number) {
  return Number((Number(cents || 0) / 100).toFixed(2));
}

async function callAsaas(path: string, body: Record<string, unknown>, method = 'POST') {
  const apiKey = requiredEnv('ASAAS_API_KEY');
  const baseUrl = (Deno.env.get('ASAAS_BASE_URL') || DEFAULT_ASAAS_BASE_URL).replace(/\/+$/, '');

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      access_token: apiKey,
      accept: 'application/json',
      'content-type': 'application/json',
      'User-Agent': 'Comvaga/1.0',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  const responseText = await response.text().catch(() => '');
  let data: Record<string, unknown> = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    const asaasError = Array.isArray(data?.errors)
      ? data.errors
        .map((item: Record<string, unknown>) => item.description || item.message || item.code)
        .filter(Boolean)
        .join(' | ')
      : data?.description || data?.message || responseText || JSON.stringify(data);
    throw new Error(
      `asaas_subscription_update_failed (${response.status}): ${String(asaasError || '').trim() || 'empty_response'}`,
    );
  }

  return data;
}

export function hasRunnableProviderSync(status: ProviderSyncStatus) {
  const syncStatus = asText(status?.provider_sync_status).toLowerCase();
  const operation = asText(status?.provider_sync_operation);
  const subscriptionId = asText(status?.subscription_id);
  return !!subscriptionId
    && !!operation
    && ['pending', 'retryable'].includes(syncStatus);
}

export async function updateAsaasSubscriptionValueFromSync(status: ProviderSyncStatus) {
  const subscriptionId = asText(
    status?.provider_sync_provider_subscription_id || status?.provider_subscription_id,
  );
  const planCode = asText(status?.provider_sync_target_plan_code);
  const planName = asText(status?.provider_sync_target_plan_name) || planCode;
  const priceCents = Number(status?.provider_sync_target_price_cents);

  if (!subscriptionId) throw new Error('provider_subscription_missing');
  if (!planCode || !Number.isFinite(priceCents) || priceCents < 0) {
    throw new Error('provider_sync_target_missing');
  }

  return callAsaas(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    value: centsToReais(priceCents),
    updatePendingPayments: true,
    externalReference: `comvaga-subscription:${planCode}`,
    description: `Plano ${planName}`,
  }, 'PUT');
}

export async function runImmediateSubscriptionProviderSync(
  admin: AdminClient,
  status: ProviderSyncStatus,
  source: string,
) {
  if (!hasRunnableProviderSync(status)) {
    return { billingStatus: status, providerSyncError: null };
  }

  const subscriptionId = asText(status?.subscription_id);
  const operation = asText(status?.provider_sync_operation);
  const workerId = `edge:${source}:${crypto.randomUUID()}`;

  const { data: started, error: beginError } = await admin.rpc('begin_subscription_provider_sync', {
    p_subscription_id: subscriptionId,
    p_expected_operation: operation,
    p_worker_id: workerId,
  });
  if (beginError) throw beginError;

  if (!started?.started) {
    return { billingStatus: started || status, providerSyncError: null };
  }

  try {
    const providerResponse = await updateAsaasSubscriptionValueFromSync(started);
    const { data: finished, error: finishError } = await admin.rpc('finish_subscription_provider_sync', {
      p_subscription_id: subscriptionId,
      p_expected_operation: operation,
      p_provider_payload: {
        source,
        provider_response: providerResponse,
      },
    });
    if (finishError) throw finishError;
    return { billingStatus: finished || status, providerSyncError: null };
  } catch (error) {
    const message = providerSyncErrorMessage(error);
    const { data: retryStatus, error: retryError } = await admin.rpc('retry_subscription_provider_sync', {
      p_subscription_id: subscriptionId,
      p_error: message,
      p_expected_operation: operation,
    });
    if (retryError) throw retryError;
    return { billingStatus: retryStatus || status, providerSyncError: message };
  }
}
export async function processPendingSubscriptionProviderSyncs(
  admin: AdminClient,
  workerSecret: string,
  requestedLimit = 10,
) {
  const limit = Math.min(25, Math.max(1, Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : 10));
  const workerId = `edge:provider-sync:${crypto.randomUUID()}`;
  const { data: syncs, error: claimError } = await admin.rpc('claim_subscription_provider_syncs', {
    p_worker_secret: workerSecret,
    p_worker_id: workerId,
    p_limit: limit,
  });
  if (claimError) throw claimError;

  const summary = {
    claimed: Array.isArray(syncs) ? syncs.length : 0,
    synced: 0,
    retryable: 0,
    failed: 0,
  };

  for (const sync of syncs || []) {
    const subscriptionId = asText(sync.id);
    const operation = asText(sync.provider_sync_operation);
    try {
      const providerResponse = await updateAsaasSubscriptionValueFromSync(sync);
      const { error: finishError } = await admin.rpc('finish_subscription_provider_sync', {
        p_subscription_id: subscriptionId,
        p_expected_operation: operation,
        p_provider_payload: {
          source: 'billing_worker_retry',
          provider_response: providerResponse,
        },
      });
      if (finishError) throw finishError;
      summary.synced += 1;
    } catch (error) {
      const message = providerSyncErrorMessage(error);
      console.error(`subscription provider sync ${subscriptionId} failed:`, error);
      const { data: retryStatus, error: retryError } = await admin.rpc('retry_subscription_provider_sync', {
        p_subscription_id: subscriptionId,
        p_error: message,
        p_expected_operation: operation,
      });
      if (retryError) {
        console.error(`subscription provider sync ${subscriptionId} retry scheduling failed:`, retryError);
        continue;
      }
      if (retryStatus?.provider_sync_status === 'failed' || retryStatus?.provider_sync_dead_letter) {
        summary.failed += 1;
      } else {
        summary.retryable += 1;
      }
    }
  }

  return summary;
}
