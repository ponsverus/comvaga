import { getCorsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  providerSyncErrorMessage,
  runImmediateSubscriptionProviderSync,
} from '../_shared/billing-provider-sync.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase.ts';

function asText(value: unknown) {
  return String(value || '').trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405, req);

  try {
    const authorization = req.headers.get('authorization') || '';
    if (!authorization.toLowerCase().startsWith('bearer ')) {
      return jsonResponse({ error: 'not_authenticated' }, 401, req);
    }

    const body = await req.json().catch(() => ({}));
    const negocioId = asText(body?.negocio_id);
    if (!negocioId) return jsonResponse({ error: 'missing_required_fields' }, 400, req);

    const userClient = createUserClient(authorization);
    const admin = createAdminClient();
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user?.id) return jsonResponse({ error: 'not_authenticated' }, 401, req);

    const { data: cancelStatus, error: cancelError } = await admin.rpc('cancel_business_plan_downgrade', {
      p_negocio_id: negocioId,
      p_actor_id: authData.user.id,
      p_provider_payload: {
        source: 'owner_dashboard',
        requested_operation: 'restore_current_plan_value',
      },
    });
    if (cancelError) throw cancelError;

    const syncResult = await runImmediateSubscriptionProviderSync(
      admin,
      cancelStatus,
      'downgrade_cancel',
    );
    if (syncResult.providerSyncError) {
      console.error('downgrade cancel provider sync deferred:', syncResult.providerSyncError);
    }

    return jsonResponse({
      action: 'downgrade_canceled',
      billing_status: syncResult.billingStatus || cancelStatus,
      provider_sync_deferred: Boolean(syncResult.providerSyncError),
    }, 200, req);
  } catch (error) {
    console.error('asaas-cancel-downgrade failed:', error);
    return jsonResponse({ error: providerSyncErrorMessage(error, 'cancel_downgrade_failed') }, 400, req);
  }
});
