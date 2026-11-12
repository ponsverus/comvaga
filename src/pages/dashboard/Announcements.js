import { ptBR } from '../../feedback/messages/ptBR.js';
import { hasPaymentHistory, isCancellationScheduled, isScheduledDowngradeSync } from './utils';

function interpolateMessage(value, params) {
  return String(value || '').replace(/\{(\w+)\}/g, (_, key) => {
    const next = params?.[key];
    return next === undefined || next === null ? '' : String(next);
  });
}

function dashboardBillingMessage(key, params) {
  const entry = ptBR.dashboard?.[key];
  return interpolateMessage(entry?.body || '', params);
}

function billingDayLabel(value) {
  return dashboardBillingMessage(Number(value) === 1 ? 'billing_day_singular_header' : 'billing_day_plural_header');
}

function joinBillingMessages(...messages) {
  return messages.filter(Boolean).join(' ');
}

function getPendingPlanChangeSuffix(status) {
  const planChangeScheduled = Boolean(status?.plan_change_scheduled);
  const pendingPlanLabel = status?.pending_plan_name || status?.pending_plan_code || '';
  if (!planChangeScheduled || !pendingPlanLabel) return '';

  const pendingPlanDate = status?.pending_plan_effective_label || '';
  const messageKey = pendingPlanDate
    ? 'billing_pending_plan_change_scheduled_header'
    : 'billing_pending_plan_change_continues_header';

  return dashboardBillingMessage(messageKey, {
    plan: pendingPlanLabel,
    date: pendingPlanDate,
  });
}

function getBillingAnnouncements(status) {
  if (!status) return [];
  const announcements = [];
  const providerSyncStatus = String(status.provider_sync_status || '').toLowerCase();
  if (status.provider_sync_pending && (providerSyncStatus === 'failed' || !isScheduledDowngradeSync(status))) {
    const syncFailed = providerSyncStatus === 'failed';
    const syncRetrying = providerSyncStatus === 'retryable';
    announcements.push({
      id: 'billing-sync',
      tone: syncFailed ? 'danger' : 'warning',
      text: dashboardBillingMessage(syncFailed
        ? 'billing_provider_sync_failed_header'
        : syncRetrying
          ? 'billing_provider_sync_retry_header'
          : 'billing_provider_sync_pending_header'),
      hideAction: true,
    });
  }

  const statusAnnouncement = getBillingStatusAnnouncement(status);
  if (statusAnnouncement) announcements.push({ ...statusAnnouncement, id: 'billing-status' });
  return announcements;
}

function getBillingStatusAnnouncement(status) {
  const current = String(status.status || '').toLowerCase();
  const paymentStatus = String(status.payment_method_status || '').toLowerCase();
  const providerStatus = String(status.provider_status || '').toUpperCase();
  const daysUntilTrialEnd = Number(status.days_until_trial_end);
  const daysUntilBlock = Number(status.days_until_block);
  const trialDays = Number(status.trial_days);
  const pendingPlanChangeSuffix = getPendingPlanChangeSuffix(status);

  if (status.reactivation_awaiting_payment) {
    return {
      tone: Number(status.due_charge_count || 0) > 0 ? 'danger' : 'warning',
      text: dashboardBillingMessage(Number(status.due_charge_count || 0) > 0
        ? 'billing_blocked_header' : 'billing_reactivation_awaiting_payment_header'),
    };
  }

  if (providerStatus === 'INACTIVE' || providerStatus === 'EXPIRED') {
    const prefix = providerStatus === 'INACTIVE' ? 'billing_inactive' : 'billing_expired';
    const hasDebt = Number(status.due_charge_count || 0) > 0;
    const hasPaidAccess = status.booking_allowed === true && Boolean(status.access_ends_label);
    const key = status.reactivation_pending
      ? 'billing_reactivation_pending_header'
      : hasDebt ? `${prefix}_debt_header`
      : hasPaidAccess ? `${prefix}_paid_header` : `${prefix}_header`;
    return {
      tone: hasDebt ? 'danger' : 'warning',
      text: dashboardBillingMessage(key, { date: status.access_ends_label || '' }),
    };
  }

  if (isCancellationScheduled(status)) {
    const accessEndLabel = status?.access_ends_label || '';
    return {
      tone: 'warning',
      text: joinBillingMessages(
        dashboardBillingMessage(accessEndLabel ? 'billing_canceled_access_until_header' : 'billing_canceled_header', {
          date: accessEndLabel,
        }),
        pendingPlanChangeSuffix
      ),
    };
  }

  if (current === 'canceled') {
    return {
      tone: 'danger',
      text: joinBillingMessages(
        dashboardBillingMessage('billing_canceled_expired_header'),
        pendingPlanChangeSuffix
      ),
    };
  }

  if (current === 'blocked') {
    return {
      tone: 'danger',
      text: joinBillingMessages(
        dashboardBillingMessage(hasPaymentHistory(status) ? 'billing_blocked_header' : 'billing_blocked_never_paid_header'),
        pendingPlanChangeSuffix
      ),
    };
  }

  if (current === 'past_due') {
    const suffix = Number.isFinite(daysUntilBlock) && daysUntilBlock > 0
      ? dashboardBillingMessage('billing_block_countdown_header', {
        days: daysUntilBlock,
        dayLabel: billingDayLabel(daysUntilBlock),
      })
      : '';
    return {
      tone: 'warning',
      text: joinBillingMessages(
        dashboardBillingMessage('billing_past_due_header'),
        suffix,
        pendingPlanChangeSuffix
      ),
    };
  }

  if (current === 'payment_grace') {
    const suffix = Number.isFinite(daysUntilBlock) && daysUntilBlock > 0
      ? dashboardBillingMessage('billing_block_countdown_header', {
        days: daysUntilBlock,
        dayLabel: billingDayLabel(daysUntilBlock),
      })
      : '';
    const paymentFailed = ['failed', 'expired'].includes(paymentStatus);
    return {
      tone: 'warning',
      text: joinBillingMessages(
        dashboardBillingMessage(paymentFailed ? 'billing_payment_failed_header' : 'billing_trial_ended_header'),
        suffix,
        pendingPlanChangeSuffix
      ),
    };
  }

  if (current === 'trialing' && Number.isFinite(daysUntilTrialEnd) && daysUntilTrialEnd > 0) {
    const total = Number.isFinite(trialDays) && trialDays > 0
      ? dashboardBillingMessage('billing_trial_total_header', {
        days: trialDays,
        dayLabel: billingDayLabel(trialDays),
      })
      : '';
    return {
      tone: 'warning',
      text: joinBillingMessages(
        dashboardBillingMessage('billing_trial_active_header', {
          days: daysUntilTrialEnd,
          dayLabel: billingDayLabel(daysUntilTrialEnd),
          total,
        }),
        pendingPlanChangeSuffix
      ),
    };
  }

  if (pendingPlanChangeSuffix) {
    return {
      tone: 'warning',
      text: pendingPlanChangeSuffix,
    };
  }

  return null;
}

export function getDashboardAnnouncements({
  souDono,
  billingStatusLoadError,
  billingLoading,
  billingStatus,
  activeTab,
  reloadBillingStatus,
  setActiveTab,
  clockUnavailable,
  reloadFull,
}) {
  const billingAnnouncements = souDono
    ? billingStatusLoadError
      ? [{
        id: 'billing-load-error',
        tone: 'warning',
        text: dashboardBillingMessage('billing_status_load_error_inline'),
        actionLabel: dashboardBillingMessage('billing_status_retry_action'),
      }]
      : getBillingAnnouncements(billingStatus)
    : [];
  const announcements = [
    ...billingAnnouncements.map((announcement) => ({
      ...announcement,
      onAction: billingStatusLoadError
        ? reloadBillingStatus
        : activeTab !== 'planos'
          ? () => setActiveTab('planos')
          : undefined,
      actionLoading: billingStatusLoadError && billingLoading,
    })),
    ...(clockUnavailable ? [{
      id: 'clock',
      tone: 'warning',
      text: ptBR.dashboard.official_time_unavailable,
      actionLabel: ptBR.dashboard.official_time_retry_action,
      onAction: reloadFull,
    }] : []),
  ];
  return announcements;
}
