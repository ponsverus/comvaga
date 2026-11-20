import { getCorsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase.ts';
import { reserveOwnerAsaasAction } from '../_shared/asaas-rate-limit.ts';
import { checkoutUrlFor } from '../_shared/asaas-billing.ts';
import { reconcileAsaasSubscriptionState } from '../_shared/asaas-subscription-state.ts';
import { isDueOpenCharge, reconcileAsaasSubscriptionCharges, todayInSaoPaulo } from '../_shared/asaas-charges.ts';

type BillingPlan = {
  code: string;
  name: string;
  price_cents: number;
  max_profissionais: number | null;
  sort_order: number;
};

const ASAAS_PROVIDER = 'asaas';
function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function normalizePlanCode(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function asSaoPauloDateOnly(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function asAsaasDateTime(date: Date) {
  return `${asSaoPauloDateOnly(date)} 00:00:00`;
}

function asDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function publicSiteUrl() {
  return requiredEnv('PUBLIC_SITE_URL').replace(/\/+$/, '');
}

function centsToReais(cents: number) {
  return Number((Number(cents || 0) / 100).toFixed(2));
}

function formatMoney(cents: number) {
  return `R$ ${(Number(cents || 0) / 100).toFixed(2).replace('.', ',')}`;
}

function checkoutExpiresAtIso() {
  const minutes = Number(Deno.env.get('ASAAS_CHECKOUT_EXPIRES_MINUTES') || 1440);
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

class AsaasHttpError extends Error {
  status: number;
  constructor(status: number, details: string) {
    super(`asaas_checkout_failed (${status}): ${details}`);
    this.status = status;
  }
}

class AsaasTransportError extends Error {
  constructor(cause: unknown) {
    super(errorMessage(cause));
  }
}

class BillingActionUnconfirmedError extends Error {
  constructor() {
    super('billing_action_confirmation_pending');
  }
}

class BillingActionRejectedError extends Error {
  status: number;
  constructor(status: number) {
    super('billing_upgrade_provider_rejected');
    this.status = status;
  }
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || 'checkout_failed');
  }
  return String(error || 'checkout_failed');
}

function isKnownAsaasRejection(error: unknown) {
  return error instanceof AsaasHttpError && [400, 401, 403, 404, 422, 429].includes(error.status);
}

const checkoutConflictCodes = new Set([
  'billing_action_in_progress', 'paid_upgrade_application_pending',
  'checkout_in_progress', 'checkout_reconciliation_pending',
  'provider_sync_in_progress', 'plan_downgrade_pending',
  'subscription_debt_must_be_paid', 'provider_subscription_reconciliation_pending',
  'subscription_not_found',
]);

type CheckoutFailure = {
  code: string;
  status: number;
  outcomeUnknown: boolean;
  providerStatus: number | null;
  recoveredCheckout?: { id: string; url: string };
};

function classifyCheckoutFailure(error: unknown, providerCallStarted: boolean): CheckoutFailure {
  const providerStatus = error instanceof AsaasHttpError || error instanceof BillingActionRejectedError
    ? error.status : null;
  if (error instanceof BillingActionRejectedError) {
    return { code: error.status === 429 ? 'rate_limit_exceeded' : 'billing_upgrade_provider_rejected',
      status: error.status === 429 ? 429 : 502, outcomeUnknown: false, providerStatus };
  }
  if (error instanceof BillingActionUnconfirmedError) {
    return { code: 'billing_action_confirmation_pending', status: 503, outcomeUnknown: true, providerStatus };
  }
  if (providerStatus === 429) {
    return { code: 'rate_limit_exceeded', status: 429, outcomeUnknown: false, providerStatus };
  }
  if (isKnownAsaasRejection(error)) {
    return { code: 'checkout_provider_rejected', status: 502, outcomeUnknown: false, providerStatus };
  }
  if (providerStatus !== null) {
    return { code: 'checkout_result_unknown', status: 502, outcomeUnknown: true, providerStatus };
  }
  if (providerCallStarted) {
    return { code: 'checkout_result_unknown', status: error instanceof AsaasTransportError ? 503 : 500,
      outcomeUnknown: true, providerStatus: null };
  }
  const message = errorMessage(error);
  if (checkoutConflictCodes.has(message)) {
    return { code: message, status: 409, outcomeUnknown: false, providerStatus: null };
  }
  if (message === 'checkout_owner_required') {
    return { code: 'acesso_negado', status: 403, outcomeUnknown: false, providerStatus: null };
  }
  if (message === 'plan_not_found') {
    return { code: message, status: 404, outcomeUnknown: false, providerStatus: null };
  }
  return { code: 'checkout_internal_error', status: 500, outcomeUnknown: false, providerStatus: null };
}

function proratedUpgradeCents(currentPriceCents: number, nextPriceCents: number, periodStart: unknown, periodEnd: unknown) {
  const diff = Math.max(0, Number(nextPriceCents || 0) - Number(currentPriceCents || 0));
  if (diff <= 0) return 0;

  const start = asDate(periodStart);
  const end = asDate(periodEnd);
  const now = new Date();
  if (!start || !end || end <= now || end <= start) return diff;

  const totalMs = end.getTime() - start.getTime();
  const remainingMs = Math.max(0, end.getTime() - now.getTime());
  return Math.max(0, Math.ceil(diff * (remainingMs / totalMs)));
}

async function callAsaas(path: string, body: Record<string, unknown>, method = 'POST', onRequestStarted?: () => void) {
  const apiKey = requiredEnv('ASAAS_API_KEY');
  const baseUrl = requiredEnv('ASAAS_BASE_URL').replace(/\/+$/, '');

  let response: Response;
  try {
    onRequestStarted?.();
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        access_token: apiKey,
        accept: 'application/json',
        'content-type': 'application/json',
        'User-Agent': 'Comvaga/1.0',
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new AsaasTransportError(error);
  }

  const responseText = await response.text().catch(() => '');
  let data: Record<string, unknown> = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    console.error('Asaas checkout error:', response.status, data || responseText);
    const asaasError = Array.isArray(data?.errors)
      ? data.errors.map((item: Record<string, unknown>) => item.description || item.message || item.code).filter(Boolean).join(' | ')
      : data?.description || data?.message || responseText || JSON.stringify(data);
    const details = String(asaasError || '').trim();
    throw new AsaasHttpError(response.status, details || 'empty_response');
  }

  return data;
}

async function updateAsaasSubscriptionValue(subscriptionId: string, plan: BillingPlan, onRequestStarted?: () => void) {
  return callAsaas(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    value: centsToReais(plan.price_cents),
    updatePendingPayments: true,
    externalReference: `comvaga-subscription:${plan.code}`,
    description: `Plano ${plan.name}`,
  }, 'PUT', onRequestStarted);
}

function asText(value: unknown) {
  return String(value || '').trim();
}


async function fetchBillingStatus(userClient: ReturnType<typeof createUserClient>, negocioId: string) {
  const { data, error } = await userClient.rpc('get_business_billing_status', {
    p_negocio_id: negocioId,
  });
  if (error) throw error;
  return data;
}

async function beginBillingCheckoutSession(
  admin: ReturnType<typeof createAdminClient>,
  args: {
    p_negocio_id: string;
    p_plan_code: string;
    p_action: string;
    p_amount_cents: number;
    p_created_by: string;
    p_expires_at: string;
  },
) {
  const { data, error } = await admin.rpc('begin_billing_checkout_session', args);
  if (error) throw error;
  return data;
}

async function recordCheckoutFailure(
  admin: ReturnType<typeof createAdminClient>,
  sessionId: string,
  error: unknown,
  providerCallStarted: boolean,
  checkoutPayload: Record<string, unknown>,
  providerCheckoutId: string | null = null,
  providerCheckoutUrl: string | null = null,
): Promise<CheckoutFailure> {
  console.error('checkout creation failed:', error);
  const failure: CheckoutFailure = providerCheckoutId
    ? { code: 'checkout_record_pending', status: 503, outcomeUnknown: true, providerStatus: null }
    : classifyCheckoutFailure(error, providerCallStarted);
  try {
    const { error: recordError } = await admin.rpc('fail_billing_checkout_session', {
      p_session_id: sessionId,
      p_error: errorMessage(error),
      p_outcome_unknown: failure.outcomeUnknown,
      p_payload: {
        checkoutPayload,
        failure_code: failure.code,
        provider_http_status: failure.providerStatus,
        outcome_unknown: failure.outcomeUnknown,
        provider_checkout_id: providerCheckoutId,
        checkout_url: providerCheckoutUrl,
      },
    });
    if (recordError) throw recordError;
    return failure;
  } catch (recordError) {
    try {
      const { data: session, error: lookupError } = await admin
        .from('billing_checkout_sessions')
        .select('status, provider_checkout_id, checkout_url, expires_at')
        .eq('id', sessionId)
        .maybeSingle();
      const expiresAt = Date.parse(String(session?.expires_at || ''));
      if (!lookupError && session?.status === 'active'
        && session.provider_checkout_id && session.checkout_url
        && Number.isFinite(expiresAt) && expiresAt > Date.now()
        && (!providerCheckoutId || session.provider_checkout_id === providerCheckoutId)) {
        console.info('checkout confirmed by stored session after provider response failure:', sessionId);
        return {
          code: 'checkout_recovered',
          status: 200,
          outcomeUnknown: false,
          providerStatus: failure.providerStatus,
          recoveredCheckout: {
            id: String(session.provider_checkout_id),
            url: String(session.checkout_url),
          },
        };
      }
      if (lookupError) console.error('checkout recovery read failed:', lookupError);
    } catch (lookupError) {
      console.error('checkout recovery read failed:', lookupError);
    }
    console.error('fail_billing_checkout_session failed:', recordError);
    return providerCheckoutId
      ? failure
      : { code: 'checkout_state_unavailable', status: 500, outcomeUnknown: true, providerStatus: failure.providerStatus };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405, req);

  let adminForDebug: ReturnType<typeof createAdminClient> | null = null;
  let debugNegocioId: string | null = null;
  let debugPlanCode: string | null = null;
  let debugPayload: Record<string, unknown> = {};

  try {
    const authorization = req.headers.get('authorization') || '';
    if (!authorization.toLowerCase().startsWith('bearer ')) {
      return jsonResponse({ error: 'not_authenticated' }, 401, req);
    }

    const userClient = createUserClient(authorization);
    const admin = createAdminClient();
    adminForDebug = admin;
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user?.id) return jsonResponse({ error: 'not_authenticated' }, 401, req);

    const body = await req.json().catch(() => ({}));
    const negocioId = String(body?.negocio_id || '').trim();
    const planCode = normalizePlanCode(body?.plan_code);
    debugNegocioId = negocioId || null;
    debugPlanCode = planCode || null;
    if (!negocioId || !planCode) return jsonResponse({ error: 'missing_required_fields' }, 400, req);

    const [{ data: plan, error: planFetchError }, { data: negocio, error: negocioError }] = await Promise.all([
      admin.from('billing_plans').select('code, name, price_cents, max_profissionais, sort_order').eq('code', planCode).eq('active', true).maybeSingle(),
      admin.from('negocios').select('id, owner_id, nome').eq('id', negocioId).maybeSingle(),
    ]);

    if (planFetchError) throw planFetchError;
    if (negocioError) throw negocioError;
    if (!plan) return jsonResponse({ error: 'plan_not_found' }, 404, req);
    if (!negocio || negocio.owner_id !== authData.user.id) return jsonResponse({ error: 'acesso_negado' }, 403, req);

    const selectedPlan = plan as BillingPlan;

    if (selectedPlan.max_profissionais != null) {
      const { count, error: countError } = await admin
        .from('profissionais')
        .select('id', { count: 'exact', head: true })
        .eq('negocio_id', negocioId)
        .in('status', ['ativo', 'pendente']);
      if (countError) throw countError;
      if (Number(count || 0) > selectedPlan.max_profissionais) {
        return jsonResponse({ error: 'plan_professional_limit_reached' }, 400, req);
      }
    }

    const statusData = await fetchBillingStatus(userClient, negocioId);
    const activeCheckoutPlanCode = normalizePlanCode(statusData?.active_checkout_plan_code);
    if (Boolean(statusData?.has_active_checkout) && activeCheckoutPlanCode && activeCheckoutPlanCode !== selectedPlan.code) {
      return jsonResponse({ error: 'checkout_in_progress', billing_status: statusData }, 409, req);
    }

    const { data: subscription, error: subscriptionCustomerError } = await admin
      .from('business_subscriptions')
      .select('id, plan_code, provider, provider_customer_id, provider_subscription_id, provider_status_revision, current_period_start, current_period_end, current_period_price_cents, provider_current_period_end')
      .eq('negocio_id', negocioId)
      .maybeSingle();
    if (subscriptionCustomerError) throw subscriptionCustomerError;

    const existingCustomerId = String(subscription?.provider_customer_id || '').trim() || null;
    const providerSubscriptionId = String(subscription?.provider_subscription_id || '').trim() || null;
    const currentPlanCode = normalizePlanCode(statusData?.plan_code || subscription?.plan_code);
    const currentStatus = String(statusData?.status || '').toLowerCase();
    const paymentStatus = String(statusData?.payment_method_status || '').toLowerCase();
    const activePaidSubscription = currentStatus === 'active'
      && paymentStatus === 'valid'
      && !Boolean(statusData?.cancellation_scheduled)
      && !!currentPlanCode;

    if (activePaidSubscription && currentPlanCode === selectedPlan.code) {
      return jsonResponse({
        action: 'no_change',
        billing_status: statusData,
      }, 200, req);
    }

    if (activePaidSubscription) {
      const { data: currentPlan, error: currentPlanError } = await admin
        .from('billing_plans')
        .select('code, name, price_cents, max_profissionais, sort_order')
        .eq('code', currentPlanCode)
        .eq('active', true)
        .maybeSingle();
      if (currentPlanError) throw currentPlanError;
      if (!currentPlan) return jsonResponse({ error: 'current_plan_not_found' }, 409, req);

      const typedCurrentPlan = currentPlan as BillingPlan;
      if (selectedPlan.sort_order < typedCurrentPlan.sort_order) {
        const { data: downgradeStatus, error: downgradeError } = await admin.rpc('schedule_business_plan_downgrade', {
          p_negocio_id: negocioId,
          p_plan_code: selectedPlan.code,
          p_actor_id: authData.user.id,
          p_provider_payload: {
            source: 'owner_dashboard',
            requested_operation: 'apply_downgrade',
          },
        });
        if (downgradeError) throw downgradeError;
        return jsonResponse({
          action: 'downgrade_scheduled',
          billing_status: downgradeStatus,
          provider_sync_deferred: Boolean(downgradeStatus?.provider_sync_pending),
        }, 200, req);
      }

      if (selectedPlan.sort_order > typedCurrentPlan.sort_order) {
        const limited = await reserveOwnerAsaasAction(admin, authData.user.id, 'create_checkout', req);
        if (limited) return limited;
        if (Boolean(statusData?.provider_sync_pending)) {
          return jsonResponse({ error: 'provider_sync_in_progress', billing_status: statusData }, 409, req);
        }
        if (Boolean(statusData?.plan_change_scheduled) && String(statusData?.pending_plan_change_type || '').toLowerCase() === 'downgrade') {
          return jsonResponse({ error: 'plan_downgrade_pending', billing_status: statusData }, 409, req);
        }
        if (!existingCustomerId) return jsonResponse({ error: 'provider_customer_missing' }, 409, req);
        if (!providerSubscriptionId && String(subscription?.provider || '').toLowerCase() === ASAAS_PROVIDER) {
          return jsonResponse({ error: 'provider_subscription_missing' }, 409, req);
        }

        const periodStart = subscription?.current_period_start || statusData?.current_period_start;
        const periodEnd = subscription?.current_period_end || subscription?.provider_current_period_end || statusData?.current_period_end;
        const currentPeriodPriceCents = Number(
          subscription?.current_period_price_cents
          || statusData?.current_period_price_cents
          || typedCurrentPlan.price_cents
          || 0
        );
        const proratedCents = proratedUpgradeCents(currentPeriodPriceCents, selectedPlan.price_cents, periodStart, periodEnd);

        if (proratedCents <= 0) {
          const billingActionRequestId = crypto.randomUUID();
          const { error: claimError } = await admin.rpc('claim_owner_billing_action', {
            p_negocio_id: negocioId,
            p_actor_id: authData.user.id,
            p_provider_subscription_id: providerSubscriptionId,
            p_expected_revision: Number(subscription?.provider_status_revision || 0),
            p_kind: 'zero_upgrade',
            p_target_plan_code: selectedPlan.code,
            p_request_id: billingActionRequestId,
          });
          if (claimError) throw claimError;

          let providerMutationStarted = false;
          try {
            let providerPayload: Record<string, unknown> = {};
            if (String(subscription?.provider || '').toLowerCase() === ASAAS_PROVIDER && providerSubscriptionId) {
              providerPayload = {
                provider_response: await updateAsaasSubscriptionValue(
                  providerSubscriptionId, selectedPlan, () => { providerMutationStarted = true; },
                ),
              };
            }

            const { data: upgradeStatus, error: upgradeError } = await admin.rpc('apply_paid_business_plan_upgrade', {
              p_negocio_id: negocioId,
              p_plan_code: selectedPlan.code,
              p_provider_event_id: `zero_proration_upgrade:${negocioId}:${billingActionRequestId}`,
              p_provider_payload: {
                action: 'zero_proration_upgrade',
                billing_action_request_id: billingActionRequestId,
                fromPlanCode: typedCurrentPlan.code,
                toPlanCode: selectedPlan.code,
                currentPeriodPriceCents,
                targetPlanPriceCents: selectedPlan.price_cents,
                providerPayload,
              },
            });
            if (upgradeError) throw upgradeError;

            return jsonResponse({
              action: 'upgrade_applied',
              billing_status: upgradeStatus,
            }, 200, req);
          } catch (upgradeError) {
            if (!providerMutationStarted || isKnownAsaasRejection(upgradeError)) {
              const { error: releaseError } = await admin.rpc('release_owner_billing_action', {
                p_negocio_id: negocioId,
                p_request_id: billingActionRequestId,
                p_reason: 'zero_upgrade_not_sent_or_rejected',
              });
              if (releaseError) {
                console.error('zero upgrade claim release failed:', releaseError);
                throw new BillingActionUnconfirmedError();
              }
            }
            if (providerMutationStarted && !isKnownAsaasRejection(upgradeError)) {
              console.error('zero upgrade outcome unknown:', upgradeError);
              throw new BillingActionUnconfirmedError();
            }
            if (providerMutationStarted && isKnownAsaasRejection(upgradeError)) {
              throw new BillingActionRejectedError((upgradeError as AsaasHttpError).status);
            }
            throw upgradeError;
          }
        }

        const beginData = await beginBillingCheckoutSession(admin, {
          p_negocio_id: negocioId,
          p_plan_code: selectedPlan.code,
          p_action: 'upgrade_proration',
          p_amount_cents: proratedCents,
          p_created_by: authData.user.id,
          p_expires_at: checkoutExpiresAtIso(),
        });

        if (beginData?.result === 'reused') {
          return jsonResponse({
            action: 'upgrade_proration_checkout',
            checkout_id: beginData.checkout_id,
            checkout_url: beginData.checkout_url,
            billing_status: statusData,
            prorated_price_cents: proratedCents,
            reused: true,
          }, 200, req);
        }
        if (beginData?.result !== 'created') {
          return jsonResponse({
            error: `checkout_session_${beginData?.result || 'unavailable'}`,
            billing_status: statusData,
          }, 409, req);
        }

        const sessionId = String(beginData.session_id);
        const externalReference = String(beginData.external_reference);

        let providerCreateStarted = false;
        let providerCheckoutId: string | null = null;
        let providerCheckoutUrl: string | null = null;
        let checkoutPayload: Record<string, unknown> = {};
        try {
          const siteUrl = publicSiteUrl();
          checkoutPayload = {
            billingTypes: ['CREDIT_CARD'],
            chargeTypes: ['DETACHED'],
            minutesToExpire: Number(Deno.env.get('ASAAS_CHECKOUT_EXPIRES_MINUTES') || 1440),
            externalReference,
            customer: existingCustomerId,
            callback: {
              successUrl: `${siteUrl}/dashboard?tab=planos&billing=success`,
              cancelUrl: `${siteUrl}/dashboard?tab=planos&billing=cancel`,
              expiredUrl: `${siteUrl}/dashboard?tab=planos&billing=expired`,
            },
            items: [{
              name: `Upgrade para ${selectedPlan.name}`,
              description: `O valor proporcional do plano ${typedCurrentPlan.name} para ${selectedPlan.name}`,
              quantity: 1,
              value: centsToReais(proratedCents),
            }],
          };
          debugPayload = checkoutPayload;

          const { error: markerError } = await admin.rpc('mark_billing_checkout_request_started', { p_session_id: sessionId });
          if (markerError) throw markerError;
          const checkout = await callAsaas('/checkouts', checkoutPayload, 'POST', () => { providerCreateStarted = true; });
          if (!checkout?.id) throw new Error('asaas_checkout_without_id');

          providerCheckoutId = String(checkout.id);
          const checkoutUrl = String(checkout.url || checkout.link || checkoutUrlFor(checkout.id));
          providerCheckoutUrl = checkoutUrl;
          const { error: completeError } = await admin.rpc('complete_billing_checkout_session', {
            p_session_id: sessionId,
            p_provider_checkout_id: String(checkout.id),
            p_checkout_url: checkoutUrl,
            p_provider_status: checkout?.status || null,
            p_provider_customer_id: existingCustomerId,
            p_provider_subscription_id: providerSubscriptionId,
            p_payload: {
              checkout,
              checkout_request: {
                action: 'upgrade_proration',
                externalReference,
                currentPlanCode: typedCurrentPlan.code,
                planCode: selectedPlan.code,
                currentPlanPriceCents: typedCurrentPlan.price_cents,
                currentPeriodPriceCents,
                targetPlanPriceCents: selectedPlan.price_cents,
                proratedPriceCents: proratedCents,
                proratedPriceLabel: formatMoney(proratedCents),
                currentPeriodStart: periodStart,
                currentPeriodEnd: periodEnd,
                customer: existingCustomerId,
                providerSubscriptionId,
              },
            },
          });
          if (completeError) throw completeError;

          const refreshedStatus = await fetchBillingStatus(userClient, negocioId).catch((statusError) => {
            console.error('checkout status refresh failed after creation:', statusError);
            return null;
          });

          return jsonResponse({
            action: 'upgrade_proration_checkout',
            checkout_id: checkout.id,
            checkout_url: checkoutUrl,
            billing_status: refreshedStatus,
            prorated_price_cents: proratedCents,
          }, 200, req);
        } catch (checkoutError) {
          const failure = await recordCheckoutFailure(admin, sessionId, checkoutError, providerCreateStarted, checkoutPayload, providerCheckoutId, providerCheckoutUrl);
          if (failure.recoveredCheckout) {
            return jsonResponse({
              action: 'upgrade_proration_checkout',
              checkout_id: failure.recoveredCheckout.id,
              checkout_url: failure.recoveredCheckout.url,
              billing_status: null,
              prorated_price_cents: proratedCents,
              recovered: true,
            }, 200, req);
          }
          return jsonResponse({ error: failure.code }, failure.status, req);
        }
      }
    }

    const canOpenCheckout = (
      ['payment_grace', 'blocked', 'past_due', 'canceled'].includes(currentStatus)
      || Boolean(statusData?.cancellation_scheduled)
      || String(statusData?.provider_status || '').toUpperCase() === 'EXPIRED'
      || (currentStatus === 'active' && paymentStatus !== 'valid')
    );

    if (!canOpenCheckout) {
      return jsonResponse({
        error: 'trial_access_active',
        billing_status: statusData,
      }, 409, req);
    }

    if (Boolean(statusData?.provider_sync_pending)) {
      return jsonResponse({ error: 'provider_sync_in_progress', billing_status: statusData }, 409, req);
    }
    if (Boolean(statusData?.plan_change_scheduled)) {
      return jsonResponse({ error: 'plan_downgrade_pending', billing_status: statusData }, 409, req);
    }



    if (Number(statusData?.due_charge_count || 0) > 0) {
      return jsonResponse({ error: 'subscription_debt_must_be_paid', billing_status: statusData }, 409, req);
    }
    const limited = await reserveOwnerAsaasAction(admin, authData.user.id, 'create_checkout', req);
    if (limited) return limited;
    let confirmedStateForCheckout: string | null = null;
    if (String(subscription?.provider || '').toLowerCase() === ASAAS_PROVIDER && providerSubscriptionId) {
      let confirmedState: string;
      try {
        confirmedState = await reconcileAsaasSubscriptionState(admin, negocioId, providerSubscriptionId);
      } catch (reconciliationError) {
        console.error('Asaas subscription reconciliation failed before checkout:', reconciliationError);
        return jsonResponse({ error: 'provider_subscription_reconciliation_pending', billing_status: statusData }, 409, req);
      }
      confirmedStateForCheckout = confirmedState;
      if (confirmedState !== 'DELETED' && confirmedState !== 'EXPIRED') {
        return jsonResponse({ error: 'provider_subscription_recovery_required', billing_status: statusData }, 409, req);
      }
      if (confirmedState === 'EXPIRED') {
        try {
          const charges = await reconcileAsaasSubscriptionCharges(admin, negocioId, providerSubscriptionId);
          if (charges.some((charge) => isDueOpenCharge(charge, providerSubscriptionId, todayInSaoPaulo()))) {
            const refreshed = await fetchBillingStatus(userClient, negocioId);
            return jsonResponse({ error: 'subscription_debt_must_be_paid', billing_status: refreshed }, 409, req);
          }
        } catch (chargeError) {
          console.error('Asaas charge reconciliation failed before checkout:', chargeError);
          return jsonResponse({ error: 'subscription_charge_reconciliation_pending', billing_status: statusData }, 409, req);
        }
      }
    }
    const beginDataSub = await beginBillingCheckoutSession(admin, {
      p_negocio_id: negocioId,
      p_plan_code: selectedPlan.code,
      p_action: 'subscription',
      p_amount_cents: selectedPlan.price_cents,
      p_created_by: authData.user.id,
      p_expires_at: checkoutExpiresAtIso(),
    });

    if (beginDataSub?.result === 'reused') {
      return jsonResponse({
        checkout_id: beginDataSub.checkout_id,
        checkout_url: beginDataSub.checkout_url,
        billing_status: statusData,
        reused: true,
      }, 200, req);
    }
    if (beginDataSub?.result !== 'created') {
      return jsonResponse({
        error: `checkout_session_${beginDataSub?.result || 'unavailable'}`,
        billing_status: statusData,
      }, 409, req);
    }

    const sessionIdSub = String(beginDataSub.session_id);
    const externalReferenceSub = String(beginDataSub.external_reference);

    let providerCreateStartedSub = false;
    let providerCheckoutIdSub: string | null = null;
    let providerCheckoutUrlSub: string | null = null;
    let checkoutPayload: Record<string, unknown> = {};
    try {
      const siteUrl = publicSiteUrl();
      const scheduledAccessEnd = (statusData?.cancellation_scheduled
        || String(statusData?.provider_status || '').toUpperCase() === 'EXPIRED')
        ? asDate(statusData?.access_ends_at || statusData?.current_period_end)
        : null;
      const nextDueDate = asAsaasDateTime(
        scheduledAccessEnd && scheduledAccessEnd.getTime() > Date.now()
          ? scheduledAccessEnd
          : new Date(),
      );
      checkoutPayload = {
        billingTypes: ['CREDIT_CARD'],
        chargeTypes: ['RECURRENT'],
        minutesToExpire: Number(Deno.env.get('ASAAS_CHECKOUT_EXPIRES_MINUTES') || 1440),
        externalReference: externalReferenceSub,
        ...(existingCustomerId ? { customer: existingCustomerId } : {}),
        callback: {
          successUrl: `${siteUrl}/dashboard?tab=planos&billing=success`,
          cancelUrl: `${siteUrl}/dashboard?tab=planos&billing=cancel`,
          expiredUrl: `${siteUrl}/dashboard?tab=planos&billing=expired`,
        },
        items: [{
          name: `Plano ${selectedPlan.name}`,
          description: `Assinatura mensal do plano ${selectedPlan.name}`,
          quantity: 1,
          value: centsToReais(selectedPlan.price_cents),
        }],
        subscription: {
          cycle: 'MONTHLY',
          nextDueDate,
        },
      };
      debugPayload = checkoutPayload;
      if (confirmedStateForCheckout === 'EXPIRED' && providerSubscriptionId) {
        const latestCharges = await reconcileAsaasSubscriptionCharges(admin, negocioId, providerSubscriptionId);
        if (latestCharges.some((charge) => isDueOpenCharge(charge, providerSubscriptionId, todayInSaoPaulo()))) {
          const { error: releaseError } = await admin.rpc('fail_billing_checkout_session', {
            p_session_id: sessionIdSub,
            p_error: 'subscription_debt_must_be_paid',
            p_outcome_unknown: false,
            p_payload: { reason: 'due_charge_found_before_provider_checkout' },
          });
          if (releaseError) throw releaseError;
          const refreshed = await fetchBillingStatus(userClient, negocioId).catch((statusError) => {
            console.error('billing status refresh failed after debt check:', statusError);
            return null;
          });
          return jsonResponse({ error: 'subscription_debt_must_be_paid', billing_status: refreshed }, 409, req);
        }
      }
      const { error: markerErrorSub } = await admin.rpc('mark_billing_checkout_request_started', { p_session_id: sessionIdSub });
      if (markerErrorSub) throw markerErrorSub;
      const checkout = await callAsaas('/checkouts', checkoutPayload, 'POST', () => { providerCreateStartedSub = true; });
      if (!checkout?.id) throw new Error('asaas_checkout_without_id');

      providerCheckoutIdSub = String(checkout.id);
      const checkoutUrlSub = String(checkout.url || checkout.link || checkoutUrlFor(checkout.id));
      providerCheckoutUrlSub = checkoutUrlSub;
      const { error: completeErrorSub } = await admin.rpc('complete_billing_checkout_session', {
        p_session_id: sessionIdSub,
        p_provider_checkout_id: String(checkout.id),
        p_checkout_url: checkoutUrlSub,
        p_provider_status: checkout?.status || null,
        p_provider_customer_id: existingCustomerId,
        p_provider_subscription_id: null,
        p_payload: {
          checkout,
          checkout_request: {
            externalReference: externalReferenceSub,
            planCode: selectedPlan.code,
            nextDueDate,
            reactivationAfterPaidAccess: Boolean(scheduledAccessEnd && scheduledAccessEnd.getTime() > Date.now()),
            customer: existingCustomerId,
          },
        },
      });
      if (completeErrorSub) throw completeErrorSub;

      const refreshedStatusSub = await fetchBillingStatus(userClient, negocioId).catch((statusError) => {
        console.error('checkout status refresh failed after creation:', statusError);
        return null;
      });

      return jsonResponse({
        checkout_id: checkout.id,
        checkout_url: checkoutUrlSub,
        billing_status: refreshedStatusSub,
      }, 200, req);
    } catch (checkoutErrorSub) {
      const failure = await recordCheckoutFailure(admin, sessionIdSub, checkoutErrorSub, providerCreateStartedSub, checkoutPayload, providerCheckoutIdSub, providerCheckoutUrlSub);
      if (failure.recoveredCheckout) {
        return jsonResponse({
          checkout_id: failure.recoveredCheckout.id,
          checkout_url: failure.recoveredCheckout.url,
          billing_status: null,
          recovered: true,
        }, 200, req);
      }
      return jsonResponse({ error: failure.code }, failure.status, req);
    }
  } catch (error) {
    console.error('asaas-create-checkout failed:', error);
    const failure = classifyCheckoutFailure(error, false);
    if (error instanceof BillingActionUnconfirmedError) {
      return jsonResponse({ error: failure.code }, failure.status, req);
    }
    try {
      await adminForDebug?.from('billing_events').insert({
        negocio_id: debugNegocioId,
        provider: ASAAS_PROVIDER,
        provider_event_id: `checkout_error:${crypto.randomUUID()}`,
        event_type: 'CHECKOUT_CREATE_FAILED',
        provider_status: 'failed',
        payload: {
          error: errorMessage(error),
          failure_code: failure.code,
          provider_http_status: failure.providerStatus,
          planCode: debugPlanCode,
          checkoutPayload: debugPayload,
        },
        processed_at: new Date().toISOString(),
        processing_error: errorMessage(error),
      });
    } catch (debugError) {
      console.error('checkout debug insert failed:', debugError);
    }
    return jsonResponse({ error: failure.code }, failure.status, req);
  }
});
