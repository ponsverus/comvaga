import { getCorsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  checkoutFromPayload,
  entityFromPayload,
  parseExternalReference,
  providerCheckoutSessionId,
  providerCustomerId,
  providerStatus,
  providerSubscriptionId,
  timingSafeTokenMatch,
} from '../_shared/asaas-billing.ts';
import { createAdminClient } from '../_shared/supabase.ts';

const ASAAS_PROVIDER = 'asaas';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405, req);

  const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
  const receivedToken = req.headers.get('asaas-access-token') || '';
  if (!expectedToken || !(await timingSafeTokenMatch(receivedToken, expectedToken))) {
    return jsonResponse({ error: 'unauthorized' }, 401, req);
  }

  try {
    const payload = await req.json().catch(() => ({})) as Record<string, unknown>;
    const eventType = String(payload.event || '').trim();
    const providerEventId = String(payload.id || '').trim();
    if (!eventType || !providerEventId) {
      return jsonResponse({ error: 'invalid_payload' }, 400, req);
    }

    const entity = entityFromPayload(payload);
    const checkout = checkoutFromPayload(payload);
    const reference = parseExternalReference(
      entity.externalReference || payload.externalReference || checkout.externalReference,
    );
    const providerCheckoutId = providerCheckoutSessionId(payload, entity, checkout);
    const customerId = providerCustomerId(entity);
    const subscriptionId = providerSubscriptionId(payload, entity);
    const admin = createAdminClient();

    let checkoutSessionId = reference.checkoutSessionId;
    let negocioId = reference.negocioId;
    if ((!checkoutSessionId || !negocioId) && providerCheckoutId) {
      const { data: session, error: sessionError } = await admin
        .from('billing_checkout_sessions')
        .select('id, negocio_id')
        .eq('provider', ASAAS_PROVIDER)
        .eq('provider_checkout_id', providerCheckoutId)
        .maybeSingle();
      if (sessionError) throw sessionError;
      checkoutSessionId ||= session?.id || null;
      negocioId ||= session?.negocio_id || null;
    }

    if (!negocioId && subscriptionId) {
      const { data: subscription, error: subscriptionError } = await admin
        .from('business_subscriptions')
        .select('negocio_id')
        .eq('provider', ASAAS_PROVIDER)
        .eq('provider_subscription_id', subscriptionId)
        .limit(1)
        .maybeSingle();
      if (subscriptionError) throw subscriptionError;
      negocioId = subscription?.negocio_id || null;
    }

    if (!negocioId && customerId) {
      const { data: subscription, error: customerError } = await admin
        .from('business_subscriptions')
        .select('negocio_id')
        .eq('provider', ASAAS_PROVIDER)
        .eq('provider_customer_id', customerId)
        .limit(1)
        .maybeSingle();
      if (customerError) throw customerError;
      negocioId = subscription?.negocio_id || null;
    }

    const { data: eventId, error: recordError } = await admin.rpc('record_gateway_event', {
      p_provider: ASAAS_PROVIDER,
      p_event_type: eventType,
      p_payload: payload,
      p_provider_event_id: providerEventId,
      p_negocio_id: negocioId,
      p_provider_customer_id: customerId,
      p_provider_subscription_id: subscriptionId,
      p_provider_status: providerStatus(entity),
      p_checkout_session_id: checkoutSessionId,
      p_event_origin: 'webhook',
    });
    if (recordError || !eventId) throw recordError || new Error('gateway_event_not_recorded');

    return jsonResponse({ received: true }, 200, req);
  } catch (error) {
    console.error('asaas-webhook failed:', error);
    return jsonResponse({ error: 'webhook_failed' }, 500, req);
  }
});
