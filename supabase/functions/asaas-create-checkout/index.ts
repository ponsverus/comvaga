import { getCorsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase.ts';

type BillingPlan = {
  code: string;
  name: string;
  price_cents: number;
  max_profissionais: number | null;
  sort_order: number;
};

const ASAAS_PROVIDER = 'asaas';
const DEFAULT_ASAAS_BASE_URL = 'https://api-sandbox.asaas.com/v3';
const DEFAULT_CHECKOUT_BASE_URL = 'https://asaas.com/checkoutSession/show';
const DEFAULT_SANDBOX_CHECKOUT_BASE_URL = 'https://sandbox.asaas.com/checkoutSession/show';

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

function checkoutUrlFor(id: string) {
  const apiBase = Deno.env.get('ASAAS_BASE_URL') || DEFAULT_ASAAS_BASE_URL;
  const defaultBase = apiBase.includes('api-sandbox.') ? DEFAULT_SANDBOX_CHECKOUT_BASE_URL : DEFAULT_CHECKOUT_BASE_URL;
  const base = Deno.env.get('ASAAS_CHECKOUT_BASE_URL') || defaultBase;
  const url = new URL(base);
  url.searchParams.set('id', id);
  return url.toString();
}

function publicSiteUrl(req: Request) {
  const configured = Deno.env.get('PUBLIC_SITE_URL') || Deno.env.get('APP_URL');
  if (configured) return configured.replace(/\/+$/, '');
  const origin = req.headers.get('origin');
  if (origin) return origin.replace(/\/+$/, '');
  throw new Error('missing_public_site_url');
}

function centsToReais(cents: number) {
  return Number((Number(cents || 0) / 100).toFixed(2));
}

function formatMoney(cents: number) {
  return `R$ ${(Number(cents || 0) / 100).toFixed(2).replace('.', ',')}`;
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

async function callAsaas(path: string, body: Record<string, unknown>, method = 'POST') {
  const apiKey = requiredEnv('ASAAS_API_KEY');
  const baseUrl = (Deno.env.get('ASAAS_BASE_URL') || DEFAULT_ASAAS_BASE_URL).replace(/\/+$/, '');

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      access_token: apiKey,
      accept: 'application/json',
      'content-type': 'application/json',
      'User-Agent': 'ComVaga/1.0',
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
    console.error('Asaas checkout error:', response.status, data || responseText);
    const asaasError = Array.isArray(data?.errors)
      ? data.errors.map((item: Record<string, unknown>) => item.description || item.message || item.code).filter(Boolean).join(' | ')
      : data?.description || data?.message || responseText || JSON.stringify(data);
    const details = String(asaasError || '').trim();
    throw new Error(`asaas_checkout_failed (${response.status}): ${details || 'empty_response'}`);
  }

  return data;
}

async function updateAsaasSubscriptionValue(subscriptionId: string, plan: BillingPlan) {
  return callAsaas(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    value: centsToReais(plan.price_cents),
    updatePendingPayments: false,
    externalReference: `comvaga-subscription:${plan.code}`,
    description: `Plano ${plan.name}`,
  }, 'PUT');
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
    if (!negocio || negocio.owner_id !== authData.user.id) return jsonResponse({ error: 'acao_nao_permitida' }, 403, req);

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

    const { data: statusData, error: statusError } = await userClient.rpc('get_business_billing_status', {
      p_negocio_id: negocioId,
    });
    if (statusError) throw statusError;

    const { data: subscription, error: subscriptionCustomerError } = await admin
      .from('business_subscriptions')
      .select('id, plan_code, provider, provider_customer_id, provider_subscription_id, current_period_start, current_period_end, current_period_price_cents, provider_current_period_end')
      .eq('negocio_id', negocioId)
      .maybeSingle();
    if (subscriptionCustomerError) throw subscriptionCustomerError;

    const existingCustomerId = String(subscription?.provider_customer_id || '').trim() || null;
    const providerSubscriptionId = String(subscription?.provider_subscription_id || '').trim() || null;
    const currentPlanCode = normalizePlanCode(statusData?.plan_code || subscription?.plan_code);
    const currentStatus = String(statusData?.status || '').toLowerCase();
    const paymentStatus = String(statusData?.payment_method_status || '').toLowerCase();
    const activePaidSubscription = currentStatus === 'active'
      && ['valid', 'none'].includes(paymentStatus)
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
        let providerPayload: Record<string, unknown> = {};
        if (String(subscription?.provider || '').toLowerCase() === ASAAS_PROVIDER && providerSubscriptionId) {
          providerPayload = {
            provider_response: await updateAsaasSubscriptionValue(providerSubscriptionId, selectedPlan),
          };
        }

        const { data: downgradeStatus, error: downgradeError } = await admin.rpc('schedule_business_plan_downgrade', {
          p_negocio_id: negocioId,
          p_plan_code: selectedPlan.code,
          p_actor_id: authData.user.id,
          p_provider_payload: providerPayload,
        });
        if (downgradeError) throw downgradeError;

        return jsonResponse({
          action: 'downgrade_scheduled',
          billing_status: downgradeStatus,
        }, 200, req);
      }

      if (selectedPlan.sort_order > typedCurrentPlan.sort_order) {
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
          let providerPayload: Record<string, unknown> = {};
          if (String(subscription?.provider || '').toLowerCase() === ASAAS_PROVIDER && providerSubscriptionId) {
            providerPayload = {
              provider_response: await updateAsaasSubscriptionValue(providerSubscriptionId, selectedPlan),
            };
          }

          const { data: upgradeStatus, error: upgradeError } = await admin.rpc('apply_paid_business_plan_upgrade', {
            p_negocio_id: negocioId,
            p_plan_code: selectedPlan.code,
            p_provider_event_id: `zero_proration_upgrade:${negocioId}:${crypto.randomUUID()}`,
            p_provider_payload: {
              action: 'zero_proration_upgrade',
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
        }

        const siteUrl = publicSiteUrl(req);
        const externalReference = `comvaga:${negocioId}:${selectedPlan.code}:upgrade`;
        const checkoutPayload: Record<string, unknown> = {
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
            description: `Diferenca proporcional do plano ${typedCurrentPlan.name} para ${selectedPlan.name}`,
            quantity: 1,
            value: centsToReais(proratedCents),
          }],
        };
        debugPayload = checkoutPayload;

        const checkout = await callAsaas('/checkouts', checkoutPayload);
        if (!checkout?.id) throw new Error('asaas_checkout_without_id');

        const checkoutEventPayload = {
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
        };
        const checkoutEventId = `checkout:${checkout.id}`;
        const { error: eventError } = await admin.rpc('record_gateway_event', {
          p_provider: ASAAS_PROVIDER,
          p_event_type: 'CHECKOUT_CREATED',
          p_payload: checkoutEventPayload,
          p_provider_event_id: checkoutEventId,
          p_negocio_id: negocioId,
          p_provider_customer_id: existingCustomerId,
          p_provider_subscription_id: providerSubscriptionId || null,
          p_provider_status: checkout?.status || null,
        });
        if (eventError) throw eventError;

        return jsonResponse({
          action: 'upgrade_proration_checkout',
          checkout_id: checkout.id,
          checkout_url: checkout.url || checkout.link || checkoutUrlFor(checkout.id),
          billing_status: statusData,
          prorated_price_cents: proratedCents,
        }, 200, req);
      }
    }

    const canOpenCheckout = (
      ['payment_grace', 'blocked', 'past_due', 'canceled'].includes(currentStatus)
      || Boolean(statusData?.cancellation_scheduled)
      || (currentStatus === 'active' && !['valid', 'none'].includes(paymentStatus))
    );

    if (!canOpenCheckout) {
      return jsonResponse({
        error: 'trial_access_active',
        billing_status: statusData,
      }, 409, req);
    }

    const siteUrl = publicSiteUrl(req);
    const externalReference = `comvaga:${negocioId}:${selectedPlan.code}`;
    const nextDueDate = asAsaasDateTime(new Date());
    const checkoutPayload: Record<string, unknown> = {
      billingTypes: ['CREDIT_CARD'],
      chargeTypes: ['RECURRENT'],
      minutesToExpire: Number(Deno.env.get('ASAAS_CHECKOUT_EXPIRES_MINUTES') || 1440),
      externalReference,
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

    const checkout = await callAsaas('/checkouts', checkoutPayload);
    if (!checkout?.id) throw new Error('asaas_checkout_without_id');

    const checkoutEventPayload = {
      checkout,
      checkout_request: {
        externalReference,
        planCode: selectedPlan.code,
        nextDueDate,
        customer: existingCustomerId,
      },
    };
    const checkoutEventId = `checkout:${checkout.id}`;
    const { error: eventError } = await admin.rpc('record_gateway_event', {
      p_provider: ASAAS_PROVIDER,
      p_event_type: 'CHECKOUT_CREATED',
      p_payload: checkoutEventPayload,
      p_provider_event_id: checkoutEventId,
      p_negocio_id: negocioId,
      p_provider_customer_id: existingCustomerId,
      p_provider_subscription_id: null,
      p_provider_status: checkout?.status || null,
    });
    if (eventError) throw eventError;

    return jsonResponse({
      checkout_id: checkout.id,
      checkout_url: checkout.url || checkout.link || checkoutUrlFor(checkout.id),
      billing_status: statusData,
    }, 200, req);
  } catch (error) {
    console.error('asaas-create-checkout failed:', error);
    try {
      await adminForDebug?.from('billing_events').insert({
        negocio_id: debugNegocioId,
        provider: ASAAS_PROVIDER,
        provider_event_id: `checkout_error:${crypto.randomUUID()}`,
        event_type: 'CHECKOUT_CREATE_FAILED',
        provider_status: 'failed',
        payload: {
          error: error?.message || 'checkout_failed',
          planCode: debugPlanCode,
          checkoutPayload: debugPayload,
        },
        processed_at: new Date().toISOString(),
        processing_error: error?.message || 'checkout_failed',
      });
    } catch (debugError) {
      console.error('checkout debug insert failed:', debugError);
    }
    return jsonResponse({ error: error?.message || 'checkout_failed' }, 400, req);
  }
});
