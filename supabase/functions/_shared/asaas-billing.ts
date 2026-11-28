import { createAdminClient } from './supabase.ts';
import { reconcileAsaasSubscriptionCharges } from './asaas-charges.ts';

const ASAAS_PROVIDER = 'asaas';
const DEFAULT_CHECKOUT_BASE_URL = 'https://asaas.com/checkoutSession/show';
const DEFAULT_SANDBOX_CHECKOUT_BASE_URL = 'https://sandbox.asaas.com/checkoutSession/show';

type AdminClient = ReturnType<typeof createAdminClient>;

export type BillingEventOutcome = {
  outcome: 'processed' | 'ignored';
  note?: string;
  subscriptionToReconcile?: { negocioId: string; subscriptionId: string };
};

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

export function checkoutUrlFor(id: string) {
  const apiBase = requiredEnv('ASAAS_BASE_URL');
  const defaultBase = apiBase.includes('api-sandbox.') ? DEFAULT_SANDBOX_CHECKOUT_BASE_URL : DEFAULT_CHECKOUT_BASE_URL;
  const base = Deno.env.get('ASAAS_CHECKOUT_BASE_URL') || defaultBase;
  const url = new URL(base);
  url.searchParams.set('id', id);
  return url.toString();
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

function centsToReais(cents: number) {
  return Number((Number(cents || 0) / 100).toFixed(2));
}

async function callAsaas(path: string, body: Record<string, unknown>, method = 'POST') {
  const apiKey = requiredEnv('ASAAS_API_KEY');
  const baseUrl = requiredEnv('ASAAS_BASE_URL').replace(/\/+$/, '');
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

  if (event === 'CHECKOUT_PAID') return { status: null, paymentMethodStatus: null };
  if (event === 'CHECKOUT_CANCELED' || event === 'CHECKOUT_EXPIRED') {
    return { status: 'payment_grace', paymentMethodStatus: 'missing' };
  }
  if (event === 'SUBSCRIPTION_DELETED') {
    return { status: 'canceled', paymentMethodStatus: null };
  }
  if (event === 'SUBSCRIPTION_INACTIVATED' || event === 'SUBSCRIPTION_UPDATED') {
    return { status: null, paymentMethodStatus: null };
  }
  if (event === 'SUBSCRIPTION_CREATED') {
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
    .select('id, business_id, plan_code, action, metadata')
    .eq('provider', ASAAS_PROVIDER)
    .eq('provider_checkout_id', providerCheckoutId)
    .maybeSingle();
  if (sessionError) throw sessionError;
  if (session) {
    return {
      checkoutSessionId: session.id,
      negocioId: session.business_id,
      planCode: session.plan_code,
      action: session.action,
      request: ((session.metadata || {}).checkout_request || null) as Record<string, unknown> | null,
    };
  }

  const { data: event, error: eventError } = await admin
    .from('billing_events')
    .select('business_id, payload')
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
    negocioId: event?.business_id || parsed.negocioId,
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
  let negocioId = scalarId(event.business_id)
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

  const normalizedEventType = eventType.toUpperCase();
  const checkoutLifecycleEvents = new Set([
    'CHECKOUT_CREATED',
    'CHECKOUT_PAID',
    'CHECKOUT_CANCELED',
    'CHECKOUT_EXPIRED',
  ]);
  const recoveredCheckoutUrl = checkoutSessionId && providerCheckoutId
    && checkoutLifecycleEvents.has(normalizedEventType)
    ? checkoutUrlFor(providerCheckoutId)
    : null;
  const { error: checkoutEventError } = await admin.rpc('apply_billing_checkout_event_with_url', {
    p_event_id: eventId,
    p_checkout_url: recoveredCheckoutUrl,
  });
  if (checkoutEventError) throw checkoutEventError;

  if (action === 'upgrade' || action === 'upgrade_proration') {
    if (!negocioId || !planCode) throw new Error('upgrade_reference_missing');
    if (normalizedEventType !== 'PAYMENT_CONFIRMED') return { outcome: 'processed' };
    if (!checkoutSessionId) throw new Error('upgrade_checkout_session_missing');

    const { data: subscription, error: subscriptionError } = await admin
      .from('business_subscriptions')
      .select('id, provider, provider_subscription_id, provider_status, canceled_at, billing_action_kind')
      .eq('business_id', negocioId)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (!subscription) throw new Error('subscription_not_found');
    if (subscription.billing_action_kind) throw new Error('billing_action_in_progress');
    if (subscription.provider_status === 'DELETED' || subscription.canceled_at) throw new Error('subscription_not_upgradeable');

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
        checkout_session_id: checkoutSessionId,
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

  let newSubscriptionPayment = false;
  let suspendedExistingSubscriptionPayment = false;
  if (normalizedEventType === 'PAYMENT_CONFIRMED') {
    if (!subscriptionId) throw new Error('confirmed_subscription_reference_missing');
    const { data: currentSubscription, error: currentSubscriptionError } = await admin
      .from('business_subscriptions')
      .select('business_id, provider_status, reactivation_request_id')
      .eq('provider', ASAAS_PROVIDER)
      .eq('provider_subscription_id', subscriptionId)
      .maybeSingle();
    if (currentSubscriptionError) throw currentSubscriptionError;
    let historicalBusinessId: string | null = null;
    if (!currentSubscription?.business_id) {
      const { data: historicalSession, error: historicalError } = await admin
        .from('billing_checkout_sessions')
        .select('business_id')
        .eq('action', 'subscription')
        .eq('status', 'paid')
        .eq('origin_provider_status', 'EXPIRED')
        .eq('origin_provider_subscription_id', subscriptionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (historicalError) throw historicalError;
      historicalBusinessId = historicalSession?.business_id || null;
      if (historicalBusinessId) {
        if (negocioId && negocioId !== historicalBusinessId) throw new Error('historical_subscription_business_mismatch');
        negocioId = historicalBusinessId;
        await reconcileAsaasSubscriptionCharges(admin, negocioId, subscriptionId, undefined, 'worker');
      }
    }
    newSubscriptionPayment = !currentSubscription?.business_id && !historicalBusinessId;
    suspendedExistingSubscriptionPayment = Boolean(currentSubscription?.business_id)
      && (['INACTIVE', 'EXPIRED'].includes(String(currentSubscription.provider_status || '').toUpperCase())
        || Boolean(currentSubscription.reactivation_request_id));
    if (newSubscriptionPayment && (!checkoutSessionId || !negocioId || action !== 'subscription')) {
      throw new Error('confirmed_subscription_not_found');
    }
    if (newSubscriptionPayment) {
      const { data: checkoutSession, error: checkoutSessionError } = await admin
        .from('billing_checkout_sessions')
        .select('business_id, origin_provider_subscription_id, origin_provider_status')
        .eq('id', checkoutSessionId)
        .eq('action', 'subscription')
        .eq('status', 'paid')
        .maybeSingle();
      if (checkoutSessionError) throw checkoutSessionError;
      if (!checkoutSession || checkoutSession.business_id !== negocioId) {
        throw new Error('confirmed_subscription_checkout_mismatch');
      }
      if (checkoutSession.origin_provider_status === 'EXPIRED' && checkoutSession.origin_provider_subscription_id) {
        await reconcileAsaasSubscriptionCharges(admin, negocioId, checkoutSession.origin_provider_subscription_id, undefined, 'worker');
      }
    }
    if (currentSubscription?.business_id && currentSubscription.provider_status !== 'DELETED') {
      await reconcileAsaasSubscriptionCharges(admin, currentSubscription.business_id, subscriptionId, undefined, 'worker');
    }
  }

  const mapped = mapEvent(normalizedEventType, entity);
  const { data: processed, error: processError } = await admin.rpc('process_gateway_event', {
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
    p_canceled_at: null,
  });

  if (processError) {
    if (String(processError.message || '').includes('subscription_not_found')) {
      return { outcome: 'ignored', note: 'ignored_subscription_not_found' };
    }
    throw processError;
  }

  if (newSubscriptionPayment && !processed?.ignored) {
    const linkedNegocioId = String(processed?.negocio_id || '');
    if (!linkedNegocioId || linkedNegocioId !== negocioId) {
      throw new Error('confirmed_subscription_business_mismatch');
    }
    await reconcileAsaasSubscriptionCharges(admin, linkedNegocioId, subscriptionId, undefined, 'worker');
  }

  const subscriptionToReconcile = (normalizedEventType.startsWith('SUBSCRIPTION_')
      || suspendedExistingSubscriptionPayment || newSubscriptionPayment)
    && subscriptionId && !processed?.ignored
    ? { negocioId: negocioId || String(processed?.negocio_id || ''), subscriptionId }
    : undefined;
  if (subscriptionToReconcile && !subscriptionToReconcile.negocioId) {
    throw new Error('subscription_reconciliation_business_not_found');
  }
  return {
    outcome: processed?.ignored ? 'ignored' : 'processed',
    note: processed?.ignored ? String(processed.reason || 'ignored_gateway_event') : undefined,
    subscriptionToReconcile,
  };
}
