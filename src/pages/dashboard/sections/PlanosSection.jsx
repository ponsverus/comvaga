import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  cancelAsaasCheckout,
  cancelAsaasPlanDowngrade,
  cancelAsaasSubscription,
  createAsaasCheckout,
  fetchBillingPlans,
  recoverAsaasSubscriptionPayment,
  setBusinessPlan,
} from '../api/dashboardApi';
import { getRequestErrorKey } from '../../../utils/requestError';
import { useFeedback } from '../../../feedback/useFeedback';
import { ptBR } from '../../../feedback/messages/ptBR.js';
import { isCancellationScheduled, isScheduledDowngradeSync } from '../utils';
function getByPath(obj, path) {
  const parts = String(path || '').split('.');
  let cur = obj;
  for (const part of parts) {
    if (!cur || typeof cur !== 'object') return null;
    cur = cur[part];
  }
  return cur || null;
}

function interpolateMessage(value, params) {
  return String(value || '').replace(/\{(\w+)\}/g, (_, key) => {
    const next = params?.[key];
    return next === undefined || next === null ? '' : String(next);
  });
}

function messageBody(key, params) {
  const entry = getByPath(ptBR, key);
  return interpolateMessage(entry?.body || '', params);
}

function formatCurrencyFromCents(value) {
  return `R$ ${(Number(value || 0) / 100).toFixed(2).replace('.', ',')}`;
}

function getAccessEndDate(status) {
  return status?.access_ends_label || '';
}

function getAccessDateLabel(status) {
  if (!getAccessEndDate(status)) return '';
  if (isCancellationScheduled(status)) return 'ACESSO ATÉ';

  const current = String(status?.status || '').toLowerCase();
  const paymentStatus = String(status?.payment_method_status || '').toLowerCase();

  if (current === 'active' && paymentStatus === 'valid') return 'RENOVA';
  if (current === 'canceled') return 'ENCERRADO';
  if (['blocked', 'past_due', 'payment_grace'].includes(current)) return 'VENCEU';
  return 'PERÍODO ATÉ';
}

function isCanceledOrCancellationScheduled(status) {
  return String(status?.status || '').toLowerCase() === 'canceled' || isCancellationScheduled(status);
}

const TERMINAL_SUBSCRIPTION_STATUSES = new Set(['INACTIVE', 'EXPIRED', 'CANCELED', 'CANCELLED', 'DELETED']);

function hasPaymentHistory(status) {
  return Boolean(
    status?.provider_subscription_id
    || status?.current_period_start
    || status?.current_period_end
    || Number(status?.current_period_price_cents || 0) > 0
  );
}

function canRequestSubscriptionInvoice(status) {
  const current = String(status?.status || '').toLowerCase();
  const providerStatus = String(status?.provider_status || '').toUpperCase();
  return String(status?.provider || '').toLowerCase() === 'asaas'
    && Boolean(status?.provider_subscription_id)
    && !status?.cancellation_scheduled
    && !TERMINAL_SUBSCRIPTION_STATUSES.has(providerStatus)
    && ['blocked', 'past_due', 'payment_grace', 'active'].includes(current)
    && ['failed', 'expired'].includes(String(status?.payment_method_status || '').toLowerCase())
    && !status?.has_active_checkout
    && !status?.provider_sync_pending
    && !status?.plan_change_scheduled;
}

function statusText(status) {
  if (isCancellationScheduled(status)) return 'Cancelado';
  const current = String(status?.status || '').toLowerCase();
  if (current === 'active') return 'Ativo';
  if (current === 'trialing') return 'Teste grátis';
  if (current === 'past_due') return 'Pagamento pendente';
  if (current === 'blocked') return 'Agenda bloqueada';
  if (current === 'payment_grace') return 'Pagamento necessário';
  if (current === 'canceled') return 'Cancelado';
  return 'Config.';
}

function statusBadgeClass(status) {
  if (isCancellationScheduled(status)) {
    return 'border-yellow-400/30 bg-yellow-400/10 text-yellow-200';
  }

  const current = String(status?.status || '').toLowerCase();
  const paymentStatus = String(status?.payment_method_status || '').toLowerCase();

  if (current === 'active' && paymentStatus === 'valid') {
    return 'border-green-400/30 bg-green-400/10 text-green-300';
  }
  if (current === 'trialing') {
    return 'border-primary/30 bg-primary/10 text-primary';
  }
  if (current === 'payment_grace') {
    return 'border-yellow-400/30 bg-yellow-400/10 text-yellow-200';
  }
  if (current === 'blocked' || current === 'past_due') {
    return 'border-red-400/30 bg-red-400/10 text-red-200';
  }
  if (current === 'canceled') {
    return 'border-gray-500/30 bg-gray-500/10 text-gray-300';
  }

  return 'border-gray-500/30 bg-gray-500/10 text-gray-300';
}

function statusButtonText(status) {
  if (isCancellationScheduled(status)) return 'Reativar plano';
  if (status?.provider_sync_pending) return 'Aguarde atualiza.';
  if (status?.has_active_checkout) return 'Pagamento em andamento';
  if (status?.plan_change_scheduled) return 'Troca agendada';
  if (canRequestSubscriptionInvoice(status)) return 'Regularizar pagamento';

  const current = String(status?.status || '').toLowerCase();
  if (['blocked', 'past_due', 'payment_grace'].includes(current)) {
    return hasPaymentHistory(status) ? 'Regularizar pagamento' : 'Adicionar pagamento';
  }
  if (current === 'canceled') return 'Reativar plano';
  return 'Adicionar pagamento';
}

function statusButtonClass(status) {
  if (isCancellationScheduled(status)) {
    return 'rounded-full border border-primary text-primary px-5 py-2.5 text-xs font-normal uppercase tracking-wider hover:bg-primary/10';
  }

  const current = String(status?.status || '').toLowerCase();
  if (current === 'blocked' || current === 'past_due') {
    return 'rounded-full bg-yellow-400 px-5 py-2.5 text-xs font-normal uppercase tracking-wider text-black hover:bg-yellow-300';
  }
  if (current === 'payment_grace' || current === 'trialing') {
    return 'rounded-full bg-primary px-5 py-2.5 text-xs font-normal uppercase tracking-wider text-black hover:bg-primary/90';
  }
  return 'rounded-full border border-primary text-primary px-5 py-2.5 text-xs font-normal uppercase tracking-wider hover:bg-primary/10';
}

function getPlanCancelErrorMessage(error) {
  const raw = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  if (raw.includes('subscription_not_cancelable')) {
    return messageBody('dashboard.billing_cancel_not_cancelable');
  }
  if (raw.includes('checkout_in_progress') || raw.includes('plan_downgrade_pending') || raw.includes('provider_sync_in_progress')) {
    return messageBody('dashboard.billing_provider_sync_in_progress');
  }
  if (raw.includes('asaas_cancel_failed')) {
    return messageBody('dashboard.billing_cancel_gateway_error');
  }
  return messageBody('dashboard.billing_cancel_error');
}

function getDowngradeCancelErrorMessage(error) {
  const raw = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  if (raw.includes('plan_downgrade_not_scheduled')) {
    return messageBody('dashboard.billing_cancel_downgrade_unavailable');
  }
  if (raw.includes('provider_sync_in_progress')) {
    return messageBody('dashboard.billing_provider_sync_in_progress');
  }
  return messageBody('dashboard.billing_cancel_downgrade_error');
}

function getPlanChangeErrorMessage(error) {
  const raw = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  if (raw.includes('future_plan_professional_limit_reached')) {
    return messageBody('dashboard.future_plan_professional_limit_reached');
  }
  if (raw.includes('plan_professional_limit_reached')) {
    return messageBody('dashboard.plan_professional_limit_reached');
  }
  if (
    raw.includes('checkout_reconciliation_pending')
    || raw.includes('checkout_session_reconciliation_pending')
    || raw.includes('checkout_session_unknown')
    || raw.includes('checkout_session_creating')
  ) {
    return messageBody('dashboard.billing_checkout_reconciliation_pending');
  }
  if (raw.includes('checkout_conflict') || raw.includes('checkout_session_conflict')) {
    return messageBody('dashboard.billing_checkout_conflict');
  }
  if (raw.includes('checkout_in_progress') || raw.includes('checkout_session_in_progress')) {
    return messageBody('dashboard.billing_checkout_in_progress');
  }
  if (raw.includes('provider_subscription_recovery_required')) {
    return messageBody('dashboard.billing_existing_subscription_recovery');
  }
  if (raw.includes('subscription_overdue_payment_not_found')) {
    return messageBody('dashboard.billing_recovery_invoice_not_found');
  }
  if (raw.includes('multiple_overdue_subscription_payments')) {
    return messageBody('dashboard.billing_recovery_multiple_invoices');
  }
  if (raw.includes('subscription_recovery_unavailable') || raw.includes('subscription_invoice_unavailable') || raw.includes('subscription_not_recoverable') || raw.includes('subscription_state_changed')) {
    return messageBody('dashboard.billing_recovery_invoice_not_found');
  }
  if (raw.includes('plan_downgrade_pending')) {
    return messageBody('dashboard.billing_plan_movement_pending');
  }
  if (raw.includes('provider_sync_in_progress')) {
    return messageBody('dashboard.billing_provider_sync_in_progress');
  }
  if (raw.includes('asaas_checkout_failed')) {
    return messageBody('dashboard.billing_checkout_error');
  }
  return messageBody('dashboard.billing_plan_change_error');
}


function getCheckoutCancelErrorMessage(error) {
  const raw = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  if (raw.includes('checkout_creation_in_progress')) {
    return messageBody('dashboard.billing_checkout_cancel_wait');
  }
  if (raw.includes('payment_already_confirmed')) {
    return messageBody('dashboard.billing_checkout_payment_confirmed');
  }
  if (raw.includes('checkout_not_found')) {
    return messageBody('dashboard.billing_checkout_not_found');
  }
  if (raw.includes('asaas_checkout_cancel_failed')) {
    return messageBody('dashboard.billing_checkout_cancel_gateway_error');
  }
  return messageBody('dashboard.billing_checkout_cancel_error');
}
function getPlanLimit(plan) {
  if (plan?.max_profissionais == null) return null;
  const value = Number(plan.max_profissionais);
  return Number.isFinite(value) ? value : null;
}

function getPlanLimitMessage(plan, count) {
  const limit = getPlanLimit(plan);
  if (limit == null) return '';
  return messageBody('dashboard.plan_professional_limit_current', {
    count,
    limit,
    professionalsLabel: limit === 1 ? 'profissional ativo ou pendente' : 'profissionais ativos ou pendentes',
  });
}

function getCapacityLabel(plan) {
  const limit = getPlanLimit(plan);
  if (limit == null) return 'Profissionais ilimitados';
  return limit === 1 ? '1 profissional' : `Até ${limit} profissionais`;
}

const PLAN_CONTENT = {
  essencial: {
    label: 'Essencial',
    oldPriceLabel: null,
    priceClass: 'text-white',
    buttonText: 'Selecionar Essencial',
    buttonClass: 'bg-transparent border border-primary text-primary hover:bg-primary/10',
  },
  profissional: {
    label: 'Profissional',
    oldPriceLabel: 'R$ 99,99',
    priceClass: 'text-green-400',
    buttonText: 'Selecionar plano',
    buttonClass: 'bg-gradient-to-r from-primary to-yellow-600 text-black hover:shadow-lg hover:shadow-primary/30',
  },
  premium: {
    label: 'Premium',
    oldPriceLabel: null,
    priceClass: 'text-white',
    buttonText: 'Selecionar Premium',
    buttonClass: 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-100 hover:shadow-lg hover:shadow-zinc-700/30',
  },
};

export default function PlanosSection({
  negocioId,
  profissionais = [],
  billingStatus = null,
  billingLoading = false,
  onBillingStatusChange,
  reloadBillingStatus,
}) {
  const feedback = useFeedback();
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState('');
  const [cancelingPlan, setCancelingPlan] = useState('');
  const [cancelingDowngrade, setCancelingDowngrade] = useState(false);
  const [cancelingCheckout, setCancelingCheckout] = useState(false);
  const [error, setError] = useState('');

  const loadPlans = useCallback(async () => {
    if (!negocioId) {
      setPlans([]);
      setPlansLoading(false);
      return;
    }
    setPlansLoading(true);
    setError('');
    try {
      const plansData = await fetchBillingPlans();
      setPlans(plansData);
    } catch (err) {
      console.error('PlanosSection load error:', err);
      const requestKey = getRequestErrorKey(err);
      if (requestKey === 'alerts.request_timeout') {
        setError(messageBody('alerts.request_timeout'));
      } else if (requestKey === 'alerts.rate_limit_exceeded') {
        setError(messageBody('alerts.rate_limit_exceeded'));
      } else {
        setError(messageBody('dashboard.billing_plans_load_error'));
      }
    } finally {
      setPlansLoading(false);
    }
  }, [negocioId]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const loading = plansLoading || billingLoading;
  const currentPlanCode = billingStatus?.plan_code || '';
  const canceledOrCancellationScheduled = isCanceledOrCancellationScheduled(billingStatus);
  const planChangeScheduled = Boolean(billingStatus?.plan_change_scheduled);
  const pendingPlanDate = billingStatus?.pending_plan_effective_label || '';
  const activeCheckoutPlanCode = billingStatus?.active_checkout_plan_code || '';
  const activeCheckoutUrl = billingStatus?.active_checkout_url || '';
  const hasActiveCheckout = Boolean(billingStatus?.has_active_checkout && activeCheckoutPlanCode);
  const providerSyncPending = Boolean(billingStatus?.provider_sync_pending);
  const providerSyncFailed = String(billingStatus?.provider_sync_status || '').toLowerCase() === 'failed';
  const replaceableScheduledDowngrade = isScheduledDowngradeSync(billingStatus);
  const accessEndDate = getAccessEndDate(billingStatus);
  const accessDateLabel = getAccessDateLabel(billingStatus);
  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.code === currentPlanCode) || null,
    [currentPlanCode, plans]
  );
  const billableProfessionalsCount = useMemo(
    () => profissionais.filter((item) => ['ativo', 'pendente'].includes(String(item?.status || '').toLowerCase())).length,
    [profissionais]
  );

  const handleSelectPlan = async (planCode) => {
    if (!negocioId || savingPlan || cancelingCheckout) return;
    const targetPlan = plans.find((plan) => plan.code === planCode);
    const replacingDowngrade = replaceableScheduledDowngrade
      && selectedPlan
      && targetPlan
      && planCode !== billingStatus?.pending_plan_code
      && Number(targetPlan.sort_order) < Number(selectedPlan.sort_order);
    if (providerSyncPending && !replacingDowngrade) {
      setError(messageBody('dashboard.billing_provider_sync_in_progress'));
      return;
    }
    const targetLimit = getPlanLimit(targetPlan);
    if (targetLimit != null && billableProfessionalsCount > targetLimit) {
      setError(getPlanLimitMessage(targetPlan, billableProfessionalsCount));
      return;
    }
    if (hasActiveCheckout && activeCheckoutPlanCode === planCode && activeCheckoutUrl) {
      window.location.assign(activeCheckoutUrl);
      return;
    }

    const currentStatus = String(billingStatus?.status || '').toLowerCase();
    const freeAccessOpen = currentStatus === 'trialing';
    const recoverExistingSubscription = canRequestSubscriptionInvoice(billingStatus);

    setSavingPlan(planCode);
    setError('');
    try {
      if (freeAccessOpen) {
        const result = await setBusinessPlan(negocioId, planCode);
        if (result) {
          onBillingStatusChange?.(result);
        }
      } else if (planCode === currentPlanCode && recoverExistingSubscription) {
        const recovery = await recoverAsaasSubscriptionPayment(negocioId);
        window.location.assign(recovery.invoice_url);
      } else {
        const checkout = await createAsaasCheckout(negocioId, planCode);
        if (checkout?.billing_status) {
          onBillingStatusChange?.(checkout.billing_status);
        }
        if (checkout?.checkout_url) {
          window.location.assign(checkout.checkout_url);
        }
      }
    } catch (err) {
      console.error(freeAccessOpen ? 'setBusinessPlan error:' : 'createAsaasCheckout error:', err);
      const requestKey = getRequestErrorKey(err);
      if (requestKey === 'alerts.request_timeout') {
        setError(freeAccessOpen ? messageBody('dashboard.billing_plan_change_error') : messageBody('dashboard.billing_checkout_timeout'));
      } else if (requestKey === 'alerts.rate_limit_exceeded') {
        setError(messageBody('alerts.rate_limit_exceeded'));
      } else {
        setError(getPlanChangeErrorMessage(err));
      }
    } finally {
      setSavingPlan('');
    }
  };

  const handleCancelPlan = async (planCode) => {
    if (!negocioId || savingPlan || cancelingPlan || cancelingCheckout) return;
    if (hasActiveCheckout || providerSyncPending) {
      setError(hasActiveCheckout ? messageBody('dashboard.billing_checkout_in_progress') : messageBody('dashboard.billing_provider_sync_in_progress'));
      return;
    }
    const confirmed = await feedback.confirm('dashboard.billing_cancel_confirm');
    if (!confirmed) return;

    setCancelingPlan(planCode);
    setError('');
    try {
      const result = await cancelAsaasSubscription(negocioId);
      if (result?.billing_status) {
        onBillingStatusChange?.(result.billing_status);
      } else {
        await reloadBillingStatus?.();
      }
    } catch (err) {
      console.error('cancelAsaasSubscription error:', err);
      const requestKey = getRequestErrorKey(err);
      if (requestKey === 'alerts.request_timeout') {
        setError(messageBody('dashboard.billing_cancel_timeout'));
      } else if (requestKey === 'alerts.rate_limit_exceeded') {
        setError(messageBody('alerts.rate_limit_exceeded'));
      } else {
        setError(getPlanCancelErrorMessage(err));
      }
    } finally {
      setCancelingPlan('');
    }
  };

  const handleCancelDowngrade = async () => {
    if (!negocioId || savingPlan || cancelingPlan || cancelingDowngrade || cancelingCheckout) return;
    const confirmed = await feedback.confirm('dashboard.billing_cancel_downgrade_confirm');
    if (!confirmed) return;

    setCancelingDowngrade(true);
    setError('');
    try {
      const result = await cancelAsaasPlanDowngrade(negocioId);
      if (result?.billing_status) {
        onBillingStatusChange?.(result.billing_status);
      } else {
        await reloadBillingStatus?.();
      }
    } catch (err) {
      console.error('cancelAsaasPlanDowngrade error:', err);
      const requestKey = getRequestErrorKey(err);
      if (requestKey === 'alerts.request_timeout') {
        setError(messageBody('dashboard.billing_cancel_timeout'));
      } else if (requestKey === 'alerts.rate_limit_exceeded') {
        setError(messageBody('alerts.rate_limit_exceeded'));
      } else {
        setError(getDowngradeCancelErrorMessage(err));
      }
    } finally {
      setCancelingDowngrade(false);
    }
  };


  const handleCancelCheckout = async () => {
    if (!negocioId || savingPlan || cancelingPlan || cancelingDowngrade || cancelingCheckout) return;
    const confirmed = await feedback.confirm('dashboard.billing_cancel_checkout_confirm');
    if (!confirmed) return;

    setCancelingCheckout(true);
    setError('');
    try {
      const result = await cancelAsaasCheckout(negocioId);
      if (result?.billing_status) {
        onBillingStatusChange?.(result.billing_status);
      } else {
        await reloadBillingStatus?.();
      }
    } catch (err) {
      console.error('cancelAsaasCheckout error:', err);
      const requestKey = getRequestErrorKey(err);
      if (requestKey === 'alerts.request_timeout') {
        setError(messageBody('dashboard.billing_cancel_timeout'));
      } else if (requestKey === 'alerts.rate_limit_exceeded') {
        setError(messageBody('alerts.rate_limit_exceeded'));
      } else {
        setError(getCheckoutCancelErrorMessage(err));
      }
    } finally {
      setCancelingCheckout(false);
    }
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center py-14 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        CARREGANDO PLANOS...
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-2xl font-normal text-white">PLANOS</h2>
        {accessEndDate && accessDateLabel && (
          <span className="inline-flex min-h-[32px] items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-normal uppercase tracking-wide text-gray-300">
            {accessDateLabel}: <span className="ml-1 text-primary">{accessEndDate}</span>
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-custom border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="-mx-6 -mb-6 bg-gray-800 border-t border-gray-800 grid grid-cols-1 lg:grid-cols-3 gap-px">
        {plans.map((plan) => {
          const active = plan.code === currentPlanCode;
          const pendingForPlan = planChangeScheduled && billingStatus?.pending_plan_code === plan.code;
          const checkoutForPlan = hasActiveCheckout && activeCheckoutPlanCode === plan.code;
          const checkoutCanResume = checkoutForPlan && Boolean(activeCheckoutUrl);
          const checkoutBlocksPlan = hasActiveCheckout && !checkoutCanResume;
          const replacementDowngradeAllowed = replaceableScheduledDowngrade
            && selectedPlan
            && !active
            && !pendingForPlan
            && Number(plan.sort_order) < Number(selectedPlan.sort_order);
          const movementBlocked = (providerSyncPending && !replacementDowngradeAllowed) || checkoutBlocksPlan;
          const saving = savingPlan === plan.code;
          const canceling = cancelingPlan === plan.code;
          const paymentStatus = String(billingStatus?.payment_method_status || '').toLowerCase();
          const currentStatus = String(billingStatus?.status || '').toLowerCase();
          const freeAccessOpen = currentStatus === 'trialing';
          const selectedCanceledOrCancellationScheduled = active && canceledOrCancellationScheduled;
          const canCancelDowngrade = active
            && !providerSyncFailed
            && Boolean(billingStatus?.can_cancel_plan_downgrade);
          const canCancel = active
            && !selectedCanceledOrCancellationScheduled
            && Boolean(billingStatus?.can_cancel_subscription);
          const activeFreeAccess = active && freeAccessOpen;
          const needsPayment = active
            && !activeFreeAccess
            && paymentStatus !== 'valid';
          const planChangeBlocksPayment = active && needsPayment && planChangeScheduled;
          const activeWithoutAction = active && !activeFreeAccess && !needsPayment && !selectedCanceledOrCancellationScheduled;
          const planLimit = getPlanLimit(plan);
          const planLimitBlocked = !active && planLimit != null && billableProfessionalsCount > planLimit;
          const selectedStatusLabel = statusText(billingStatus);
          const selectedStatusClass = statusBadgeClass(billingStatus);
          const selectedPaymentButtonText = statusButtonText(billingStatus);
          const selectedPaymentButtonClass = statusButtonClass(billingStatus);
          const content = PLAN_CONTENT[plan.code] || {
            label: plan.name,
            oldPriceLabel: null,
            priceClass: 'text-white',
            buttonText: 'Selecionar plano',
            buttonClass: 'bg-transparent border border-primary text-primary hover:bg-primary/10',
          };

          const hasOferta = Boolean(content.oldPriceLabel);
          const showStatusBadge = active;
          const showOfertaBadge = hasOferta && !showStatusBadge;
          const primaryButtonLabel = planLimitBlocked
            ? 'Limite excedido'
            : pendingForPlan
              ? 'Agendado'
              : activeFreeAccess
                ? 'Teste grátis'
                : activeWithoutAction
                  ? 'Plano ativo'
                  : saving
                    ? (freeAccessOpen ? 'Salvando...' : canRequestSubscriptionInvoice(billingStatus) ? 'Verificando fatura...' : 'Abrindo checkout...')
                    : checkoutCanResume
                      ? 'Continuar pagamento'
                      : active && (needsPayment || selectedCanceledOrCancellationScheduled)
                        ? selectedPaymentButtonText
                        : content.buttonText;
          const buttonItems = [
            {
              key: 'primary',
              label: primaryButtonLabel,
              node: (
                <button
                  type="button"
                  disabled={planLimitBlocked || movementBlocked || planChangeBlocksPayment || (!checkoutCanResume && (activeWithoutAction || activeFreeAccess || pendingForPlan)) || !!savingPlan || !!cancelingPlan || cancelingDowngrade || cancelingCheckout}
                  onClick={() => handleSelectPlan(plan.code)}
                  className={`flex min-h-[42px] w-full items-center justify-center gap-2 px-5 py-2.5 text-xs font-normal uppercase tracking-wider rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                    activeFreeAccess
                      ? 'cursor-default border border-primary/40 bg-primary/10 text-primary'
                      : activeWithoutAction
                        ? 'cursor-default border border-green-400/30 bg-green-400/10 text-green-300'
                        : checkoutCanResume
                          ? 'border border-yellow-400/40 bg-yellow-400/10 text-yellow-100 hover:bg-yellow-400/15'
                          : active && (needsPayment || selectedCanceledOrCancellationScheduled)
                            ? selectedPaymentButtonClass
                            : content.buttonClass
                  }`}
                >
                  {primaryButtonLabel}
                </button>
              ),
            },
            checkoutForPlan
              ? {
                key: 'cancel-checkout',
                label: cancelingCheckout ? 'Cancelando pagamento...' : 'Cancelar pagamento pendente',
                node: (
                  <button
                    type="button"
                    disabled={!!savingPlan || !!cancelingPlan || cancelingDowngrade || cancelingCheckout}
                    onClick={handleCancelCheckout}
                    className="flex w-full items-center justify-center rounded-full border border-yellow-400/40 bg-yellow-400/10 px-5 py-2.5 text-xs font-normal uppercase tracking-wider text-yellow-100 transition-all hover:bg-yellow-400/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {cancelingCheckout ? 'Cancelando pagamento...' : 'Cancelar pagamento pendente'}
                  </button>
                ),
              }
              : null,
            canCancel
              ? {
                key: 'cancel-plan',
                label: canceling ? 'Cancelando...' : 'Cancelar plano',
                node: (
                  <button
                    type="button"
                    disabled={!!savingPlan || !!cancelingPlan || cancelingDowngrade || cancelingCheckout || hasActiveCheckout || providerSyncPending}
                    onClick={() => handleCancelPlan(plan.code)}
                    className="flex w-full items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 px-5 py-2.5 text-xs font-normal uppercase tracking-wider text-red-300 transition-all hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {canceling ? 'Cancelando...' : 'Cancelar plano'}
                  </button>
                ),
              }
              : null,
            canCancelDowngrade
              ? {
                key: 'cancel-downgrade',
                label: cancelingDowngrade ? 'Cancelando downgrade...' : 'Cancelar downgrade',
                node: (
                  <button
                    type="button"
                    disabled={!!savingPlan || !!cancelingPlan || cancelingDowngrade || cancelingCheckout}
                    onClick={handleCancelDowngrade}
                    className="flex w-full items-center justify-center rounded-full border border-yellow-400/40 bg-yellow-400/10 px-5 py-2.5 text-xs font-normal uppercase tracking-wider text-yellow-100 transition-all hover:bg-yellow-400/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {cancelingDowngrade ? 'Cancelando downgrade...' : 'Cancelar downgrade'}
                  </button>
                ),
              }
              : null,
          ].filter(Boolean);
          const orderedButtonItems = buttonItems.length >= 3
            ? (() => {
              const longestIndex = buttonItems.reduce((bestIndex, item, index, list) => (
                item.label.length > list[bestIndex].label.length ? index : bestIndex
              ), 0);
              const longest = buttonItems[longestIndex];
              return [
                ...buttonItems.slice(0, longestIndex),
                ...buttonItems.slice(longestIndex + 1),
                longest,
              ];
            })()
            : buttonItems;
          const compactButtonGrid = orderedButtonItems.length >= 3;

          return (
            <div
              key={plan.code}
              className={[
                'bg-dark-200 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-8 transition-all',
                plan.code === 'profissional'
                  ? 'bg-primary/10 border-l-4 border-l-primary shadow-lg shadow-primary/10'
                  : '',
              ].join(' ')}
            >
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="inline-block rounded-full bg-white/10 border border-white/10 px-3 py-1 text-[10px] font-normal uppercase tracking-widest text-gray-300">
                    {content.label}
                  </span>

                  {showStatusBadge && (
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-normal uppercase tracking-wide ${selectedStatusClass}`}>
                      {selectedStatusLabel}
                    </span>
                  )}

                  {showOfertaBadge && (
                    <span className="inline-flex items-center rounded-full bg-green-500/20 border border-green-500/30 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-green-400">
                      OFERTA
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-lg md:text-xl font-normal uppercase text-primary mb-2">
                    {getCapacityLabel(plan)}
                  </p>
                  <div className="flex items-end gap-x-3 gap-y-1 flex-wrap">
                    {content.oldPriceLabel && (
                      <span className="text-base font-normal text-red-500 line-through decoration-red-500 decoration-2">
                        {content.oldPriceLabel}
                      </span>
                    )}
                    <span className={`text-xl font-normal ${content.priceClass}`}>
                      {formatCurrencyFromCents(plan.price_cents)}
                      <span className="text-sm font-normal text-gray-500">/mês</span>
                    </span>
                  </div>

                  {pendingForPlan && (
                    <p className="mt-3 rounded-custom border border-yellow-400/25 bg-yellow-400/10 px-3 py-2 text-xs font-normal uppercase tracking-wide text-yellow-100">
                      Troca agendada{pendingPlanDate ? ` para ${pendingPlanDate}` : ''}
                    </p>
                  )}

                </div>
              </div>

              <div className={compactButtonGrid ? 'space-y-2' : 'flex flex-col gap-3'}>
                {compactButtonGrid ? (
                  <>
                    <div className="flex gap-2">
                      {orderedButtonItems.slice(0, 2).map((item) => (
                        <div key={item.key} className="min-w-0 flex-1">
                          {item.node}
                        </div>
                      ))}
                    </div>
                    {orderedButtonItems.slice(2).map((item) => (
                      <Fragment key={item.key}>{item.node}</Fragment>
                    ))}
                  </>
                ) : (
                  orderedButtonItems.map((item) => (
                    <Fragment key={item.key}>{item.node}</Fragment>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
