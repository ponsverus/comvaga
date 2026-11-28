import { getCorsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase.ts';
import { reserveOwnerAsaasAction } from '../_shared/asaas-rate-limit.ts';
import { isDueOpenCharge, listAsaasSubscriptionCharges, reconcileAsaasSubscriptionCharges, todayInSaoPaulo, validCalendarDate } from '../_shared/asaas-charges.ts';
import { AsaasObservationUnavailable, reconcileAsaasSubscriptionState } from '../_shared/asaas-subscription-state.ts';

const asText = (value: unknown) => String(value || '').trim();
function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}
function dateInSaoPaulo(value: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function paidAccessEnd(status: Record<string, unknown>): string | null {
  if (asText(status.payment_method_status).toLowerCase() !== 'valid') return null;
  const dates = [status.current_period_end, status.access_ends_at]
    .map((value) => new Date(asText(value)))
    .filter((date) => !Number.isNaN(date.getTime()) && date.getTime() > Date.now());
  return dates.length ? dateInSaoPaulo(new Date(Math.max(...dates.map((date) => date.getTime())))) : null;
}
function safeInvoiceUrl(value: unknown) {
  try {
    const url = new URL(asText(value));
    return url.protocol === 'https:' && ['asaas.com', 'www.asaas.com', 'sandbox.asaas.com'].includes(url.hostname)
      ? url.toString() : null;
  } catch { return null; }
}
async function subscriptionRequest(id: string, method: 'GET' | 'PUT', body?: Record<string, unknown>) {
  const response = await fetch(
    `${requiredEnv('ASAAS_BASE_URL').replace(/\/+$/, '')}/subscriptions/${encodeURIComponent(id)}`,
    {
      method,
      headers: {
        access_token: requiredEnv('ASAAS_API_KEY'), accept: 'application/json',
        ...(body ? { 'content-type': 'application/json' } : {}), 'User-Agent': 'Comvaga/1.0',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15_000),
    },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`asaas_subscription_${method.toLowerCase()}_${response.status}`);
  if (!data || typeof data !== 'object' || asText(data.id) !== id) {
    throw new Error('asaas_subscription_response_invalid');
  }
  return data as Record<string, unknown>;
}
async function recordPendingReturn(admin: ReturnType<typeof createAdminClient>, negocioId: string, requestId: string) {
  const { error } = await admin.rpc('record_monitor_pending_return', {
    p_negocio_id: negocioId, p_kind: 'reactivation', p_request_id: requestId,
  });
  if (error) console.error('Reactivation monitor count failed:', error);
}
async function recordVerificationFailure(admin: ReturnType<typeof createAdminClient>, negocioId: string, requestId: string, failureKind: 'provider_unavailable' | 'local_reconciliation_failed', error: unknown) {
  const { error: monitorError } = await admin.rpc('record_monitor_verification_failure', {
    p_negocio_id: negocioId, p_kind: 'reactivation', p_request_id: requestId,
    p_failure_kind: failureKind,
    p_error: error instanceof Error ? error.message : String(error),
  });
  if (monitorError) console.error('Reactivation verification failure count failed:', monitorError);
}
function chooseNextDueDate(
  subscription: Record<string, unknown>,
  charges: Awaited<ReturnType<typeof listAsaasSubscriptionCharges>>,
  accessEnd: string | null,
  today: string,
) {
  if (asText(subscription.cycle).toUpperCase() !== 'MONTHLY') {
    throw new Error('reactivation_cycle_requires_support');
  }
  const generated = charges.filter((charge) => !['DELETED', 'REFUNDED'].includes(charge.status));
  const latestDue = generated.reduce((latest, charge) => charge.dueDate > latest ? charge.dueDate : latest, '');
  const futureOpen = generated.some((charge) =>
    ['PENDING', 'OVERDUE'].includes(charge.status) && charge.dueDate > today
  );
  const providerNext = subscription.nextDueDate;
  if (futureOpen) {
    if (!accessEnd || accessEnd < today) throw new Error('reactivation_future_invoice_requires_support');
    if (!validCalendarDate(providerNext) || providerNext <= latestDue || providerNext < accessEnd) {
      throw new Error('reactivation_next_due_date_requires_support');
    }
    return providerNext;
  }
  const candidate = accessEnd && accessEnd > today ? accessEnd : today;
  if (!latestDue || candidate > latestDue) return candidate;
  if (validCalendarDate(providerNext) && providerNext > latestDue && providerNext >= candidate) {
    return providerNext;
  }
  throw new Error('reactivation_next_due_date_requires_support');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405, req);
  const authorization = req.headers.get('authorization') || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return jsonResponse({ error: 'not_authenticated' }, 401, req);
  }
  const body = await req.json().catch(() => ({}));
  const negocioId = asText(body?.negocio_id);
  if (!negocioId) return jsonResponse({ error: 'missing_required_fields' }, 400, req);

  const userClient = createUserClient(authorization);
  const admin = createAdminClient();
  let requestId: string | null = null;
  let mutationStarted = false;
  let providerMutationCompleted = false;
  try {
    const { data: auth, error: authError } = await userClient.auth.getUser();
    if (authError || !auth?.user?.id) return jsonResponse({ error: 'not_authenticated' }, 401, req);
    const { data: status, error: statusError } = await userClient.rpc('get_business_billing_status', {
      p_negocio_id: negocioId,
    });
    if (statusError) throw statusError;
    const subscriptionId = asText(status?.provider_subscription_id);
    if (asText(status?.provider).toLowerCase() !== 'asaas' || !subscriptionId) {
      return jsonResponse({ error: 'reactivation_not_available' }, 409, req);
    }
    if (!status?.reactivation_pending && asText(status?.provider_status).toUpperCase() === 'ACTIVE') {
      return jsonResponse({ error: 'reactivation_not_available' }, 409, req);
    }
    const limited = await reserveOwnerAsaasAction(admin, auth.user.id, 'reactivate', req);
    if (limited) return limited;
    if (status?.reactivation_pending) {
      const { data: pendingRow, error: pendingError } = await admin.from('business_subscriptions')
        .select('reactivation_request_id').eq('business_id', negocioId).maybeSingle();
      if (pendingError) console.error('Pending reactivation monitor identity lookup failed:', pendingError);
      const pendingRequestId = asText(pendingRow?.reactivation_request_id);
      let observedState: string | null = null;
      try {
        observedState = await reconcileAsaasSubscriptionState(admin, negocioId, subscriptionId);
        if (pendingRequestId) await recordPendingReturn(admin, negocioId, pendingRequestId);
        if (observedState === 'ACTIVE') {
          const { data: refreshed } = await userClient.rpc('get_business_billing_status', { p_negocio_id: negocioId });
          return jsonResponse({ billing_status: refreshed, action: 'reactivated' }, 200, req);
        }
      } catch (error) {
        if (pendingRequestId) {
          await recordVerificationFailure(admin, negocioId, pendingRequestId,
            error instanceof AsaasObservationUnavailable ? 'provider_unavailable' : 'local_reconciliation_failed', error);
        }
        console.error('Pending reactivation reconciliation failed:', error);
      }
      return jsonResponse({ error: 'reactivation_pending' }, 409, req);
    }
    if (status?.has_active_checkout || status?.provider_sync_pending || status?.plan_change_scheduled) {
      return jsonResponse({ error: 'reactivation_conflicting_operation' }, 409, req);
    }
    if (await reconcileAsaasSubscriptionState(admin, negocioId, subscriptionId) !== 'INACTIVE') {
      return jsonResponse({ error: 'reactivation_not_available' }, 409, req);
    }
    const [providerSubscription, charges] = await Promise.all([
      subscriptionRequest(subscriptionId, 'GET'), listAsaasSubscriptionCharges(subscriptionId),
    ]);
    if (asText(providerSubscription.status).toUpperCase() !== 'INACTIVE') {
      return jsonResponse({ error: 'reactivation_state_changed' }, 409, req);
    }
    await reconcileAsaasSubscriptionCharges(admin, negocioId, subscriptionId, charges);
    const today = todayInSaoPaulo();
    if (charges.some((charge) => isDueOpenCharge(charge, subscriptionId, today))) {
      const { data: refreshed } = await userClient.rpc('get_business_billing_status', { p_negocio_id: negocioId });
      return jsonResponse({ error: 'subscription_debt_must_be_paid', billing_status: refreshed }, 409, req);
    }
    const nextDueDate = chooseNextDueDate(providerSubscription, charges, paidAccessEnd(status), today);
    const { data: current, error: currentError } = await admin.from('business_subscriptions')
      .select('provider_status_revision').eq('business_id', negocioId)
      .eq('provider_subscription_id', subscriptionId).maybeSingle();
    if (currentError) throw currentError;
    requestId = crypto.randomUUID();
    const { data: claim, error: claimError } = await admin.rpc('begin_asaas_subscription_reactivation', {
      p_negocio_id: negocioId, p_actor_id: auth.user.id,
      p_provider_subscription_id: subscriptionId,
      p_expected_revision: Number(current?.provider_status_revision || 0),
      p_request_id: requestId, p_next_due_date: nextDueDate,
    });
    if (claimError) throw claimError;
    if (claim?.result !== 'created') return jsonResponse({ error: 'reactivation_pending' }, 409, req);

    const chargeIds = new Set(charges.map((charge) => charge.id));
    const latestCharges = await listAsaasSubscriptionCharges(subscriptionId);
    await reconcileAsaasSubscriptionCharges(admin, negocioId, subscriptionId, latestCharges);
    if (todayInSaoPaulo() !== today || latestCharges.some((charge) =>
      !chargeIds.has(charge.id) || isDueOpenCharge(charge, subscriptionId, today)
    )) {
      throw new Error('reactivation_state_changed');
    }

    mutationStarted = true;
    await subscriptionRequest(subscriptionId, 'PUT', { status: 'ACTIVE', nextDueDate });
    providerMutationCompleted = true;
    if (await reconcileAsaasSubscriptionState(admin, negocioId, subscriptionId) !== 'ACTIVE') {
      await recordPendingReturn(admin, negocioId, requestId);
      return jsonResponse({ error: 'reactivation_pending' }, 409, req);
    }
    await recordPendingReturn(admin, negocioId, requestId);
    const { data: refreshed, error: refreshedError } = await userClient.rpc('get_business_billing_status', {
      p_negocio_id: negocioId,
    });
    if (refreshedError) throw refreshedError;
    let invoiceUrl: string | null = null;
    try {
      const due = (await listAsaasSubscriptionCharges(subscriptionId))
        .filter((charge) => isDueOpenCharge(charge, subscriptionId, today))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));
      invoiceUrl = due.length ? safeInvoiceUrl(due[0].invoiceUrl) : null;
    } catch (error) {
      // The provider mutation and reconciliation already succeeded. The owner
      // can retrieve a due invoice through the existing recovery action.
      console.error('Reactivated subscription invoice lookup failed:', error);
    }
    return jsonResponse({
      action: refreshed?.booking_allowed ? 'reactivated' : 'awaiting_payment',
      billing_status: refreshed,
      invoice_url: invoiceUrl,
    }, 200, req);
  } catch (error) {
    const message = error instanceof Error ? error.message : asText(error);
    console.error('asaas-reactivate-subscription failed:', message);
    if (requestId && (!mutationStarted || /^asaas_subscription_put_4\d\d$/.test(message))) {
      const { error: abortError } = await admin.rpc('abort_asaas_subscription_reactivation', {
        p_negocio_id: negocioId, p_request_id: requestId, p_reason: message,
      });
      if (abortError) console.error('Reactivation abort failed:', abortError);
    }
    if (requestId && providerMutationCompleted) {
      await recordVerificationFailure(admin, negocioId, requestId,
        error instanceof AsaasObservationUnavailable ? 'provider_unavailable' : 'local_reconciliation_failed', error);
    }
    if (/asaas_.*_429/.test(message)) return jsonResponse({ error: 'rate_limit_exceeded' }, 429, req);
    const expected = message.startsWith('reactivation_') || message === 'subscription_debt_must_be_paid';
    return jsonResponse({ error: expected ? message : 'reactivation_unavailable' }, expected ? 409 : 502, req);
  }
});
