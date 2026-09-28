import { getCorsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase.ts';

const ASAAS_PROVIDER = 'asaas';
const TERMINAL_SUBSCRIPTION_STATUSES = new Set(['INACTIVE', 'EXPIRED', 'CANCELED', 'CANCELLED', 'DELETED']);
const ALLOWED_INVOICE_HOSTS = new Set(['asaas.com', 'www.asaas.com', 'sandbox.asaas.com']);
const DEFAULT_ASAAS_BASE_URL = 'https://api-sandbox.asaas.com/v3';

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

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

async function getOverdueSubscriptionPayments(subscriptionId: string) {
  const apiKey = requiredEnv('ASAAS_API_KEY');
  const baseUrl = (Deno.env.get('ASAAS_BASE_URL') || DEFAULT_ASAAS_BASE_URL).replace(/\/+$/, '');
  const url = new URL(`${baseUrl}/subscriptions/${encodeURIComponent(subscriptionId)}/payments`);
  url.searchParams.set('status', 'OVERDUE');
  url.searchParams.set('limit', '100');
  url.searchParams.set('offset', '0');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      access_token: apiKey,
      accept: 'application/json',
      'User-Agent': 'Comvaga/1.0',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error(`asaas_overdue_payment_lookup_failed_${response.status}`);
  return await response.json();
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

    const currentStatus = text(billingStatus?.status).toLowerCase();
    const paymentStatus = text(billingStatus?.payment_method_status).toLowerCase();
    const providerSubscriptionId = text(billingStatus?.provider_subscription_id);
    const providerStatus = text(billingStatus?.provider_status).toUpperCase();

    if (
      text(billingStatus?.provider).toLowerCase() !== ASAAS_PROVIDER
      || !providerSubscriptionId
      || TERMINAL_SUBSCRIPTION_STATUSES.has(providerStatus)
      || Boolean(billingStatus?.cancellation_scheduled)
      || !['blocked', 'past_due', 'payment_grace', 'active'].includes(currentStatus)
      || !['failed', 'expired'].includes(paymentStatus)
    ) {
      return jsonResponse({ error: 'subscription_not_recoverable' }, 409, req);
    }

    if (billingStatus?.has_active_checkout) {
      return jsonResponse({ error: 'checkout_in_progress' }, 409, req);
    }
    if (billingStatus?.provider_sync_pending) {
      return jsonResponse({ error: 'provider_sync_in_progress' }, 409, req);
    }
    if (billingStatus?.plan_change_scheduled) {
      return jsonResponse({ error: 'plan_downgrade_pending' }, 409, req);
    }

    const { data: subscription, error: subscriptionError } = await admin
      .from('business_subscriptions')
      .select('provider, provider_subscription_id')
      .eq('negocio_id', negocioId)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (
      text(subscription?.provider).toLowerCase() !== ASAAS_PROVIDER
      || text(subscription?.provider_subscription_id) !== providerSubscriptionId
    ) {
      return jsonResponse({ error: 'subscription_state_changed' }, 409, req);
    }

    const paymentList = await getOverdueSubscriptionPayments(providerSubscriptionId);
    const overduePayments = Array.isArray(paymentList?.data)
      ? paymentList.data.filter((payment: Record<string, unknown>) =>
        text(payment.status).toUpperCase() === 'OVERDUE'
        && text(payment.subscription) === providerSubscriptionId
      )
      : [];

    if (overduePayments.length === 0) {
      return jsonResponse({ error: 'subscription_overdue_payment_not_found' }, 404, req);
    }
    if (overduePayments.length !== 1) {
      return jsonResponse({ error: 'multiple_overdue_subscription_payments' }, 409, req);
    }

    const payment = overduePayments[0];
    const invoiceUrl = safeInvoiceUrl(payment.invoiceUrl);
    if (!invoiceUrl) return jsonResponse({ error: 'subscription_invoice_unavailable' }, 502, req);

    return jsonResponse({
      action: 'existing_subscription_payment',
      invoice_url: invoiceUrl,
    }, 200, req);
  } catch (error) {
    console.error('asaas-recover-subscription-payment failed:', text(error?.message) || 'recovery_failed');
    return jsonResponse({ error: 'subscription_recovery_unavailable' }, 502, req);
  }
});
