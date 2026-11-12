import { Fragment } from 'react';
import { Loader2 } from 'lucide-react';
import { usePlanosController } from './usePlanosController';
import {
  formatCurrencyFromCents,
  getCapacityLabel,
  getPlanLimit,
  PLAN_CONTENT,
  statusBadgeClass,
  statusButtonClass,
  statusButtonText,
  statusText,
  SUSPENDED_SUBSCRIPTION_STATUSES,
} from './planRules';

export default function PlanosSection({
  negocioId,
  profissionais = [],
  billingStatus = null,
  billingLoading = false,
  onBillingStatusChange,
  reloadBillingStatus,
}) {
  const {
    plans, loading, currentPlanCode, canceledOrCancellationScheduled, suspendedWithDebt,
    planChangeScheduled, pendingPlanDate, activeCheckoutPlanCode, activeCheckoutStatus,
    activeCheckoutUrl, hasActiveCheckout, canCancelCheckout, billingActionPending,
    canRequestInvoice, providerSyncPending, providerSyncFailed, replaceableScheduledDowngrade,
    accessEndDate, accessDateLabel, selectedPlan, billableProfessionalsCount,
    savingPlan, cancelingPlan, cancelingDowngrade, cancelingCheckout,
    handleSelectPlan, handleCancelPlan, handleCancelDowngrade, handleCancelCheckout,
  } = usePlanosController({
    negocioId, profissionais, billingStatus, billingLoading, onBillingStatusChange, reloadBillingStatus,
  });
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

      <div className="-mx-6 -mb-6 bg-gray-800 border-t border-gray-800 grid grid-cols-1 lg:grid-cols-3 gap-px">
        {plans.map((plan) => {
          const active = plan.code === currentPlanCode;
          const pendingForPlan = planChangeScheduled && billingStatus?.pending_plan_code === plan.code;
          const checkoutForPlan = hasActiveCheckout && activeCheckoutPlanCode === plan.code;
          const checkoutCanResume = checkoutForPlan && activeCheckoutStatus === 'active' && Boolean(activeCheckoutUrl);
          const checkoutAwaitingConfirmation = checkoutForPlan && !checkoutCanResume;
          const recoverInvoice = active && canRequestInvoice;
          const checkoutBlockedByDebt = checkoutCanResume && !active && Number(billingStatus?.due_charge_count || 0) > 0;
          const checkoutBlocksPlan = hasActiveCheckout && !checkoutCanResume && !recoverInvoice;
          const replacementDowngradeAllowed = replaceableScheduledDowngrade
            && selectedPlan
            && !active
            && !pendingForPlan
            && Number(plan.sort_order) < Number(selectedPlan.sort_order);
          const providerStatus = String(billingStatus?.provider_status || '').toUpperCase();
          const movementBlocked = (providerSyncPending && !replacementDowngradeAllowed && !recoverInvoice)
            || (billingActionPending && !recoverInvoice)
            || checkoutBlocksPlan
            || checkoutBlockedByDebt
            || (Boolean(billingStatus?.reactivation_pending) && !recoverInvoice)
            || (!active && providerStatus === 'INACTIVE');
          const saving = savingPlan === plan.code;
          const canceling = cancelingPlan === plan.code;
          const paymentStatus = String(billingStatus?.payment_method_status || '').toLowerCase();
          const currentStatus = String(billingStatus?.status || '').toLowerCase();
          const freeAccessOpen = currentStatus === 'trialing';
          const awaitingPaymentConfirmation = active
            && currentStatus === 'blocked'
            && paymentStatus === 'valid'
            && Number(billingStatus?.due_charge_count || 0) === 0;
          const selectedCanceledOrCancellationScheduled = active
            && (canceledOrCancellationScheduled || SUSPENDED_SUBSCRIPTION_STATUSES.has(providerStatus));
          const canCancelDowngrade = active
            && !providerSyncFailed
            && Boolean(billingStatus?.can_cancel_plan_downgrade);
          const canCancel = active
            && (!selectedCanceledOrCancellationScheduled
              || SUSPENDED_SUBSCRIPTION_STATUSES.has(providerStatus))
            && Boolean(billingStatus?.can_cancel_subscription);
          const activeFreeAccess = active && freeAccessOpen;
          const needsPayment = active
            && !activeFreeAccess
            && (paymentStatus !== 'valid'
              || suspendedWithDebt
              || (['blocked', 'past_due', 'payment_grace'].includes(currentStatus)
                && Number(billingStatus?.due_charge_count || 0) > 0));
          const planChangeBlocksPayment = active && needsPayment && planChangeScheduled && !recoverInvoice;
          const activeWithoutAction = active && currentStatus === 'active' && !activeFreeAccess
            && !needsPayment && !selectedCanceledOrCancellationScheduled;
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
                : saving
                  ? (recoverInvoice ? 'Verificando fatura...'
                    : freeAccessOpen ? 'Salvando...'
                    : providerStatus === 'INACTIVE' ? 'Reativando plano...'
                    : 'Abrindo checkout...')
                  : recoverInvoice
                    ? selectedPaymentButtonText
                    : awaitingPaymentConfirmation
                      ? 'Aguardando retorno'
                    : activeWithoutAction
                      ? 'Plano ativo'
                      : checkoutBlockedByDebt
                        ? 'Quite as faturas'
                      : checkoutCanResume
                        ? 'Continuar pagamento'
                        : checkoutAwaitingConfirmation
                          ? 'Checkout em conferência'
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
                  disabled={planLimitBlocked || movementBlocked || planChangeBlocksPayment || awaitingPaymentConfirmation || (!checkoutCanResume && !recoverInvoice && (activeWithoutAction || activeFreeAccess || pendingForPlan)) || !!savingPlan || !!cancelingPlan || cancelingDowngrade || cancelingCheckout}
                  onClick={() => handleSelectPlan(plan.code)}
                  className={`flex min-h-[42px] w-full items-center justify-center gap-2 px-5 py-2.5 text-xs font-normal uppercase tracking-wider rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                    recoverInvoice
                      ? selectedPaymentButtonClass
                      : activeFreeAccess
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
            checkoutForPlan && canCancelCheckout
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
                    disabled={!!savingPlan || !!cancelingPlan || cancelingDowngrade || cancelingCheckout || hasActiveCheckout || providerSyncPending || billingActionPending || billingStatus?.reactivation_pending}
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
