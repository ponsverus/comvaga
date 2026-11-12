import { useCallback, useEffect, useState } from 'react';
import { fetchBusinessBillingStatus } from '../api/dashboardApi';
import { isScheduledDowngradeSync } from '../utils';

export function useDashboardBillingStatus({ negocio, souDono }) {
  const [billingStatus, setBillingStatus] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingStatusLoadError, setBillingStatusLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    if (!negocio?.id || !souDono) {
      setBillingStatus(null);
      setBillingStatusLoadError(false);
      setBillingLoading(false);
      return () => { active = false; };
    }
    setBillingStatusLoadError(false);
    setBillingLoading(true);
    fetchBusinessBillingStatus(negocio.id)
      .then((status) => {
        if (active) {
          setBillingStatus(status);
          setBillingStatusLoadError(false);
        }
      })
      .catch(() => {
        if (active) {
          setBillingStatus(null);
          setBillingStatusLoadError(true);
        }
      })
      .finally(() => {
        if (active) setBillingLoading(false);
      });
    return () => { active = false; };
  }, [negocio?.id, souDono]);

  const reloadBillingStatus = useCallback(async () => {
    if (!negocio?.id || !souDono) {
      setBillingStatus(null);
      setBillingStatusLoadError(false);
      setBillingLoading(false);
      return null;
    }

    setBillingStatusLoadError(false);
    setBillingLoading(true);
    try {
      const status = await fetchBusinessBillingStatus(negocio.id);
      setBillingStatus(status);
      setBillingStatusLoadError(false);
      return status;
    } catch {
      setBillingStatus(null);
      setBillingStatusLoadError(true);
      return null;
    } finally {
      setBillingLoading(false);
    }
  }, [negocio?.id, souDono]);

  useEffect(() => {
    if (!souDono) return undefined;

    const refreshBillingStatus = () => {
      if (document.visibilityState === 'visible') void reloadBillingStatus();
    };

    window.addEventListener('focus', refreshBillingStatus);
    document.addEventListener('visibilitychange', refreshBillingStatus);
    return () => {
      window.removeEventListener('focus', refreshBillingStatus);
      document.removeEventListener('visibilitychange', refreshBillingStatus);
    };
  }, [reloadBillingStatus, souDono]);

  useEffect(() => {
    const checkoutStatus = String(billingStatus?.active_checkout_status || '').toLowerCase();
    if (!souDono || !negocio?.id || !billingStatus?.has_active_checkout
      || (checkoutStatus === 'active' && billingStatus?.active_checkout_url)
      || !['creating', 'unknown', 'active'].includes(checkoutStatus)) return undefined;

    let stopped = false;
    let attempts = 0;
    let timer;
    const pollCheckoutRecovery = async () => {
      if (stopped) return;
      if (document.visibilityState !== 'visible') {
        timer = window.setTimeout(pollCheckoutRecovery, 15_000);
        return;
      }

      attempts += 1;
      try {
        const nextStatus = await fetchBusinessBillingStatus(negocio.id);
        if (stopped) return;
        setBillingStatus(nextStatus);
        setBillingStatusLoadError(false);
        const nextCheckoutStatus = String(nextStatus?.active_checkout_status || '').toLowerCase();
        if (!nextStatus?.has_active_checkout || (nextCheckoutStatus === 'active' && nextStatus?.active_checkout_url)
          || !['creating', 'unknown', 'active'].includes(nextCheckoutStatus)) return;
      } catch {
        if (stopped) return;
      }

      if (attempts < 8) timer = window.setTimeout(pollCheckoutRecovery, 15_000);
    };
    timer = window.setTimeout(pollCheckoutRecovery, 15_000);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [billingStatus?.has_active_checkout, billingStatus?.active_checkout_status,
    billingStatus?.active_checkout_url, negocio?.id, souDono]);

  useEffect(() => {
    const status = String(billingStatus?.status || '').toLowerCase();
    const remaining = Number(billingStatus?.due_charge_count || 0);
    const paymentStatus = String(billingStatus?.payment_method_status || '').toLowerCase();
    const awaitingConfirmation = status === 'payment_grace'
      || (['blocked', 'past_due'].includes(status) && (remaining >= 1 || paymentStatus === 'valid'));
    if (!souDono || !negocio?.id || !awaitingConfirmation) return undefined;

    let stopped = false;
    let attempts = 0;
    let timer;
    const pollPaymentConfirmation = async () => {
      if (stopped || document.visibilityState !== 'visible') return;
      attempts += 1;
      try {
        const nextStatus = await fetchBusinessBillingStatus(negocio.id);
        if (stopped) return;
        setBillingStatus(nextStatus);
        setBillingStatusLoadError(false);
        if (String(nextStatus?.status || '').toLowerCase() !== status
          || (status !== 'payment_grace' && Number(nextStatus?.due_charge_count || 0) !== remaining)) return;
      } catch {
        if (stopped) return;
      }
      if (attempts < 8) timer = window.setTimeout(pollPaymentConfirmation, 15_000);
    };
    timer = window.setTimeout(pollPaymentConfirmation, 15_000);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [billingStatus?.status, billingStatus?.due_charge_count, billingStatus?.payment_method_status, negocio?.id, souDono]);

  useEffect(() => {
    const syncStatus = String(billingStatus?.provider_sync_status || '').toLowerCase();
    const scheduledDowngrade = isScheduledDowngradeSync(billingStatus);
    if (!souDono
      || !billingStatus?.provider_sync_pending
      || (syncStatus === 'failed' && !scheduledDowngrade)) return undefined;

    const nextAttemptAt = Date.parse(billingStatus?.provider_sync_next_attempt_at || '');
    const waitUntilRetry = Number.isFinite(nextAttemptAt) && nextAttemptAt > Date.now()
      ? Math.min(nextAttemptAt - Date.now() + 1000, scheduledDowngrade ? 86_400_000 : 60_000)
      : 15_000;
    const pollDelay = syncStatus === 'processing' && !scheduledDowngrade ? 10_000 : waitUntilRetry;
    let timer;
    let stopped = false;

    const pollBillingStatus = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const status = await fetchBusinessBillingStatus(negocio.id);
        if (stopped) return;
        setBillingStatus(status);
        setBillingStatusLoadError(false);
      } catch {
        if (!stopped) timer = window.setTimeout(pollBillingStatus, 15_000);
      }
    };

    timer = window.setTimeout(pollBillingStatus, pollDelay);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [billingStatus, negocio?.id, souDono]);

  return {
    billingStatus,
    setBillingStatus,
    billingLoading,
    billingStatusLoadError,
    reloadBillingStatus,
  };
}
