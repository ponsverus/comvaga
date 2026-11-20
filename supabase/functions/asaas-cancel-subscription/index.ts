import { getCorsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase.ts';
import { reserveOwnerAsaasAction } from '../_shared/asaas-rate-limit.ts';
import { isDueOpenCharge, listAsaasSubscriptionCharges, todayInSaoPaulo } from '../_shared/asaas-charges.ts';

const ASAAS_PROVIDER = 'asaas';

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

  if (providerStatus === 'DELETED' || providerStatus === 'EXPIRED') return false;
  if (providerStatus === 'INACTIVE') {
    return provider === ASAAS_PROVIDER && !!providerSubscriptionId;
  }
  if (status?.canceled_at) return false;
  if (current === 'active' && payment === 'valid') return true;
  return provider === ASAAS_PROVIDER
    && !!providerSubscriptionId
    && !['INACTIVE', 'CANCELED', 'CANCELLED', 'DELETED'].includes(providerStatus);
}

async function cancelAsaasSubscription(subscriptionId: string) {
  const apiKey = requiredEnv('ASAAS_API_KEY');
  const baseUrl = requiredEnv('ASAAS_BASE_URL').replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: 'DELETE',
    signal: AbortSignal.timeout(30_000),
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

function gatewayDefinitelyRejected(error: unknown) {
  const match = /asaas_cancel_failed \((\d{3})\)/.exec(errorMessage(error, ''));
  return match ? [400, 401, 403, 429].includes(Number(match[1])) : false;
}

async function inspectAsaasSubscription(subscriptionId: string, customerId: string) {
  const apiKey = requiredEnv('ASAAS_API_KEY');
  const baseUrl = requiredEnv('ASAAS_BASE_URL').replace(/\/+$/, '');
  const headers = { access_token: apiKey, accept: 'application/json', 'User-Agent': 'Comvaga/1.0' };
  const response = await fetch(`${baseUrl}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  if (response.ok) {
    const data = await response.json();
    if (asText(data?.id) !== subscriptionId) throw new Error('asaas_subscription_identity_mismatch');
    const status = String(data?.status || '').toUpperCase();
    if (data?.deleted === true || status === 'DELETED') return 'deleted';
    if (!['ACTIVE', 'INACTIVE', 'EXPIRED'].includes(status)) {
      throw new Error('asaas_subscription_status_unknown');
    }
    return 'present';
  }
  if (response.status !== 404) throw new Error(`asaas_subscription_lookup_failed_${response.status}`);
  if (!customerId) return 'unknown';

  for (let page = 0; page < 5; page++) {
    const url = new URL(`${baseUrl}/subscriptions`);
    url.searchParams.set('customer', customerId);
    url.searchParams.set('deletedOnly', 'true');
    url.searchParams.set('limit', '100');
    url.searchParams.set('offset', String(page * 100));
    const listed = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
    if (!listed.ok) throw new Error(`asaas_deleted_subscription_lookup_failed_${listed.status}`);
    const body = await listed.json();
    if (!Array.isArray(body?.data) || typeof body?.hasMore !== 'boolean') {
      throw new Error('asaas_deleted_subscription_lookup_invalid_response');
    }
    if (body.data.some((item: Record<string, unknown>) => asText(item.id) === subscriptionId)) return 'deleted';
    if (!body.hasMore) return 'unknown';
  }
  return 'unknown';
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

async function recordPendingReturn(admin: ReturnType<typeof createAdminClient>, negocioId: string, requestId: string) {
  const { error } = await admin.rpc('record_monitor_pending_return', {
    p_negocio_id: negocioId, p_kind: 'cancel', p_request_id: requestId,
  });
  if (error) console.error('Cancellation monitor count failed:', error);
}
async function recordVerificationFailure(admin: ReturnType<typeof createAdminClient>, negocioId: string, requestId: string, error: unknown) {
  const { error: monitorError } = await admin.rpc('record_monitor_verification_failure', {
    p_negocio_id: negocioId, p_kind: 'cancel', p_request_id: requestId,
    p_failure_kind: 'provider_unavailable',
    p_error: error instanceof Error ? error.message : String(error),
  });
  if (monitorError) console.error('Cancellation verification failure count failed:', monitorError);
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
        .select('id, negocio_id, provider, provider_customer_id, provider_subscription_id, provider_status, provider_status_revision, status, payment_method_status, canceled_at')
        .eq('negocio_id', negocioId)
        .maybeSingle(),
    ]);

    if (negocioError) throw negocioError;
    if (subscriptionError) throw subscriptionError;
    if (!negocio || negocio.owner_id !== authData.user.id) return jsonResponse({ error: 'acesso_negado' }, 403, req);
    if (!subscription) return jsonResponse({ error: 'subscription_not_cancelable' }, 400, req);

    const providerSubscriptionId = asText(subscription.provider_subscription_id);
    const provider = String(subscription.provider || '').toLowerCase();

    if (provider === ASAAS_PROVIDER && providerSubscriptionId) {
      const pendingSync = await fetchPendingCancelSync(admin, subscription, negocioId, providerSubscriptionId);
      if (pendingSync) {
        try {
          const billingStatus = await cancelBusinessSubscriptionWithRetry(admin, {
            p_negocio_id: negocioId,
            p_actor_id: authData.user.id,
            p_provider_event_id: 'owner_cancel_retry:' + negocioId + ':' + crypto.randomUUID(),
            p_provider_payload: pendingSync.payload,
          }, 5);
          await admin.from('billing_events')
            .update({ processing_error: null, processed_at: new Date().toISOString() })
            .eq('id', pendingSync.id);
          return jsonResponse({ billing_status: billingStatus }, 200, req);
        } catch (syncError) {
          console.error('pending cancel sync retry failed:', syncError);
          await admin.from('billing_events')
            .update({
              processing_error: errorMessage(syncError, 'sync_retry_failed_again'),
              processed_at: new Date().toISOString(),
            })
            .eq('id', pendingSync.id);
          return jsonResponse({ error: 'sync_retry_failed_again' }, 409, req);
        }
      }
    }

    if (provider !== ASAAS_PROVIDER || !providerSubscriptionId) {
      if (!isSubscriptionCancelable(subscription)) {
        return jsonResponse({ error: 'subscription_not_cancelable' }, 400, req);
      }
      const billingStatus = await cancelBusinessSubscriptionWithRetry(admin, {
        p_negocio_id: negocioId,
        p_actor_id: authData.user.id,
        p_provider_event_id: 'owner_cancel:' + negocioId + ':' + crypto.randomUUID(),
        p_provider_payload: { source: 'owner_dashboard', negocio_id: negocioId },
      });
      return jsonResponse({ billing_status: billingStatus }, 200, req);
    }

    const limited = await reserveOwnerAsaasAction(admin, authData.user.id, 'cancel_subscription', req);
    if (limited) return limited;

    const billingActionRequestId = crypto.randomUUID();
    const { error: claimError } = await admin.rpc('claim_owner_billing_action', {
      p_negocio_id: negocioId,
      p_actor_id: authData.user.id,
      p_provider_subscription_id: providerSubscriptionId,
      p_expected_revision: subscription.provider_status_revision,
      p_kind: 'cancel',
      p_target_plan_code: null,
      p_request_id: billingActionRequestId,
    });
    if (claimError) throw claimError;

    let releaseClaim = true;
    try {
      const providerPayload: Record<string, unknown> = {
        source: 'owner_dashboard',
        negocio_id: negocioId,
        billing_action_request_id: billingActionRequestId,
      };
      const charges = await listAsaasSubscriptionCharges(providerSubscriptionId);
      if (charges.some((charge) => isDueOpenCharge(charge, providerSubscriptionId, todayInSaoPaulo()))) {
        return jsonResponse({ error: 'subscription_debt_must_be_paid' }, 409, req);
      }

      releaseClaim = false;
      try {
        providerPayload.provider_response = await cancelAsaasSubscription(providerSubscriptionId);
      } catch (gatewayError) {
        if (gatewayDefinitelyRejected(gatewayError)) {
          releaseClaim = true;
          throw gatewayError;
        }

        let observed = 'unknown';
        let lookupFailed = false;
        try {
          observed = await inspectAsaasSubscription(providerSubscriptionId, asText(subscription.provider_customer_id));
        } catch (lookupError) {
          lookupFailed = true;
          await recordVerificationFailure(admin, negocioId, billingActionRequestId, lookupError);
          console.error('cancel outcome lookup failed:', lookupError);
        }
        if (observed !== 'deleted') {
          if (!lookupFailed) {
            if (observed === 'present') await recordPendingReturn(admin, negocioId, billingActionRequestId);
            else await recordVerificationFailure(admin, negocioId, billingActionRequestId, 'asaas_cancel_outcome_unconfirmed');
          }
          return jsonResponse({ error: 'cancel_result_unknown' }, 409, req);
        }
        providerPayload.provider_response = { id: providerSubscriptionId, deleted: true };
      }

      const ownerCancelEventId = 'owner_cancel:' + negocioId + ':' + crypto.randomUUID();
      let billingStatus: unknown = null;
      try {
        billingStatus = await cancelBusinessSubscriptionWithRetry(admin, {
          p_negocio_id: negocioId,
          p_actor_id: authData.user.id,
          p_provider_event_id: ownerCancelEventId,
          p_provider_payload: providerPayload,
        });
      } catch (cancelError) {
        await recordCancelSyncFailure(
          admin, subscription, authData.user.id, providerPayload, ownerCancelEventId, cancelError,
        );
        throw cancelError;
      }
      return jsonResponse({ billing_status: billingStatus }, 200, req);
    } finally {
      if (releaseClaim) {
        const { error: releaseError } = await admin.rpc('release_owner_billing_action', {
          p_negocio_id: negocioId,
          p_request_id: billingActionRequestId,
          p_reason: 'cancel_not_sent_or_rejected',
        });
        if (releaseError) console.error('cancel claim release failed:', releaseError);
      }
    }
  } catch (error) {
    console.error('asaas-cancel-subscription failed:', error);
    const message = errorMessage(error, 'cancel_failed');
    if (/asaas_(cancel_failed \(429\)|charge_lookup_failed_429)/.test(message)) {
      return jsonResponse({ error: 'rate_limit_exceeded' }, 429, req);
    }
    return jsonResponse({ error: message }, 400, req);
  }
});
