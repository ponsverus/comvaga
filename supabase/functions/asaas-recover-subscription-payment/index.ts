import { getCorsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase.ts';
import { reserveOwnerAsaasAction } from '../_shared/asaas-rate-limit.ts';
import { isDueOpenCharge, reconcileAsaasSubscriptionCharges, todayInSaoPaulo, type AsaasCharge } from '../_shared/asaas-charges.ts';

const ASAAS_PROVIDER = 'asaas';
const ALLOWED_INVOICE_HOSTS = new Set(['asaas.com', 'www.asaas.com', 'sandbox.asaas.com']);

function text(value: unknown) {
  return String(value || '').trim();
}

function safeInvoiceUrl(value: unknown) {
  try {
    const url = new URL(text(value));
    return url.protocol === 'https:' && ALLOWED_INVOICE_HOSTS.has(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
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
    const negocioId = text(body?.negocio_id);
    if (!negocioId) return jsonResponse({ error: 'missing_required_fields' }, 400, req);

    const userClient = createUserClient(authorization);
    const admin = createAdminClient();
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user?.id) return jsonResponse({ error: 'not_authenticated' }, 401, req);

    const { data: billingStatus, error: billingStatusError } = await userClient.rpc('get_business_billing_status', {
      p_negocio_id: negocioId,
    });
    if (billingStatusError) throw billingStatusError;

    const providerSubscriptionId = text(billingStatus?.provider_subscription_id);
    if (billingStatus?.can_request_subscription_invoice !== true) {
      if (billingStatus?.provider_sync_pending) {
        return jsonResponse({ error: 'provider_sync_in_progress' }, 409, req);
      }
      if (billingStatus?.plan_change_scheduled) {
        return jsonResponse({ error: 'plan_downgrade_pending' }, 409, req);
      }
      return jsonResponse({ error: 'subscription_not_recoverable' }, 409, req);
    }

    const { data: subscription, error: subscriptionError } = await admin
      .from('business_subscriptions')
      .select('provider, provider_subscription_id')
      .eq('business_id', negocioId)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (
      text(subscription?.provider).toLowerCase() !== ASAAS_PROVIDER
      || text(subscription?.provider_subscription_id) !== providerSubscriptionId
    ) {
      return jsonResponse({ error: 'subscription_state_changed' }, 409, req);
    }

    const { data: historicalSessions, error: historicalError } = await admin
      .from('billing_checkout_sessions')
      .select('origin_provider_subscription_id')
      .eq('business_id', negocioId)
      .eq('action', 'subscription')
      .eq('status', 'paid')
      .eq('origin_provider_status', 'EXPIRED')
      .limit(11);
    if (historicalError) throw historicalError;
    if ((historicalSessions?.length || 0) > 10) throw new Error('subscription_history_requires_support');
    const subscriptionIds = new Set<string>([providerSubscriptionId]);
    for (const session of historicalSessions || []) {
      const originId = text(session.origin_provider_subscription_id);
      if (originId) subscriptionIds.add(originId);
    }

    const limited = await reserveOwnerAsaasAction(admin, authData.user.id, 'recover', req);
    if (limited) return limited;

    const today = todayInSaoPaulo();
    const duePayments: AsaasCharge[] = [];
    for (const subscriptionId of subscriptionIds) {
      const charges = await reconcileAsaasSubscriptionCharges(admin, negocioId, subscriptionId);
      duePayments.push(...charges.filter((payment) => isDueOpenCharge(payment, subscriptionId, today)));
    }
    duePayments.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));
    if (duePayments.length === 0) {
      return jsonResponse({ error: 'subscription_due_payment_not_found' }, 404, req);
    }

    const payment = duePayments[0];
    const invoiceUrl = safeInvoiceUrl(payment.invoiceUrl);
    if (!invoiceUrl) return jsonResponse({ error: 'subscription_invoice_unavailable' }, 502, req);

    return jsonResponse({
      action: 'existing_subscription_payment',
      invoice_url: invoiceUrl,
      due_charge_count: duePayments.length,
    }, 200, req);
  } catch (error) {
    console.error('asaas-recover-subscription-payment failed:', text(error?.message) || 'recovery_failed');
    if (/asaas_.*_429/.test(text(error?.message))) return jsonResponse({ error: 'rate_limit_exceeded' }, 429, req);
    return jsonResponse({ error: 'subscription_recovery_unavailable' }, 502, req);
  }
});
