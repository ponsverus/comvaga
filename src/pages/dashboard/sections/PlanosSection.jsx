import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  cancelAsaasSubscription,
  createAsaasCheckout,
  fetchBillingPlans,
  setBusinessPlan,
} from '../api/dashboardApi';
import { getRequestErrorKey } from '../../../utils/requestError';
import { useFeedback } from '../../../feedback/useFeedback';
import { ptBR } from '../../../feedback/messages/ptBR.js';
import { isCancellationScheduled } from '../utils';

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

function getRenewalDate(status) {
  return status?.current_period_end_label || '';
}

function getAccessEndDate(status) {
  return status?.access_ends_label || '';
}

function buildPlanTimelineText({
  canceledOrCancellationScheduled,
  planChangeScheduled,
  accessEndDate,
  pendingPlanLabel,
  pendingPlanDate,
}) {
  if (canceledOrCancellationScheduled && planChangeScheduled) {
    const accessText = accessEndDate ? ` O acesso segue ativo ate ${accessEndDate}.` : '';
    const pendingText = pendingPlanLabel
      ? ` A mudanca para ${pendingPlanLabel}${pendingPlanDate ? ` esta agendada para ${pendingPlanDate}` : ' continua agendada'}.`
      : '';
    return `Cancelado.${accessText}${pendingText}`;
  }

  if (canceledOrCancellationScheduled) {
    return accessEndDate ? `Cancelado: o acesso segue ativo ate ${accessEndDate}.` : 'Cancelado.';
  }

  if (planChangeScheduled && pendingPlanLabel) {
    return `Mudanca agendada para ${pendingPlanLabel}${pendingPlanDate ? ` em ${pendingPlanDate}` : ''}.`;
  }

  return '';
}

function isCanceledOrCancellationScheduled(status) {
  return String(status?.status || '').toLowerCase() === 'canceled' || isCancellationScheduled(status);
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

  if (current === 'active' && ['valid', 'none'].includes(paymentStatus)) {
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
  const current = String(status?.status || '').toLowerCase();
  if (current === 'blocked' || current === 'past_due') {
    return 'Regularizar pagamento';
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
  if (raw.includes('asaas_cancel_failed')) {
    return messageBody('dashboard.billing_cancel_gateway_error');
  }
  return messageBody('dashboard.billing_cancel_error');
}

function getPlanChangeErrorMessage(error) {
  const raw = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  if (raw.includes('plan_professional_limit_reached')) {
    return messageBody('dashboard.plan_professional_limit_reached');
  }
  if (raw.includes('checkout_reconciliation_pending')) {
    return messageBody('dashboard.billing_checkout_reconciliation_pending');
  }
  if (raw.includes('checkout_conflict')) {
    return messageBody('dashboard.billing_checkout_conflict');
  }
  if (raw.includes('checkout_in_progress')) {
    return messageBody('dashboard.billing_checkout_in_progress');
  }
  if (raw.includes('asaas_checkout_failed')) {
    return messageBody('dashboard.billing_checkout_error');
  }
  return messageBody('dashboard.billing_plan_change_error');
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

const ALL_FEATURES = [
  'Reabertura automática de horários cancelados na agenda',
  'Reserva em lote de múltiplos trabalhos',
  'Direcionamento inteligente de novos agendamentos',
  'Comprometimento da agenda e receita futura projetada',
  'Agendamento assistido pelo profissional',
  'Reagendamento inteligente pela área exclusiva do cliente',
  'Alertas por e-mail em tempo real',
  'Lembrete automático + WhatsApp',
  'Sincronia com o Google Agenda',
];

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
    label: 'Premium Real',
    oldPriceLabel: null,
    priceClass: 'text-white',
    buttonText: 'Selecionar Premium',
    buttonClass: 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-100 hover:shadow-lg hover:shadow-zinc-700/30',
  },
};

function CheckMark({ className }) {
  return (
    <svg className={`h-4 w-4 shrink-0 mt-0.5 ${className}`} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
  const [error, setError] = useState('');
  const planScrollerRef = useRef(null);
  const rightPanelRef = useRef(null);
  const hasAutoScrolled = useRef(false);

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
  const currentStatusLabel = statusText(billingStatus);
  const canceledOrCancellationScheduled = isCanceledOrCancellationScheduled(billingStatus);
  const planChangeScheduled = Boolean(billingStatus?.plan_change_scheduled);
  const pendingPlanDate = billingStatus?.pending_plan_effective_label || '';
  const pendingPlanLabel = billingStatus?.pending_plan_name || billingStatus?.pending_plan_code || '';
  const accessEndDate = getAccessEndDate(billingStatus);
  const renewalDate = getRenewalDate(billingStatus);
  const planTimelineText = buildPlanTimelineText({
    canceledOrCancellationScheduled,
    planChangeScheduled,
    accessEndDate,
    pendingPlanLabel,
    pendingPlanDate,
  });
  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.code === currentPlanCode) || null,
    [currentPlanCode, plans]
  );
  const billableProfessionalsCount = useMemo(
    () => profissionais.filter((item) => ['ativo', 'pendente'].includes(String(item?.status || '').toLowerCase())).length,
    [profissionais]
  );

  useEffect(() => {
    if (hasAutoScrolled.current || !plans.length) return;

    const scroller = planScrollerRef.current;
    const panel = rightPanelRef.current;
    if (!scroller || !panel) return;

    window.requestAnimationFrame(() => {
      const scrollerRect = scroller.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const nextLeft = scroller.scrollLeft + (panelRect.left - scrollerRect.left);
      scroller.scrollTo({ left: Math.max(0, nextLeft), behavior: 'auto' });
      hasAutoScrolled.current = true;
    });
  }, [plans]);

  const handleSelectPlan = async (planCode) => {
    if (!negocioId || savingPlan) return;
    const targetPlan = plans.find((plan) => plan.code === planCode);
    const targetLimit = getPlanLimit(targetPlan);
    if (targetLimit != null && billableProfessionalsCount > targetLimit) {
      setError(getPlanLimitMessage(targetPlan, billableProfessionalsCount));
      return;
    }

    const currentStatus = String(billingStatus?.status || '').toLowerCase();
    const freeAccessOpen = currentStatus === 'trialing';

    setSavingPlan(planCode);
    setError('');
    try {
      if (freeAccessOpen) {
        const result = await setBusinessPlan(negocioId, planCode);
        if (result) {
          onBillingStatusChange?.(result);
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
    if (!negocioId || savingPlan || cancelingPlan) return;
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
      <div>
        <h2 className="text-2xl font-normal text-white">PLANOS</h2>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm uppercase text-gray-500">
          <span>ATUAL: <span className="text-primary">{selectedPlan?.name || currentStatusLabel}</span></span>
          {renewalDate && !canceledOrCancellationScheduled && (
            <span>RENOVA: <span className="text-primary">{renewalDate}</span></span>
          )}
          {accessEndDate && canceledOrCancellationScheduled && (
            <span>ACESSO ATE: <span className="text-primary">{accessEndDate}</span></span>
          )}
          {planChangeScheduled && (
            <span>
              MUDANCA AGENDADA: <span className="text-primary">{pendingPlanLabel}</span>
              {pendingPlanDate ? <span> EM {pendingPlanDate}</span> : null}
            </span>
          )}
        </div>
      </div>

      {planTimelineText && (
        <div className="rounded-custom border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-sm leading-relaxed text-yellow-100">
          {planTimelineText}
        </div>
      )}

      {error && (
        <div className="rounded-custom border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div
        ref={planScrollerRef}
        className="-mx-6 -mb-6 bg-gray-800 border-t border-gray-800 flex md:grid md:grid-cols-2 gap-px overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="shrink-0 w-[85vw] md:w-auto snap-start bg-dark-100 px-4 sm:px-8 md:px-12 lg:px-16 py-10 md:py-12">
          <span className="inline-block text-[10px] font-normal uppercase tracking-widest text-gray-400 bg-gray-800 rounded-full px-3 py-1 mb-6">
            Todos os planos incluem
          </span>

          <div className="flex flex-col gap-5">
            {ALL_FEATURES.map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckMark className="text-primary" />
                <span className="text-sm leading-snug text-gray-300">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div ref={rightPanelRef} className="shrink-0 w-[85vw] md:w-auto snap-start bg-dark-200 flex flex-col divide-y divide-gray-800">
          <div className="px-4 sm:px-8 md:px-12 lg:px-16 pt-10 md:pt-12 pb-6">
            <span className="inline-block text-[10px] font-normal uppercase tracking-widest text-primary bg-primary/15 rounded-full px-3 py-1">
              Escolha a capacidade
            </span>
          </div>

          {plans.map((plan) => {
            const active = plan.code === currentPlanCode;
            const pendingForPlan = planChangeScheduled && billingStatus?.pending_plan_code === plan.code;
            const saving = savingPlan === plan.code;
            const canceling = cancelingPlan === plan.code;
            const paymentStatus = String(billingStatus?.payment_method_status || '').toLowerCase();
            const currentStatus = String(billingStatus?.status || '').toLowerCase();
            const freeAccessOpen = currentStatus === 'trialing';
            const selectedCanceledOrCancellationScheduled = active && canceledOrCancellationScheduled;
            const canCancel = active
              && !selectedCanceledOrCancellationScheduled
              && Boolean(billingStatus?.can_cancel_subscription);
            const activeFreeAccess = active && freeAccessOpen;
            const needsPayment = active
              && !activeFreeAccess
              && !['valid', 'none'].includes(paymentStatus);
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

            return (
              <div
                key={plan.code}
                className={[
                  'px-4 sm:px-8 md:px-12 lg:px-16 py-8 flex flex-col gap-6 transition-all',
                  plan.code === 'profissional'
                    ? 'bg-primary/10 border-l-4 border-l-primary shadow-lg shadow-primary/10'
                    : '',
                ].join(' ')}
              >
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

                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 w-full">
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
                      <p className="mt-3 max-w-xs rounded-custom border border-yellow-400/25 bg-yellow-400/10 px-3 py-2 text-xs font-normal uppercase tracking-wide text-yellow-100">
                        Mudanca agendada{pendingPlanDate ? ` para ${pendingPlanDate}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 sm:items-end shrink-0">
                    <button
                      type="button"
                      disabled={activeWithoutAction || activeFreeAccess || pendingForPlan || !!savingPlan || !!cancelingPlan || planLimitBlocked}
                      onClick={() => handleSelectPlan(plan.code)}
                      className={`flex min-h-[42px] items-center justify-center gap-2 px-5 py-2.5 text-xs font-normal uppercase tracking-wider rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                        activeFreeAccess
                          ? 'cursor-default border border-primary/40 bg-primary/10 text-primary'
                          : activeWithoutAction
                            ? 'cursor-default border border-green-400/30 bg-green-400/10 text-green-300'
                            : active && (needsPayment || selectedCanceledOrCancellationScheduled)
                              ? selectedPaymentButtonClass
                              : content.buttonClass
                      }`}
                    >
                      {planLimitBlocked
                        ? 'Limite excedido'
                        : pendingForPlan
                          ? 'Agendado'
                          : activeFreeAccess
                            ? 'Teste grátis'
                            : activeWithoutAction
                              ? 'Plano ativo'
                              : saving
                                ? (freeAccessOpen ? 'Salvando...' : 'Abrindo checkout...')
                                : active && (needsPayment || selectedCanceledOrCancellationScheduled)
                                  ? selectedPaymentButtonText
                                  : content.buttonText}
                    </button>

                    {canCancel && (
                      <button
                        type="button"
                        disabled={!!savingPlan || !!cancelingPlan}
                        onClick={() => handleCancelPlan(plan.code)}
                        className="flex items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 px-5 py-2.5 text-xs font-normal uppercase tracking-wider text-red-300 transition-all hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {canceling ? 'Cancelando...' : 'Cancelar'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
