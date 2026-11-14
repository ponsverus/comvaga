import { jsonResponse } from '../_shared/cors.ts';
import { processAsaasBillingEvent } from '../_shared/asaas-billing.ts';
import { AsaasObservationUnavailable, readAsaasSubscriptionDetails, readCurrentSubscription, reconcileAsaasSubscriptionState } from '../_shared/asaas-subscription-state.ts';
import { processPendingSubscriptionProviderSyncs } from '../_shared/billing-provider-sync.ts';
import { listAsaasSubscriptionCharges, reconcileAsaasSubscriptionCharges, todayInSaoPaulo, validCalendarDate } from '../_shared/asaas-charges.ts';
import { createAdminClient } from '../_shared/supabase.ts';

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || 'billing_event_processing_failed');
  }
  return String(error || 'billing_event_processing_failed');
}

async function recordPendingReturn(
  admin: ReturnType<typeof createAdminClient>, kind: 'reactivation' | 'cancel',
  negocioId: string, requestId: string,
) {
  const { error } = await admin.rpc('record_monitor_pending_return', {
    p_negocio_id: negocioId, p_kind: kind, p_request_id: requestId,
  });
  if (error) console.error(kind + ' monitor count failed:', error);
}

async function recordVerificationFailure(
  admin: ReturnType<typeof createAdminClient>, kind: 'reactivation' | 'cancel',
  negocioId: string, requestId: string,
  failureKind: 'provider_unavailable' | 'local_reconciliation_failed', error: unknown,
) {
  const { error: monitorError } = await admin.rpc('record_monitor_verification_failure', {
    p_negocio_id: negocioId, p_kind: kind, p_request_id: requestId,
    p_failure_kind: failureKind,
    p_error: errorMessage(error),
  });
  if (monitorError) console.error(kind + ' verification failure count failed:', monitorError);
}

function isPastDueOpenCharge(charge: { status: string; dueDate: string }, today: string) {
  return (charge.status === 'PENDING' || charge.status === 'OVERDUE')
    && validCalendarDate(charge.dueDate)
    && charge.dueDate < today;
}

function asaasBaseUrl() {
  const value = Deno.env.get('ASAAS_BASE_URL')?.trim() || '';
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

async function setAsaasSubscriptionInactive(subscriptionId: string) {
  const baseUrl = asaasBaseUrl();
  const apiKey = Deno.env.get('ASAAS_API_KEY');
  if (!baseUrl || !apiKey) throw new Error('missing_asaas_credentials');
  const response = await fetch(`${baseUrl}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: 'PUT',
    headers: {
      access_token: apiKey,
      accept: 'application/json',
      'content-type': 'application/json',
      'User-Agent': 'Comvaga/1.0',
    },
    body: JSON.stringify({ status: 'INACTIVE' }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`asaas_subscription_suspend_failed_${response.status}`);
}

async function deleteFutureAsaasCharge(
  admin: ReturnType<typeof createAdminClient>,
  negocioId: string,
  subscriptionId: string,
  charge: { id: string; status: string; dueDate: string; subscription: string },
  today: string,
) {
  if (charge.subscription !== subscriptionId || charge.status !== 'PENDING'
    || !validCalendarDate(charge.dueDate) || charge.dueDate <= today) {
    throw new Error('future_charge_delete_precondition_failed');
  }

  const baseUrl = asaasBaseUrl();
  const apiKey = Deno.env.get('ASAAS_API_KEY');
  if (!baseUrl || !apiKey) throw new Error('missing_asaas_credentials');

  let confirmedByResponse = false;
  let requestError: string | null = null;
  try {
    const response = await fetch(`${baseUrl}/payments/${encodeURIComponent(charge.id)}`, {
      method: 'DELETE',
      headers: {
        access_token: apiKey,
        accept: 'application/json',
        'User-Agent': 'Comvaga/1.0',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (response.ok) confirmedByResponse = true;
    else requestError = `asaas_future_charge_delete_failed_${response.status}`;
  } catch {
    requestError = 'asaas_future_charge_delete_result_unknown';
  }

  if (!confirmedByResponse) {
    const currentCharges = await listAsaasSubscriptionCharges(subscriptionId, 'worker');
    await reconcileAsaasSubscriptionCharges(admin, negocioId, subscriptionId, currentCharges);
    const current = currentCharges.find((item) => item.id === charge.id);
    if (current && ['CONFIRMED', 'RECEIVED'].includes(current.status)) return 'settled';
    if (current && current.status !== 'DELETED') throw new Error(requestError || 'asaas_future_charge_delete_unconfirmed');
  }

  const { data, error } = await admin.rpc('record_asaas_deleted_future_charge', {
    p_negocio_id: negocioId,
    p_provider_subscription_id: subscriptionId,
    p_provider_payment_id: charge.id,
    p_due_date: charge.dueDate,
  });
  if (error) throw error;
  if (data?.result === 'settled') return 'settled';
  if (data?.result !== 'recorded') throw new Error('future_charge_delete_local_record_failed');
  return 'deleted';
}

async function runOverdueSubscriptionSuspension(admin: ReturnType<typeof createAdminClient>) {
  const summary = {
    local_date: todayInSaoPaulo(),
    inspected: 0,
    eligible: 0,
    suspended: 0,
    already_inactive: 0,
    future_charges_deleted: 0,
    future_charges_settled_during_cleanup: 0,
    skipped: 0,
    failed: 0,
  };
  const pageSize = 250;
  let offset = 0;
  const today = summary.local_date;

  while (true) {
    const { data: subscriptions, error } = await admin
      .from('business_subscriptions')
      .select('negocio_id, provider_subscription_id, provider_status, provider_sync_status, reactivation_request_id, cancel_at, canceled_at')
      .eq('provider', 'asaas')
      .not('provider_subscription_id', 'is', null)
      .in('provider_status', ['ACTIVE', 'INACTIVE'])
      .order('negocio_id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!subscriptions?.length) break;

    for (const subscription of subscriptions) {
      summary.inspected += 1;
      const negocioId = String(subscription.negocio_id || '');
      const subscriptionId = String(subscription.provider_subscription_id || '');
      const localProviderStatus = String(subscription.provider_status || '').toUpperCase();
      if (!negocioId || !subscriptionId || subscription.provider_sync_status !== 'synced'
        || subscription.reactivation_request_id) {
        summary.skipped += 1;
        continue;
      }
      if (localProviderStatus === 'ACTIVE' && (subscription.cancel_at || subscription.canceled_at)) {
        summary.skipped += 1;
        continue;
      }

      try {
        const charges = await listAsaasSubscriptionCharges(subscriptionId, 'worker');
        await reconcileAsaasSubscriptionCharges(admin, negocioId, subscriptionId, charges);
        const overdue = charges.filter((charge) => isPastDueOpenCharge(charge, today));
        if (overdue.length < 2) {
          summary.skipped += 1;
          continue;
        }
        summary.eligible += 1;

        const observed = await reconcileAsaasSubscriptionState(admin, negocioId, subscriptionId);
        if (!['ACTIVE', 'INACTIVE'].includes(observed)) {
          summary.skipped += 1;
          continue;
        }

        // Re-read the complete provider list immediately before changing the recurrence.
        const currentCharges = await listAsaasSubscriptionCharges(subscriptionId, 'worker');
        await reconcileAsaasSubscriptionCharges(admin, negocioId, subscriptionId, currentCharges);
        const stillOverdue = currentCharges.filter((charge) => isPastDueOpenCharge(charge, today));
        if (stillOverdue.length < 2) {
          summary.skipped += 1;
          continue;
        }

        if (observed === 'ACTIVE') {
          let suspendError: string | null = null;
          try {
            await setAsaasSubscriptionInactive(subscriptionId);
          } catch (error) {
            suspendError = error instanceof Error ? error.message : 'asaas_subscription_suspend_failed';
          }
          const confirmed = await reconcileAsaasSubscriptionState(admin, negocioId, subscriptionId);
          if (confirmed !== 'INACTIVE') {
            throw new Error(suspendError || 'asaas_subscription_inactive_not_confirmed');
          }
          summary.suspended += 1;
        } else {
          summary.already_inactive += 1;
        }

        // Only remove future, still-unpaid PENDING charges. Past due charges remain payable.
        const afterSuspension = await listAsaasSubscriptionCharges(subscriptionId, 'worker');
        await reconcileAsaasSubscriptionCharges(admin, negocioId, subscriptionId, afterSuspension);
        const futureOpen = afterSuspension
          .filter((charge) => charge.subscription === subscriptionId
            && charge.status === 'PENDING'
            && validCalendarDate(charge.dueDate)
            && charge.dueDate > today)
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));

        for (const charge of futureOpen) {
          const result = await deleteFutureAsaasCharge(admin, negocioId, subscriptionId, charge, today);
          if (result === 'deleted') summary.future_charges_deleted += 1;
          else summary.future_charges_settled_during_cleanup += 1;
        }

        const finalCharges = await listAsaasSubscriptionCharges(subscriptionId, 'worker');
        await reconcileAsaasSubscriptionCharges(admin, negocioId, subscriptionId, finalCharges);
      } catch (error) {
        summary.failed += 1;
        console.error('Overdue Asaas subscription suspension failed:', {
          negocio_id: negocioId,
          subscription_id: subscriptionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (subscriptions.length < pageSize) break;
    offset += pageSize;
  }

  return summary;
}

async function reconcilePendingOwnerBillingActions(admin: ReturnType<typeof createAdminClient>) {
  const summary = { checked: 0, finalized: 0, released: 0, pending: 0 };
  const cutoff = new Date(Date.now() - 2 * 60_000).toISOString();
  const { data: actions, error } = await admin.from('business_subscriptions')
    .select('negocio_id, provider_subscription_id, provider_customer_id, billing_action_kind, billing_action_request_id, billing_action_started_at, billing_action_target_plan_code')
    .not('billing_action_kind', 'is', null)
    .lt('billing_action_started_at', cutoff)
    .order('billing_action_started_at', { ascending: true })
    .limit(5);
  if (error) throw error;

  for (const action of actions || []) {
    summary.checked += 1;
    const monitorRequestId = String(action.billing_action_request_id || '');
    try {
      const negocioId = String(action.negocio_id);
      const subscriptionId = String(action.provider_subscription_id || '');
      const requestId = String(action.billing_action_request_id || '');
      if (!requestId) throw new Error('pending_billing_action_identity_missing');
      if (!subscriptionId) {
        if (action.billing_action_kind !== 'zero_upgrade') throw new Error('pending_billing_action_provider_missing');
        if (Date.now() - Date.parse(String(action.billing_action_started_at || '')) < 10 * 60_000) {
          summary.pending += 1;
          continue;
        }
        const { data: released, error: releaseError } = await admin.rpc('release_owner_billing_action', {
          p_negocio_id: negocioId,
          p_request_id: requestId,
          p_reason: 'local_upgrade_not_completed',
        });
        if (releaseError) throw releaseError;
        if (released) summary.released += 1;
        else summary.pending += 1;
        continue;
      }
      const observed = await reconcileAsaasSubscriptionState(admin, negocioId, subscriptionId);
      if (observed === 'DELETED') {
        summary.finalized += 1;
        continue;
      }
      if (action.billing_action_kind === 'zero_upgrade') {
        const planCode = String(action.billing_action_target_plan_code || '');
        const { data: plan, error: planError } = await admin.from('billing_plans')
          .select('code, price_cents').eq('code', planCode).maybeSingle();
        if (planError) throw planError;
        if (!plan) throw new Error('pending_upgrade_target_missing');
        const details = await readAsaasSubscriptionDetails(subscriptionId);
        const matches = String(details.externalReference || '') === `comvaga-subscription:${planCode}`
          && Math.round(Number(details.value) * 100) === Number(plan.price_cents)
          && details.deleted !== true;
        if (matches) {
          const { error: applyError } = await admin.rpc('apply_paid_business_plan_upgrade', {
            p_negocio_id: negocioId,
            p_plan_code: planCode,
            p_provider_event_id: `zero_upgrade_reconcile:${requestId}`,
            p_provider_payload: {
              action: 'zero_proration_upgrade_reconciliation',
              billing_action_request_id: requestId,
              provider_response: details,
            },
          });
          if (applyError) throw applyError;
          summary.finalized += 1;
          continue;
        }
      }
      const ageMs = Date.now() - Date.parse(String(action.billing_action_started_at || ''));
      if (ageMs < 10 * 60_000) {
        if (action.billing_action_kind === 'cancel') {
          await recordPendingReturn(admin, 'cancel', negocioId, requestId);
        }
        summary.pending += 1;
        continue;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      let secondState: string;
      try {
        secondState = await readCurrentSubscription(subscriptionId, action.provider_customer_id || null);
      } catch (lookupError) {
        if (action.billing_action_kind === 'cancel') {
          await recordVerificationFailure(admin, 'cancel', negocioId, requestId, 'provider_unavailable', lookupError);
        }
        summary.pending += 1;
        console.error('second Asaas cancellation lookup failed:', negocioId, lookupError);
        continue;
      }
      if (secondState !== observed || secondState === 'DELETED') {
        if (action.billing_action_kind === 'cancel') {
          await recordVerificationFailure(admin, 'cancel', negocioId, requestId, 'provider_unavailable', 'asaas_subscription_state_inconclusive');
        }
        summary.pending += 1;
        continue;
      }
      if (action.billing_action_kind === 'zero_upgrade') {
        const secondDetails = await readAsaasSubscriptionDetails(subscriptionId);
        const targetReference = `comvaga-subscription:${String(action.billing_action_target_plan_code || '')}`;
        if (String(secondDetails.externalReference || '') === targetReference) {
          summary.pending += 1;
          continue;
        }
      }
      const { data: released, error: releaseError } = await admin.rpc('release_owner_billing_action', {
        p_negocio_id: negocioId,
        p_request_id: requestId,
        p_reason: 'provider_state_unchanged_after_reconciliation',
      });
      if (releaseError) throw releaseError;
      if (released) summary.released += 1;
      else summary.pending += 1;
    } catch (actionError) {
      if (action.billing_action_kind === 'cancel' && monitorRequestId) {
        await recordVerificationFailure(admin, 'cancel', String(action.negocio_id), monitorRequestId,
          actionError instanceof AsaasObservationUnavailable ? 'provider_unavailable' : 'local_reconciliation_failed', actionError);
      }
      summary.pending += 1;
      console.error('owner billing action reconciliation pending:', action.negocio_id, actionError);
    }
  }
  return summary;
}

async function reconcilePaidUpgradeCheckouts(admin: ReturnType<typeof createAdminClient>) {
  const summary = { checked: 0, queued: 0, pending: 0 };
  const { data: sessions, error } = await admin.from('billing_checkout_sessions')
    .select('id, negocio_id, subscription_id, provider_checkout_id, external_reference, status, upgrade_reconcile_checked_at')
    .eq('action', 'upgrade_proration')
    .is('upgrade_applied_at', null)
    .not('provider_checkout_id', 'is', null)
    .in('status', ['active', 'unknown', 'paid', 'expired'])
    .order('upgrade_reconcile_checked_at', { ascending: true, nullsFirst: true })
    .limit(3);
  if (error) throw error;
  const apiKey = Deno.env.get('ASAAS_API_KEY');
  const baseUrl = asaasBaseUrl();
  if (!apiKey || !baseUrl) throw new Error('missing_asaas_credentials');

  for (const session of sessions || []) {
    summary.checked += 1;
    try {
      const url = new URL(`${baseUrl}/payments`);
      url.searchParams.set('checkoutSession', String(session.provider_checkout_id));
      url.searchParams.set('limit', '100');
      const response = await fetch(url, {
        headers: { access_token: apiKey, accept: 'application/json', 'User-Agent': 'Comvaga/1.0' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`asaas_checkout_payment_lookup_failed_${response.status}`);
      const page = await response.json();
      if (!Array.isArray(page?.data)) throw new Error('asaas_checkout_payment_lookup_invalid');
      const payment = page.data.find((item: Record<string, unknown>) =>
        ['CONFIRMED', 'RECEIVED'].includes(String(item.status || '').toUpperCase())
        && (!item.checkoutSession || String(item.checkoutSession) === String(session.provider_checkout_id))
        && typeof item.id === 'string');
      if (!payment) {
        const { error: checkedError } = await admin.from('billing_checkout_sessions')
          .update({ upgrade_reconcile_checked_at: new Date().toISOString() })
          .eq('id', session.id);
        if (checkedError) throw checkedError;
        summary.pending += 1;
        continue;
      }
      const providerEventId = `payment_reconcile:${payment.id}`;
      const { error: eventError } = await admin.from('billing_events').insert({
        negocio_id: session.negocio_id,
        subscription_id: session.subscription_id,
        provider: 'asaas',
        provider_event_id: providerEventId,
        event_type: 'PAYMENT_CONFIRMED',
        payload: {
          checkout: { id: session.provider_checkout_id, externalReference: session.external_reference },
          payment,
        },
        checkout_session_id: session.id,
        event_origin: 'reconciliation',
        processing_status: 'pending',
      });
      if (eventError && eventError.code !== '23505') throw eventError;
      const { error: paidError } = await admin.from('billing_checkout_sessions')
        .update({ status: 'paid', upgrade_reconcile_checked_at: new Date().toISOString() })
        .eq('id', session.id)
        .is('upgrade_applied_at', null);
      if (paidError) throw paidError;
      if (!eventError) summary.queued += 1;
      else summary.pending += 1;
    } catch (checkoutError) {
      summary.pending += 1;
      console.error('paid upgrade checkout reconciliation pending:', session.id, checkoutError);
    }
  }
  return summary;
}

function dateInSaoPaulo(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('downgrade_effective_date_invalid');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

async function reconcileDuePlanDowngrades(admin: ReturnType<typeof createAdminClient>) {
  const summary = { checked: 0, applied: 0, deferred: 0, pending: 0, failed: 0 };
  const { data: subscriptions, error } = await admin.from('business_subscriptions')
    .select('id, negocio_id, provider_subscription_id, pending_plan_effective_at')
    .eq('provider', 'asaas')
    .eq('pending_plan_change_type', 'downgrade')
    .not('pending_plan_effective_at', 'is', null)
    .lte('pending_plan_effective_at', new Date().toISOString())
    .order('pending_plan_effective_at', { ascending: true })
    .limit(25);
  if (error) throw error;

  for (const subscription of subscriptions || []) {
    summary.checked += 1;
    try {
      const subscriptionId = String(subscription.provider_subscription_id || '');
      if (!subscriptionId || !subscription.pending_plan_effective_at) {
        summary.pending += 1;
        continue;
      }
      const dueDate = dateInSaoPaulo(String(subscription.pending_plan_effective_at));
      const provider = await readAsaasSubscriptionDetails(subscriptionId);
      const charges = await listAsaasSubscriptionCharges(subscriptionId, 'worker');
      await reconcileAsaasSubscriptionCharges(admin, subscription.negocio_id, subscriptionId, charges);
      const matching = charges.filter((charge) => charge.dueDate === dueDate && charge.status !== 'DELETED');
      if (matching.length !== 1) {
        summary.pending += 1;
        continue;
      }
      const charge = matching[0];
      if (!['CONFIRMED', 'RECEIVED'].includes(charge.status) || charge.valueCents === undefined) {
        summary.pending += 1;
        continue;
      }
      const futureCharge = charges
        .filter((item) => item.status !== 'DELETED' && item.dueDate > dueDate)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id))[0];
      const providerNextDue = String(provider.nextDueDate || '');
      const nextDueDate = futureCharge?.dueDate
        || (validCalendarDate(providerNextDue) && providerNextDue > dueDate ? providerNextDue : null);
      const providerValue = provider.value == null ? NaN : Number(provider.value);
      const { data: outcome, error: reconcileError } = await admin.rpc('reconcile_due_plan_downgrade', {
        p_subscription_id: subscription.id,
        p_provider_subscription_id: subscriptionId,
        p_payment_id: charge.id,
        p_due_date: dueDate,
        p_payment_status: charge.status,
        p_payment_value_cents: charge.valueCents,
        p_provider_status: String(provider.status || ''),
        p_provider_value_cents: Number.isFinite(providerValue) && providerValue >= 0
          ? Math.round(providerValue * 100) : null,
        p_provider_external_reference: String(provider.externalReference || ''),
        p_next_due_date: nextDueDate,
      });
      if (reconcileError) throw reconcileError;
      if (outcome?.result === 'applied') summary.applied += 1;
      else if (outcome?.result === 'deferred') summary.deferred += 1;
      else summary.pending += 1;
    } catch (error) {
      summary.failed += 1;
      console.error('Due Asaas downgrade reconciliation failed:', subscription.negocio_id, error);
    }
  }
  return summary;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405, req);

  const workerSecret = req.headers.get('x-billing-worker-secret') || '';
  if (!workerSecret) return jsonResponse({ error: 'unauthorized' }, 401, req);

  const admin = createAdminClient();
  const { data: authorized, error: authorizationError } = await admin.rpc('validate_billing_worker_secret', {
    p_worker_secret: workerSecret,
  });
  if (authorizationError) {
    console.error('billing worker authentication failed:', authorizationError);
    return jsonResponse({ error: 'billing_worker_authentication_failed' }, 500, req);
  }
  if (authorized !== true) return jsonResponse({ error: 'unauthorized' }, 401, req);

  const body = await req.json().catch(() => ({}));
  const billingWorkerRunId = typeof body?.billing_worker_run_id === 'string'
    ? body.billing_worker_run_id : null;
  const requestedLimit = Number(body?.limit || 20);
  const limit = Math.min(50, Math.max(1, Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : 20));
  const syncLimit = Math.min(25, Math.max(1, Number(body?.sync_limit || 10)));
  const workerId = `edge:${crypto.randomUUID()}`;

  let paidUpgradeScan = { checked: 0, queued: 0, pending: 0 };
  try {
    paidUpgradeScan = await reconcilePaidUpgradeCheckouts(admin);
  } catch (error) {
    console.error('paid upgrade checkout scan failed:', error);
    paidUpgradeScan.pending += 1;
  }

  const { data: events, error: claimError } = await admin.rpc('claim_billing_events', {
    p_worker_secret: workerSecret,
    p_worker_id: workerId,
    p_limit: limit,
  });
  if (claimError) {
    const status = String(claimError.message || '').includes('invalid_worker_secret') ? 401 : 500;
    console.error('billing event claim failed:', claimError);
    return jsonResponse({ error: status === 401 ? 'unauthorized' : 'billing_event_claim_failed' }, status, req);
  }

  const summary = {
    claimed: Array.isArray(events) ? events.length : 0,
    processed: 0,
    ignored: 0,
    retryable: 0,
    dead_letter: 0,
    provider_sync: {
      claimed: 0,
      synced: 0,
      retryable: 0,
      failed: 0,
    },
    subscription_reconciliation: { checked: 0, confirmed: 0, pending: 0 },
    plan_downgrades: { checked: 0, applied: 0, deferred: 0, pending: 0, failed: 0 },
    owner_billing_actions: { checked: 0, finalized: 0, released: 0, pending: 0 },
    paid_upgrade_checkouts: paidUpgradeScan,
    overdue_subscription_suspension: null as Record<string, unknown> | null,
  };

  for (const event of events || []) {
    try {
      if (String(event.provider || '').toLowerCase() !== 'asaas') {
        throw new Error(`unsupported_billing_provider:${String(event.provider || '')}`);
      }

      const outcome = await processAsaasBillingEvent(admin, event);
      if (outcome.subscriptionToReconcile) {
        await reconcileAsaasSubscriptionState(
          admin,
          outcome.subscriptionToReconcile.negocioId,
          outcome.subscriptionToReconcile.subscriptionId,
          {
            eventId: String(event.id),
            eventType: String(event.event_type || '').toUpperCase(),
            eventPayload: (event.payload || {}) as Record<string, unknown>,
            attemptCount: Number(event.attempt_count || 0),
          },
        );
      }
      const { error: finishError } = await admin.rpc('finish_billing_event', {
        p_event_id: event.id,
        p_outcome: outcome.outcome,
        p_note: outcome.note || null,
      });
      if (finishError) throw finishError;
      summary[outcome.outcome] += 1;
    } catch (error) {
      const message = errorMessage(error);
      console.error(`billing event ${String(event.id || '')} failed:`, error);
      const { data: retryResult, error: retryError } = await admin.rpc('retry_billing_event', {
        p_event_id: event.id,
        p_error: message,
      });
      if (retryError) {
        console.error(`billing event ${String(event.id || '')} retry scheduling failed:`, retryError);
        continue;
      }
      if (retryResult?.processing_status === 'dead_letter') summary.dead_letter += 1;
      else summary.retryable += 1;
    }
  }

  try {
    summary.provider_sync = await processPendingSubscriptionProviderSyncs(admin, workerSecret, syncLimit);
  } catch (error) {
    const status = String(errorMessage(error)).includes('invalid_worker_secret') ? 401 : 500;
    console.error('subscription provider sync claim failed:', error);
    if (status === 401) return jsonResponse({ error: 'unauthorized' }, 401, req);
  }

  try {
    summary.plan_downgrades = await reconcileDuePlanDowngrades(admin);
  } catch (error) {
    console.error('Due Asaas downgrade scan failed:', error);
    summary.plan_downgrades.failed += 1;
  }

  try {
    summary.owner_billing_actions = await reconcilePendingOwnerBillingActions(admin);
  } catch (error) {
    console.error('owner billing action scan failed:', error);
    summary.owner_billing_actions.pending += 1;
  }
  // Webhooks are signals, not the sole source of provider state. The worker's
  // hourly safety run also reconciles missing webhooks and transient API errors.
  const staleBefore = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data: pendingReactivations, error: pendingReactivationsError } = await admin
    .from('business_subscriptions')
    .select('negocio_id, provider_subscription_id, reactivation_request_id, reactivation_requested_at')
    .eq('provider', 'asaas')
    .not('reactivation_request_id', 'is', null)
    .order('reactivation_requested_at', { ascending: true })
    .limit(5);
  const unconfirmedLimit = 5 - (pendingReactivations?.length || 0);
  const { data: unconfirmedSubscriptions, error: unconfirmedError } = unconfirmedLimit > 0
    ? await admin
      .from('business_subscriptions')
      .select('negocio_id, provider_subscription_id, reactivation_request_id, reactivation_requested_at')
      .eq('provider', 'asaas')
      .not('provider_subscription_id', 'is', null)
      .is('provider_status', null)
      .order('created_at', { ascending: true })
      .limit(unconfirmedLimit)
    : { data: [], error: null };
  const remaining = unconfirmedLimit - (unconfirmedSubscriptions?.length || 0);
  const { data: staleSubscriptions, error: staleError } = remaining > 0
    ? await admin
      .from('business_subscriptions')
      .select('negocio_id, provider_subscription_id, reactivation_request_id, reactivation_requested_at')
      .eq('provider', 'asaas')
      .not('provider_subscription_id', 'is', null)
      .is('reactivation_request_id', null)
      .neq('provider_status', 'DELETED')
      .lt('provider_status_confirmed_at', staleBefore)
      .order('provider_status_confirmed_at', { ascending: true })
      .limit(remaining)
    : { data: [], error: null };
  if (pendingReactivationsError || unconfirmedError || staleError) {
    console.error('stale Asaas subscription lookup failed:', pendingReactivationsError || unconfirmedError || staleError);
    summary.subscription_reconciliation.pending += 1;
  } else {
    for (const subscription of [
      ...(pendingReactivations || []),
      ...(unconfirmedSubscriptions || []),
      ...(staleSubscriptions || []),
    ]) {
      summary.subscription_reconciliation.checked += 1;
      let providerConfirmed = false;
      let completedWithoutError = false;
      try {
        const observed = await reconcileAsaasSubscriptionState(
          admin, subscription.negocio_id, subscription.provider_subscription_id,
        );
        providerConfirmed = true;
        if (observed === 'INACTIVE' && subscription.reactivation_request_id
          && Date.now() - Date.parse(subscription.reactivation_requested_at || '') > 10 * 60 * 1000) {
          const { error: abortError } = await admin.rpc('abort_asaas_subscription_reactivation', {
            p_negocio_id: subscription.negocio_id,
            p_request_id: subscription.reactivation_request_id,
            p_reason: 'provider_still_inactive_after_timeout',
          });
          if (abortError) throw abortError;
        }
        completedWithoutError = true;
        summary.subscription_reconciliation.confirmed += 1;
      } catch (error) {
        if (subscription.reactivation_request_id) {
          await recordVerificationFailure(admin, 'reactivation', String(subscription.negocio_id), String(subscription.reactivation_request_id),
            error instanceof AsaasObservationUnavailable ? 'provider_unavailable' : 'local_reconciliation_failed', error);
        }
        summary.subscription_reconciliation.pending += 1;
        console.error('Asaas subscription reconciliation pending:', subscription.negocio_id, error);
      } finally {
        if (providerConfirmed && completedWithoutError && subscription.reactivation_request_id) {
          await recordPendingReturn(admin, 'reactivation', String(subscription.negocio_id), String(subscription.reactivation_request_id));
        }
      }
    }
  }

  // This scan runs only from its dedicated daily Cron invocation at 04:05 in Sao Paulo.
  if (body?.run_overdue_subscription_suspension === true) {
    try {
      summary.overdue_subscription_suspension = await runOverdueSubscriptionSuspension(admin);
    } catch (error) {
      console.error('Daily overdue subscription suspension scan failed:', error);
      summary.overdue_subscription_suspension = { error: errorMessage(error) };
    }
  }

  if (billingWorkerRunId) {
    const { error: completionError } = await admin.rpc('complete_billing_worker_run', {
      p_run_id: billingWorkerRunId,
      p_summary: summary,
    });
    if (completionError) {
      console.error('billing worker run completion failed:', completionError);
      return jsonResponse({ error: 'billing_worker_completion_failed' }, 500, req);
    }
  }

  return jsonResponse(summary, 200, req);
});
