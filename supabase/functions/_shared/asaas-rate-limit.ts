import { jsonResponse } from './cors.ts';
import { createAdminClient } from './supabase.ts';

type AdminClient = ReturnType<typeof createAdminClient>;

export async function reserveOwnerAsaasAction(
  admin: AdminClient,
  actorId: string,
  action: 'recover' | 'reactivate' | 'create_checkout' | 'cancel_subscription' | 'cancel_checkout' | 'cancel_downgrade',
  req: Request,
): Promise<Response | null> {
  const { data, error } = await admin.rpc('reserve_owner_asaas_action', {
    p_actor: actorId,
    p_action: action,
  });
  if (error) throw error;
  if (data?.allowed === true) return null;
  const retryAfter = Math.max(1, Number(data?.retry_after) || 60);
  return jsonResponse({
    error: 'rate_limit_exceeded',
    retry_after_seconds: retryAfter,
  }, 429, req);
}
