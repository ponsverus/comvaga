import { ptBR } from '../../../feedback/messages/ptBR.js';
import { hasPaymentHistory, isCancellationScheduled } from '../utils';

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

export function messageBody(key, params) {
  const entry = getByPath(ptBR, key);
  return interpolateMessage(entry?.body || '', params);
}

export function billingRateLimitMessage(error) {
  const seconds = Number(error?.payload?.retry_after_seconds);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 'Houve muitas tentativas. Aguarde antes de tentar novamente.';
  }
  if (seconds <= 60) return messageBody('alerts.rate_limit_exceeded');
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `Muitas tentativas. Tente novamente em cerca de ${minutes} minutos.`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const duration = `${hours} ${hours === 1 ? 'hora' : 'horas'}`
    + (remainingMinutes ? ` e ${remainingMinutes} ${remainingMinutes === 1 ? 'minuto' : 'minutos'}` : '');
  return `Muitas tentativas. Tente novamente em cerca de ${duration}.`;
}

export function formatCurrencyFromCents(value) {
  return `R$ ${(Number(value || 0) / 100).toFixed(2).replace('.', ',')}`;
}

export function getAccessEndDate(status) {
  return status?.access_ends_label || '';
}

export function getAccessDateLabel(status) {
  if (!getAccessEndDate(status)) return '';
  if (isCancellationScheduled(status)) return 'ACESSO ATÉ';
  if (SUSPENDED_SUBSCRIPTION_STATUSES.has(String(status?.provider_status || '').toUpperCase())) return 'ACESSO ATÉ';

  const current = String(status?.status || '').toLowerCase();
  const paymentStatus = String(status?.payment_method_status || '').toLowerCase();

  if (current === 'active' && paymentStatus === 'valid') return 'RENOVA';
  if (current === 'canceled') return 'ENCERRADO';
  if (['blocked', 'past_due', 'payment_grace'].includes(current)) return 'VENCEU';
  return 'PERÍODO ATÉ';
}

export function isCanceledOrCancellationScheduled(status) {
  return String(status?.status || '').toLowerCase() === 'canceled' || isCancellationScheduled(status);
}

export const SUSPENDED_SUBSCRIPTION_STATUSES = new Set(['INACTIVE', 'EXPIRED']);

export function statusText(status) {
  if (status?.reactivation_awaiting_payment) return 'Aguardando pagamento';
  if (String(status?.provider_status || '').toUpperCase() === 'INACTIVE') return 'Assinatura suspensa';
  if (String(status?.provider_status || '').toUpperCase() === 'EXPIRED') return 'Assinatura expirada';
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

export function statusBadgeClass(status) {
  if (status?.reactivation_awaiting_payment) {
    return 'border-yellow-400/30 bg-yellow-400/10 text-yellow-200';
  }
  if (SUSPENDED_SUBSCRIPTION_STATUSES.has(String(status?.provider_status || '').toUpperCase())) {
    return 'border-yellow-400/30 bg-yellow-400/10 text-yellow-200';
  }
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

export function statusButtonText(status) {
  if (status?.can_request_subscription_invoice === true) {
    const dueChargeCount = Number(status?.due_charge_count || 0);
    return dueChargeCount > 1
      ? `Pagar 1 de ${dueChargeCount} faturas`
      : String(status?.payment_method_status || '').toLowerCase() === 'valid'
        ? 'Pagar fatura restante'
        : 'Regularizar pagamento';
  }
  if (status?.provider_sync_pending) return 'Aguarde atualiza.';
  if (status?.plan_change_scheduled) return 'Troca agendada';
  if (status?.has_active_checkout) return 'Pagamento em andamento';
  if (status?.reactivation_pending) return status?.reactivation_awaiting_payment
    ? 'Aguardando pagamento' : 'Reativando assinatura';
  const providerStatus = String(status?.provider_status || '').toUpperCase();
  if (providerStatus === 'INACTIVE') return 'Reativar plano';
  if (providerStatus === 'EXPIRED') return 'Renovar plano';
  if (isCancellationScheduled(status)) return 'Reativar plano';

  const current = String(status?.status || '').toLowerCase();
  if (['blocked', 'past_due', 'payment_grace'].includes(current)) {
    return hasPaymentHistory(status) ? 'Regularizar pagamento' : 'Adicionar pagamento';
  }
  if (current === 'canceled') return 'Reativar plano';
  return 'Adicionar pagamento';
}

export function statusButtonClass(status) {
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

export function getPlanCancelErrorMessage(error) {
  const raw = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  if (raw.includes('subscription_debt_must_be_paid')) {
    return messageBody('dashboard.billing_cancel_debt_open');
  }
  if (raw.includes('subscription_not_cancelable')) {
    return messageBody('dashboard.billing_cancel_not_cancelable');
  }
  if (raw.includes('cancel_result_unknown') || raw.includes('billing_action_in_progress')) {
    return messageBody('dashboard.billing_subscription_reconciliation_pending');
  }
  if (raw.includes('checkout_in_progress') || raw.includes('plan_downgrade_pending') || raw.includes('provider_sync_in_progress')) {
    return messageBody('dashboard.billing_provider_sync_in_progress');
  }
  if (raw.includes('asaas_cancel_failed')) {
    return messageBody('dashboard.billing_cancel_gateway_error');
  }
  return messageBody('dashboard.billing_cancel_error');
}

export function getDowngradeCancelErrorMessage(error) {
  const raw = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  if (raw.includes('plan_downgrade_not_scheduled')) {
    return messageBody('dashboard.billing_cancel_downgrade_unavailable');
  }
  if (raw.includes('provider_sync_in_progress')) {
    return messageBody('dashboard.billing_provider_sync_in_progress');
  }
  return messageBody('dashboard.billing_cancel_downgrade_error');
}

export function getPlanChangeErrorMessage(error) {
  const raw = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  if (raw.includes('reactivation_future_invoice_requires_support')
    || raw.includes('reactivation_next_due_date_requires_support')
    || raw.includes('reactivation_cycle_requires_support')) {
    return messageBody('dashboard.billing_reactivation_invoice_conflict');
  }
  if (raw.includes('reactivation_pending')) {
    return messageBody('dashboard.billing_reactivation_pending');
  }
  if (raw.includes('reactivation_conflicting_operation') || raw.includes('reactivation_state_changed')) {
    return messageBody('dashboard.billing_subscription_reconciliation_pending');
  }
  if (raw.includes('reactivation_unavailable') || raw.includes('reactivation_not_available')) {
    return messageBody('dashboard.billing_reactivation_error');
  }
  if (raw.includes('future_plan_professional_limit_reached')) {
    return messageBody('dashboard.future_plan_professional_limit_reached');
  }
  if (raw.includes('plan_professional_limit_reached')) {
    return messageBody('dashboard.plan_professional_limit_reached');
  }
  if (raw.includes('checkout_record_pending')) {
    return messageBody('dashboard.billing_checkout_record_pending');
  }
  if (
    raw.includes('checkout_result_unknown')
    || raw.includes('checkout_state_unavailable')
    || raw.includes('checkout_reconciliation_pending')
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
  if (raw.includes('provider_subscription_reconciliation_pending') || raw.includes('billing_action_in_progress') || raw.includes('billing_action_confirmation_pending')) {
    return messageBody('dashboard.billing_subscription_reconciliation_pending');
  }
  if (raw.includes('subscription_charge_reconciliation_pending')) {
    return messageBody('dashboard.billing_charge_reconciliation_pending');
  }
  if (raw.includes('subscription_debt_must_be_paid')) {
    return messageBody('dashboard.billing_new_checkout_debt_open');
  }
  if (raw.includes('subscription_due_payment_not_found') || raw.includes('subscription_overdue_payment_not_found')) {
    return messageBody('dashboard.billing_recovery_invoice_not_found');
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
  if (raw.includes('checkout_provider_rejected')) {
    return messageBody('dashboard.billing_checkout_provider_rejected');
  }
  if (raw.includes('billing_upgrade_provider_rejected')) {
    return messageBody('dashboard.billing_upgrade_provider_rejected');
  }
  if (raw.includes('asaas_checkout_failed')) {
    return messageBody('dashboard.billing_checkout_error');
  }
  return messageBody('dashboard.billing_plan_change_error');
}


export function getCheckoutCancelErrorMessage(error) {
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
export function getPlanLimit(plan) {
  if (plan?.max_profissionais == null) return null;
  const value = Number(plan.max_profissionais);
  return Number.isFinite(value) ? value : null;
}

export function getPlanLimitMessage(plan, count) {
  const limit = getPlanLimit(plan);
  if (limit == null) return '';
  return messageBody('dashboard.plan_professional_limit_current', {
    count,
    limit,
    professionalsLabel: limit === 1 ? 'profissional ativo ou pendente' : 'profissionais ativos ou pendentes',
  });
}

export function getCapacityLabel(plan) {
  const limit = getPlanLimit(plan);
  if (limit == null) return 'Profissionais ilimitados';
  return limit === 1 ? '1 profissional' : `Até ${limit} profissionais`;
}

export const PLAN_CONTENT = {
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
