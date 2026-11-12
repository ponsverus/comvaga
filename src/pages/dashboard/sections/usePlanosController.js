import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  cancelAsaasCheckout,
  cancelAsaasPlanDowngrade,
  cancelAsaasSubscription,
  createAsaasCheckout,
  fetchBillingPlans,
  recoverAsaasSubscriptionPayment,
  reactivateAsaasSubscription,
  setBusinessPlan,
} from '../api/dashboardApi';
import { getRequestErrorKey } from '../../../utils/requestError';
import { useFeedback } from '../../../feedback/useFeedback';
import { isScheduledDowngradeSync } from '../utils';
import {
  billingRateLimitMessage,
  getAccessDateLabel,
  getAccessEndDate,
  getCheckoutCancelErrorMessage,
  getDowngradeCancelErrorMessage,
  getPlanCancelErrorMessage,
  getPlanChangeErrorMessage,
  getPlanLimit,
  getPlanLimitMessage,
  isCanceledOrCancellationScheduled,
  messageBody,
  SUSPENDED_SUBSCRIPTION_STATUSES,
} from './planRules';

export function usePlanosController({
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
  const [plansLoadFailed, setPlansLoadFailed] = useState(false);
  const [savingPlan, setSavingPlan] = useState('');
  const [cancelingPlan, setCancelingPlan] = useState('');
  const [cancelingDowngrade, setCancelingDowngrade] = useState(false);
  const [cancelingCheckout, setCancelingCheckout] = useState(false);
  const showPlanAlert = useCallback((body, variant = 'danger') => {
    feedback.showCustom({ title: 'Planos', body, variant, screen: 'dark', buttonText: 'OK' });
  }, [feedback]);

  const loadPlans = useCallback(async () => {
    if (!negocioId) {
      setPlans([]);
      setPlansLoading(false);
      return;
    }
    setPlansLoading(true);
    setPlansLoadFailed(false);
    try {
      const plansData = await fetchBillingPlans();
      setPlans(plansData);
    } catch (err) {
      console.error('PlanosSection load error:', err);
      const requestKey = getRequestErrorKey(err);
      if (requestKey === 'alerts.request_timeout') {
        showPlanAlert(messageBody('alerts.request_timeout'));
      } else if (requestKey === 'alerts.rate_limit_exceeded') {
        showPlanAlert(messageBody('alerts.rate_limit_exceeded'));
      } else {
        showPlanAlert(messageBody('dashboard.billing_plans_load_error'));
      }
      setPlansLoadFailed(true);
    } finally {
      setPlansLoading(false);
    }
  }, [negocioId, showPlanAlert]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const loading = plansLoading || billingLoading;
  const currentPlanCode = billingStatus?.plan_code || '';
  const canceledOrCancellationScheduled = isCanceledOrCancellationScheduled(billingStatus);
  const suspendedWithDebt = SUSPENDED_SUBSCRIPTION_STATUSES.has(String(billingStatus?.provider_status || '').toUpperCase())
    && Number(billingStatus?.due_charge_count || 0) > 0;

  useEffect(() => {
    if (!suspendedWithDebt || loading || plansLoadFailed) return;
    const providerStatus = String(billingStatus?.provider_status || '').toUpperCase();
    feedback.showMessage(providerStatus === 'EXPIRED'
      ? 'dashboard.billing_subscription_expired_with_debt'
      : 'dashboard.billing_subscription_suspended_with_debt');
  }, [billingStatus?.provider_status, feedback, loading, plansLoadFailed, suspendedWithDebt]);
  const planChangeScheduled = Boolean(billingStatus?.plan_change_scheduled);
  const pendingPlanDate = billingStatus?.pending_plan_effective_label || '';
  const activeCheckoutPlanCode = billingStatus?.active_checkout_plan_code || '';
  const activeCheckoutStatus = String(billingStatus?.active_checkout_status || '').toLowerCase();
  const activeCheckoutUrl = billingStatus?.active_checkout_url || '';
  const hasActiveCheckout = Boolean(billingStatus?.has_active_checkout && activeCheckoutPlanCode);
  const canCancelCheckout = hasActiveCheckout && billingStatus?.can_cancel_checkout === true;
  const billingActionPending = Boolean(billingStatus?.billing_action_pending);
  const canRequestInvoice = billingStatus?.can_request_subscription_invoice === true;
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
    const recoveringCurrentInvoice = planCode === currentPlanCode && canRequestInvoice;
    if (!negocioId || savingPlan || cancelingCheckout || (billingActionPending && !recoveringCurrentInvoice)) return;
    const targetPlan = plans.find((plan) => plan.code === planCode);
    const replacingDowngrade = replaceableScheduledDowngrade
      && selectedPlan
      && targetPlan
      && planCode !== billingStatus?.pending_plan_code
      && Number(targetPlan.sort_order) < Number(selectedPlan.sort_order);
    if (providerSyncPending && !replacingDowngrade && !recoveringCurrentInvoice) {
      showPlanAlert(messageBody('dashboard.billing_provider_sync_in_progress'), 'warning');
      return;
    }
    const targetLimit = getPlanLimit(targetPlan);
    if (targetLimit != null && billableProfessionalsCount > targetLimit
      && !(planCode === currentPlanCode && canRequestInvoice)) {
      showPlanAlert(getPlanLimitMessage(targetPlan, billableProfessionalsCount), 'warning');
      return;
    }

    const currentStatus = String(billingStatus?.status || '').toLowerCase();
    const providerStatus = String(billingStatus?.provider_status || '').toUpperCase();
    const freeAccessOpen = currentStatus === 'trialing';
    const recoverExistingSubscription = canRequestInvoice;
    const resumeCheckout = hasActiveCheckout && activeCheckoutPlanCode === planCode;

    setSavingPlan(planCode);
    try {
      if (planCode === currentPlanCode && recoverExistingSubscription) {
        const recovery = await recoverAsaasSubscriptionPayment(negocioId);
        window.location.assign(recovery.invoice_url);
      } else if (freeAccessOpen && !resumeCheckout) {
        const result = await setBusinessPlan(negocioId, planCode);
        if (result) {
          onBillingStatusChange?.(result);
        }
      } else if (planCode === currentPlanCode && providerStatus === 'INACTIVE' && !resumeCheckout) {
        const result = await reactivateAsaasSubscription(negocioId);
        onBillingStatusChange?.(result.billing_status);
        if (result.invoice_url) {
          window.location.assign(result.invoice_url);
        } else if (result.action === 'awaiting_payment') {
          showPlanAlert(messageBody('dashboard.billing_reactivation_awaiting_payment'), 'warning');
        } else {
          showPlanAlert(messageBody('dashboard.billing_reactivation_success'), 'success');
        }
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
      console.error('Billing plan action failed:', err);
      if (err?.payload?.billing_status) {
        onBillingStatusChange?.(err.payload.billing_status);
      } else {
        try { await reloadBillingStatus?.(); } catch (refreshError) {
          console.error('billing status refresh failed:', refreshError);
        }
      }
      const requestKey = getRequestErrorKey(err);
      if (requestKey === 'alerts.request_timeout') {
        showPlanAlert(freeAccessOpen ? messageBody('dashboard.billing_plan_change_error') : messageBody('dashboard.billing_checkout_timeout'));
      } else if (requestKey === 'alerts.rate_limit_exceeded') {
        showPlanAlert(billingRateLimitMessage(err), 'warning');
      } else {
        showPlanAlert(getPlanChangeErrorMessage(err));
      }
    } finally {
      setSavingPlan('');
    }
  };

  const handleCancelPlan = async (planCode) => {
    if (!negocioId || savingPlan || cancelingPlan || cancelingCheckout || billingActionPending) return;
    if (hasActiveCheckout || providerSyncPending) {
      showPlanAlert(hasActiveCheckout ? messageBody('dashboard.billing_checkout_in_progress') : messageBody('dashboard.billing_provider_sync_in_progress'), 'warning');
      return;
    }
    const confirmed = await feedback.confirm('dashboard.billing_cancel_confirm');
    if (!confirmed) return;

    setCancelingPlan(planCode);
    try {
      const result = await cancelAsaasSubscription(negocioId);
      if (result?.billing_status) {
        onBillingStatusChange?.(result.billing_status);
      } else {
        await reloadBillingStatus?.();
      }
    } catch (err) {
      console.error('cancelAsaasSubscription error:', err);
      try { await reloadBillingStatus?.(); } catch (refreshError) {
        console.error('cancel billing status refresh failed:', refreshError);
      }
      const requestKey = getRequestErrorKey(err);
      if (requestKey === 'alerts.request_timeout') {
        showPlanAlert(messageBody('dashboard.billing_cancel_timeout'));
      } else if (requestKey === 'alerts.rate_limit_exceeded') {
        showPlanAlert(billingRateLimitMessage(err), 'warning');
      } else {
        showPlanAlert(getPlanCancelErrorMessage(err));
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
        showPlanAlert(messageBody('dashboard.billing_cancel_timeout'));
      } else if (requestKey === 'alerts.rate_limit_exceeded') {
        showPlanAlert(billingRateLimitMessage(err), 'warning');
      } else {
        showPlanAlert(getDowngradeCancelErrorMessage(err));
      }
    } finally {
      setCancelingDowngrade(false);
    }
  };


  const handleCancelCheckout = async () => {
    if (!negocioId || !canCancelCheckout || savingPlan || cancelingPlan || cancelingDowngrade || cancelingCheckout) return;
    const confirmed = await feedback.confirm('dashboard.billing_cancel_checkout_confirm');
    if (!confirmed) return;

    setCancelingCheckout(true);
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
        showPlanAlert(messageBody('dashboard.billing_cancel_timeout'));
      } else if (requestKey === 'alerts.rate_limit_exceeded') {
        showPlanAlert(billingRateLimitMessage(err), 'warning');
      } else {
        showPlanAlert(getCheckoutCancelErrorMessage(err));
      }
      const errorText = `${err?.code || ''} ${err?.message || ''} ${err?.details || ''}`.toLowerCase();
      if (['checkout_creation_in_progress', 'payment_already_confirmed', 'checkout_not_found']
        .some((code) => errorText.includes(code))) {
        await reloadBillingStatus?.();
      }
    } finally {
      setCancelingCheckout(false);
    }
  };
  return {
    plans, loading, currentPlanCode, canceledOrCancellationScheduled, suspendedWithDebt,
    planChangeScheduled, pendingPlanDate, activeCheckoutPlanCode, activeCheckoutStatus,
    activeCheckoutUrl, hasActiveCheckout, canCancelCheckout, billingActionPending,
    canRequestInvoice, providerSyncPending, providerSyncFailed, replaceableScheduledDowngrade,
    accessEndDate, accessDateLabel, selectedPlan, billableProfessionalsCount,
    savingPlan, cancelingPlan, cancelingDowngrade, cancelingCheckout,
    handleSelectPlan, handleCancelPlan, handleCancelDowngrade, handleCancelCheckout,
  };
}
