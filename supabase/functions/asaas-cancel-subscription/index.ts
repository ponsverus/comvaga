import { getCorsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase.ts';

const ASAAS_PROVIDER = 'asaas';
const DEFAULT_ASAAS_BASE_URL = 'https://api-sandbox.asaas.com/v3';

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function asText(value: unknown) {
  return String(value || '').trim();
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || fallback);
  }
  return String(error || fallback);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSubscriptionCancelable(status: Record<string, unknown> | null) {
  const current = String(status?.status || '').toLowerCase();
  const payment = String(status?.payment_method_status || '').toLowerCase();
  const provider = String(status?.provider || '').toLowerCase();
  const providerStatus = String(status?.provider_status || '').toUpperCase();
  const providerSubscriptionId = asText(status?.provider_subscription_id);

  if (current === 'active' && ['valid', 'none'].includes(payment)) return true;
  return provider === ASAAS_PROVIDER
    && !!providerSubscriptionId
    && !['INACTIVE', 'CANCELED', 'CANCELLED', 'DELETED'].includes(providerStatus);
}

async function cancelAsaasSubscription(subscriptionId: string) {
  const apiKey = requiredEnv('ASAAS_API_KEY');
  const baseUrl = (Deno.env.get('ASAAS_BASE_URL') || DEFAULT_ASAAS_BASE_URL).replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: 'DELETE',
    headers: {
      access_token: apiKey,
      accept: 'application/json',
      'User-Agent': 'Comvaga/1.0',
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Asaas cancel subscription error:', response.status, data);
    const asaasError = Array.isArray(data?.errors)
      ? data.errors.map((item: Record<string, unknown>) => item.description || item.message || item.code).filter(Boolean).join(' | ')
      : data?.description || data?.message || JSON.stringify(data);
    throw new Error(`asaas_cancel_failed (${response.status}): ${asaasError || 'empty_response'}`);
  }

  return data;
}

function isRetryableAsaasError(error: unknown) {
  const message = errorMessage(error, '').toLowerCase();
  const statusMatch = /asaas_cancel_failed \((\d{3})\)/.exec(message);
  if (statusMatch) {
    const status = Number(statusMatch[1]);
    return status === 429 || status >= 500;
  }

  return message.includes('timeout')
    || message.includes('network')
    || message.includes('fetch');
}

async function cancelAsaasSubscriptionWithRetry(subscriptionId: string, attempts = 3) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await cancelAsaasSubscription(subscriptionId);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isRetryableAsaasError(error)) break;
      await sleep(250 * attempt);
    }
  }

  throw lastError || new Error('asaas_cancel_failed');
}

async function cancelBusinessSubscriptionWithRetry(
  admin: ReturnType<typeof createAdminClient>,
  args: Record<string, unknown>,
  attempts = 3,
) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const { data, error } = await admin.rpc('cancel_business_subscription', args);
    if (!error) return data;

    lastError = error;
    if (attempt < attempts) await sleep(250 * attempt);
  }

  throw lastError || new Error('cancel_business_subscription_failed');
}

async function recordCancelSyncFailure(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Record<string, unknown>,
  actorId: string,
  providerPayload: Record<string, unknown>,
  ownerCancelEventId: string,
  error: unknown,
) {
  const message = errorMessage(error, 'cancel_business_subscription_failed');
  const negocioId = asText(subscription.negocio_id);
  const provider = String(subscription.provider || ASAAS_PROVIDER).toLowerCase();
  const failureEventId = `gateway_cancel_sync_failed:${negocioId}:${ownerCancelEventId}`;

  const { error: insertError } = await admin
    .from('billing_events')
    .upsert({
      negocio_id: negocioId,
      subscription_id: subscription.id,
      provider,
      provider_event_id: failureEventId,
      event_type: 'GATEWAY_CANCELED_DB_SYNC_FAILED',
      provider_customer_id: subscription.provider_customer_id || null,
      provider_subscription_id: subscription.provider_subscription_id || null,
      provider_status: 'CANCELED',
      payload: {
        ...providerPayload,
        actor_id: actorId,
        owner_cancel_event_id: ownerCancelEventId,
        error: message,
      },
      processed_at: new Date().toISOString(),
      processing_error: 'gateway_canceled_db_sync_failed',
    }, { onConflict: 'provider,provider_event_id' });

  if (insertError) console.error('cancel sync failure log failed:', insertError);
}

async function fetchPendingCancelSync(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Record<string, unknown>,
  negocioId: string,
  providerSubscriptionId: string,
) {
  if (!providerSubscriptionId) return null;

  const { data, error } = await admin
    .from('billing_events')
    .select('id, payload')
    .eq('provider', ASAAS_PROVIDER)
    .eq('negocio_id', negocioId)
    .eq('subscription_id', subscription.id)
    .eq('provider_subscription_id', providerSubscriptionId)
    .eq('event_type', 'GATEWAY_CANCELED_DB_SYNC_FAILED')
    .not('processing_error', 'is', null)
    .order('received_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('pending cancel sync lookup failed:', error);
    return null;
  }
  if (!data) return null;

  const payload = (data.payload || {}) as Record<string, unknown>;
  const providerResponse = (payload.provider_response || {}) as Record<string, unknown>;
  const responseSubscriptionId = asText(providerResponse.id);
  if (responseSubscriptionId && responseSubscriptionId !== providerSubscriptionId) return null;

  return {
    id: String(data.id),
    payload,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405, req);

  try {
    const authorization = req.headers.get('authorization') || '';
    if (!authorization.toLowerCase().startsWith('bearer ')) {
      return jsonResponse({ error: 'not_authenticated' }, 401, req);
    }

    const body = await req.json().catch(() => ({}));
    const negocioId = asText(body?.negocio_id);
    if (!negocioId) return jsonResponse({ error: 'missing_required_fields' }, 400, req);

    const userClient = createUserClient(authorization);
    const admin = createAdminClient();
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user?.id) return jsonResponse({ error: 'not_authenticated' }, 401, req);

    const [{ data: negocio, error: negocioError }, { data: subscription, error: subscriptionError }] = await Promise.all([
      admin.from('negocios').select('id, owner_id').eq('id', negocioId).maybeSingle(),
      admin
        .from('business_subscriptions')
        .select('id, negocio_id, provider, provider_customer_id, provider_subscription_id, provider_status, status, payment_method_status')
        .eq('negocio_id', negocioId)
        .maybeSingle(),
    ]);

    if (negocioError) throw negocioError;
    if (subscriptionError) throw subscriptionError;
    if (!negocio || negocio.owner_id !== authData.user.id) return jsonResponse({ error: 'acao_nao_permitida' }, 403, req);
    if (!subscription || !isSubscriptionCancelable(subscription)) {
      return jsonResponse({ error: 'subscription_not_cancelable' }, 400, req);
    }

    let providerPayload: Record<string, unknown> = {
      source: 'owner_dashboard',
      negocio_id: negocioId,
    };
    const providerSubscriptionId = asText(subscription.provider_subscription_id);
    const provider = String(subscription.provider || '').toLowerCase();

    if (provider === ASAAS_PROVIDER && providerSubscriptionId) {
      const pendingSync = await fetchPendingCancelSync(admin, subscription, negocioId, providerSubscriptionId);
      if (pendingSync) {
        try {
          const billingStatus = await cancelBusinessSubscriptionWithRetry(admin, {
            p_negocio_id: negocioId,
            p_actor_id: authData.user.id,
            p_provider_event_id: `owner_cancel_retry:${negocioId}:${crypto.randomUUID()}`,
            p_provider_payload: pendingSync.payload,
          }, 5);

          await admin
            .from('billing_events')
            .update({
              processing_error: null,
              processed_at: new Date().toISOString(),
            })
            .eq('id', pendingSync.id);

          return jsonResponse({ billing_status: billingStatus }, 200, req);
        } catch (syncError) {
          console.error('pending cancel sync retry failed:', syncError);
          await admin
            .from('billing_events')
            .update({
              processing_error: errorMessage(syncError, 'sync_retry_failed_again'),
              processed_at: new Date().toISOString(),
            })
            .eq('id', pendingSync.id);

          return jsonResponse({ error: 'sync_retry_failed_again' }, 409, req);
        }
      }

      providerPayload = {
        ...providerPayload,
        provider_response: await cancelAsaasSubscriptionWithRetry(providerSubscriptionId),
      };
    }

    const ownerCancelEventId = `owner_cancel:${negocioId}:${crypto.randomUUID()}`;
    const cancelArgs = {
      p_negocio_id: negocioId,
      p_actor_id: authData.user.id,
      p_provider_event_id: ownerCancelEventId,
      p_provider_payload: providerPayload,
    };

    let billingStatus: unknown = null;
    try {
      billingStatus = await cancelBusinessSubscriptionWithRetry(admin, cancelArgs);
    } catch (cancelError) {
      await recordCancelSyncFailure(
        admin,
        subscription,
        authData.user.id,
        providerPayload,
        ownerCancelEventId,
        cancelError,
      );
      throw cancelError;
    }

    return jsonResponse({ billing_status: billingStatus }, 200, req);
  } catch (error) {
    console.error('asaas-cancel-subscription failed:', error);
    return jsonResponse({ error: errorMessage(error, 'cancel_failed') }, 400, req);
  }
});
