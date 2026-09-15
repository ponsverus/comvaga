import { jsonResponse } from '../_shared/cors.ts';
import { processAsaasBillingEvent } from '../_shared/asaas-billing.ts';
import { processPendingSubscriptionProviderSyncs } from '../_shared/billing-provider-sync.ts';
import { createAdminClient } from '../_shared/supabase.ts';

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || 'billing_event_processing_failed');
  }
  return String(error || 'billing_event_processing_failed');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405, req);

  const workerSecret = req.headers.get('x-billing-worker-secret') || '';
  if (!workerSecret) return jsonResponse({ error: 'unauthorized' }, 401, req);

  const body = await req.json().catch(() => ({}));
  const requestedLimit = Number(body?.limit || 20);
  const limit = Math.min(50, Math.max(1, Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : 20));
  const syncLimit = Math.min(25, Math.max(1, Number(body?.sync_limit || 10)));
  const workerId = `edge:${crypto.randomUUID()}`;
  const admin = createAdminClient();

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
  };

  for (const event of events || []) {
    try {
      if (String(event.provider || '').toLowerCase() !== 'asaas') {
        throw new Error(`unsupported_billing_provider:${String(event.provider || '')}`);
      }

      const outcome = await processAsaasBillingEvent(admin, event);
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

  return jsonResponse(summary, 200, req);
});
