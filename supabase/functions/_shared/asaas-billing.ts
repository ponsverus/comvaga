import { createAdminClient } from './supabase.ts';

const ASAAS_PROVIDER = 'asaas';
const DEFAULT_ASAAS_BASE_URL = 'https://api-sandbox.asaas.com/v3';

type AdminClient = ReturnType<typeof createAdminClient>;

export type BillingEventOutcome = {
  outcome: 'processed' | 'ignored';
  note?: string;
};

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

export function scalarId(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).trim();
    return text || null;
  }
  return null;
}

export function parseExternalReference(value: unknown) {
  const text = String(value || '').trim();
  const current = /^comvaga-checkout:([0-9a-f-]{36}):([0-9a-f-]{36}):([a-z0-9_-]+):([a-z0-9_-]+)$/i.exec(text);
  if (current) {
    return {
      checkoutSessionId: current[1],
      negocioId: current[2],
      planCode: current[3].toLowerCase(),
      action: current[4].toLowerCase(),
    };
  }

  const legacy = /^comvaga:([0-9a-f-]{36}):([a-z0-9_-]+)(?::([a-z0-9_-]+))?$/i.exec(text);
  if (legacy) {
    return {
      checkoutSessionId: null,
      negocioId: legacy[1],
      planCode: legacy[2].toLowerCase(),
      action: legacy[3]?.toLowerCase() || null,
    };
  }

  return { checkoutSessionId: null, negocioId: null, planCode: null, action: null };
}

export function entityFromPayload(payload: Record<string, unknown>) {
  return (payload.subscription || payload.payment || payload.checkout || {}) as Record<string, unknown>;
}

export function checkoutFromPayload(payload: Record<string, unknown>) {
  return (payload.checkout || {}) as Record<string, unknown>;
}

export function providerSubscriptionId(payload: Record<string, unknown>, entity: Record<string, unknown>) {
  const direct = entity.object === 'subscription' ? scalarId(entity.id) : null;
  return direct || scalarId(entity.subscription) || scalarId(payload.subscriptionId);
}

export function providerCustomerId(entity: Record<string, unknown>) {
  return scalarId(entity.customer) || scalarId(entity.customerId);
}

export function providerStatus(entity: Record<string, unknown>) {
  return String(entity.status || entity.event || '') || null;
}

export function providerCheckoutSessionId(
  payload: Record<string, unknown>,
  entity: Record<string, unknown>,
  checkout: Record<string, unknown>,
) {
  return scalarId(entity.checkoutSession)
    || scalarId(payload.checkoutSession)
    || scalarId(checkout.id);
}

export async function timingSafeTokenMatch(received: string, expected: string) {
  const encoder = new TextEncoder();
  const [receivedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(received)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const receivedBytes = new Uint8Array(receivedHash);
  const expectedBytes = new Uint8Array(expectedHash);

  let diff = 0;
  for (let index = 0; index < receivedBytes.length; index++) {
    diff |= receivedBytes[index] ^ expectedBytes[index];
  }
  return diff === 0;
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

async function updateAsaasSubscriptionValue(subscriptionId: string, plan: Record<string, unknown>) {
  return callAsaas(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    value: centsToReais(Number(plan.price_cents || 0)),
    updatePendingPayments: true,
    externalReference: `comvaga-subscription:${plan.code}`,
    description: `Plano ${plan.name}`,
  }, 'PUT');
}

function isPaymentEvent(eventType: string) {
  return eventType.toUpperCase().startsWith('PAYMENT_');
}

function currentPeriodEnd(eventType: string, entity: Record<string, unknown>) {
  if (!isPaymentEvent(eventType)) return null;
  const value = entity.dueDate || null;
  return value ? String(value).slice(0, 10) : null;
}

function currentPeriodStart(eventType: string, entity: Record<string, unknown>) {
  if (!isPaymentEvent(eventType)) return null;
  const value = entity.dateCreated || null;
  return value ? String(value).slice(0, 10) : null;
}

function mapEvent(eventType: string, entity: Record<string, unknown>) {
  const event = eventType.toUpperCase();
  const status = String(entity.status || '').toUpperCase();

  if (event === 'CHECKOUT_PAID') return { status: null, paymentMethodStatus: null };
  if (event === 'CHECKOUT_CANCELED' || event === 'CHECKOUT_EXPIRED') {
    return { status: 'payment_grace', paymentMethodStatus: 'missing' };
  }
  if (event === 'SUBSCRIPTION_DELETED' || event === 'SUBSCRIPTION_INACTIVATED') {
    return { status: 'canceled', paymentMethodStatus: 'expired' };
  }
  if (event === 'SUBSCRIPTION_CREATED' || event === 'SUBSCRIPTION_UPDATED') {
    if (status === 'INACTIVE' || status === 'EXPIRED') {
      return { status: 'canceled', paymentMethodStatus: 'expired' };
    }
    return { status: null, paymentMethodStatus: null };
  }
  if (event === 'PAYMENT_CONFIRMED') return { status: 'active', paymentMethodStatus: 'valid' };
  if (event === 'PAYMENT_OVERDUE') return { status: 'past_due', paymentMethodStatus: 'failed' };
  if (
    event === 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED'
    || event === 'PAYMENT_REPROVED_BY_RISK_ANALYSIS'
    || event === 'PAYMENT_REFUNDED'
    || event === 'PAYMENT_CHARGEBACK_REQUESTED'
  ) {
    return { status: 'payment_grace', paymentMethodStatus: 'failed' };
  }
  return { status: null, paymentMethodStatus: null };
}

async function referenceFromCheckoutSession(admin: AdminClient, providerCheckoutId: string | null) {
  if (!providerCheckoutId) {
    return {
      checkoutSessionId: null,
      negocioId: null,
      planCode: null,
      action: null,
      request: null,
    };
  }

  const { data: session, error: sessionError } = await admin
    .from('billing_checkout_sessions')
    .select('id, negocio_id, plan_code, action, metadata')
    .eq('provider', ASAAS_PROVIDER)
    .eq('provider_checkout_id', providerCheckoutId)
    .maybeSingle();
  if (sessionError) throw sessionError;
  if (session) {
    return {
      checkoutSessionId: session.id,
      negocioId: session.negocio_id,
      planCode: session.plan_code,
      action: session.action,
      request: ((session.metadata || {}).checkout_request || null) as Record<string, unknown> | null,
    };
  }

  const { data: event, error: eventError } = await admin
    .from('billing_events')
    .select('negocio_id, payload')
    .eq('provider', ASAAS_PROVIDER)
    .eq('provider_event_id', `checkout:${providerCheckoutId}`)
    .maybeSingle();
  if (eventError) throw eventError;

  const eventPayload = (event?.payload || {}) as Record<string, unknown>;
  const request = (eventPayload.checkout_request || {}) as Record<string, unknown>;
  const checkout = (eventPayload.checkout || {}) as Record<string, unknown>;
  const parsed = parseExternalReference(request.externalReference || checkout.externalReference);

  return {
    checkoutSessionId: parsed.checkoutSessionId,
    negocioId: event?.negocio_id || parsed.negocioId,
    planCode: scalarId(request.planCode)?.toLowerCase() || parsed.planCode,
    action: scalarId(request.action)?.toLowerCase() || parsed.action,
    request,
  };
}

export async function processAsaasBillingEvent(
  admin: AdminClient,
  event: Record<string, unknown>,
): Promise<BillingEventOutcome> {
  const eventId = String(event.id || '');
  const providerEventId = String(event.provider_event_id || '');
  const payload = (event.payload || {}) as Record<string, unknown>;
  const eventType = String(event.event_type || payload.event || '');
  if (!eventId || !providerEventId || !eventType) throw new Error('invalid_billing_event');

  const entity = entityFromPayload(payload);
  const checkout = checkoutFromPayload(payload);
  const directReference = parseExternalReference(
    entity.externalReference || payload.externalReference || checkout.externalReference,
  );
  const customerId = providerCustomerId(entity);
  const subscriptionId = providerSubscriptionId(payload, entity);
  const providerCheckoutId = providerCheckoutSessionId(payload, entity, checkout);
  const storedReference = await referenceFromCheckoutSession(admin, providerCheckoutId);
  const checkoutSessionId = scalarId(event.checkout_session_id)
    || directReference.checkoutSessionId
    || storedReference.checkoutSessionId;
  const negocioId = scalarId(event.negocio_id)
    || directReference.negocioId
    || storedReference.negocioId;
  const planCode = directReference.planCode || storedReference.planCode;
  const action = directReference.action || storedReference.action;

  if (!negocioId && !customerId && !subscriptionId && !providerCheckoutId) {
    return { outcome: 'ignored', note: 'ignored_unlinked_event' };
  }

  if (checkoutSessionId && !event.checkout_session_id) {
    const { error: linkError } = await admin
      .from('billing_events')
      .update({ checkout_session_id: checkoutSessionId })
      .eq('id', eventId);
    if (linkError) throw linkError;
  }

  const { error: checkoutEventError } = await admin.rpc('apply_billing_checkout_event', {
    p_event_id: eventId,
  });
  if (checkoutEventError) throw checkoutEventError;

  const normalizedEventType = eventType.toUpperCase();
  const checkoutLifecycleEvents = new Set([
    'CHECKOUT_CREATED',
    'CHECKOUT_PAID',
    'CHECKOUT_CANCELED',
    'CHECKOUT_EXPIRED',
  ]);

  if (action === 'upgrade' || action === 'upgrade_proration') {
    if (!negocioId || !planCode) throw new Error('upgrade_reference_missing');
    if (normalizedEventType !== 'PAYMENT_CONFIRMED') return { outcome: 'processed' };

    const { data: subscription, error: subscriptionError } = await admin
      .from('business_subscriptions')
      .select('id, provider, provider_subscription_id')
      .eq('negocio_id', negocioId)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (!subscription) throw new Error('subscription_not_found');

    const { data: targetPlan, error: planError } = await admin
      .from('billing_plans')
      .select('code, name, price_cents')
      .eq('code', planCode)
      .eq('active', true)
      .maybeSingle();
    if (planError) throw planError;
    if (!targetPlan) throw new Error('plan_not_found');

    const providerSubscription = scalarId((storedReference.request || {}).providerSubscriptionId)
      || scalarId(subscription.provider_subscription_id)
      || subscriptionId;
    let providerPayload: Record<string, unknown> = {};
    if (String(subscription.provider || '').toLowerCase() === ASAAS_PROVIDER && providerSubscription) {
      providerPayload = {
        provider_response: await updateAsaasSubscriptionValue(providerSubscription, targetPlan),
      };
    }

    const { error: upgradeError } = await admin.rpc('apply_paid_business_plan_upgrade', {
      p_negocio_id: negocioId,
      p_plan_code: planCode,
      p_provider_event_id: providerEventId,
      p_provider_payload: {
        webhook_payload: payload,
        checkout_request: storedReference.request,
        providerPayload,
      },
    });
    if (upgradeError) throw upgradeError;
    return { outcome: 'processed' };
  }

  if (action === 'subscription' && checkoutLifecycleEvents.has(normalizedEventType)) {
    return { outcome: 'processed' };
  }

  const mapped = mapEvent(normalizedEventType, entity);
  const { error: processError } = await admin.rpc('process_gateway_event', {
    p_event_id: eventId,
    p_provider: ASAAS_PROVIDER,
    p_provider_event_id: providerEventId,
    p_negocio_id: negocioId,
    p_provider_customer_id: customerId,
    p_provider_subscription_id: subscriptionId,
    p_provider_status: providerStatus(entity),
    p_plan_code: planCode,
    p_payment_method_status: mapped.paymentMethodStatus,
    p_status: mapped.status,
    p_current_period_start: currentPeriodStart(normalizedEventType, entity),
    p_current_period_end: currentPeriodEnd(normalizedEventType, entity),
    p_canceled_at: normalizedEventType === 'SUBSCRIPTION_DELETED'
        || normalizedEventType === 'SUBSCRIPTION_INACTIVATED'
      ? new Date().toISOString()
      : null,
  });

  if (processError) {
    if (String(processError.message || '').includes('subscription_not_found')) {
      return { outcome: 'ignored', note: 'ignored_subscription_not_found' };
    }
    throw processError;
  }

  return { outcome: 'processed' };
}
