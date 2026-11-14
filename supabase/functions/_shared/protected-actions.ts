import { createProtectedActionHandler, type ProtectedDomain } from './protected-actions-handler.ts';
import { createAdminClient, createUserClient } from './supabase.ts';

export function serveProtectedActions(domain: ProtectedDomain) {
  const admin = createAdminClient();
  Deno.serve(createProtectedActionHandler(domain, {
    authenticate: async (authorization) => {
      const { data, error } = await createUserClient(authorization).auth.getUser();
      return error ? null : data.user?.id || null;
    },
    consume: async (actor, requestedDomain, action) => {
      return await admin.rpc('consume_protected_action_attempt', {
        p_actor: actor,
        p_domain: requestedDomain,
        p_action: action,
      });
    },
    execute: async (actor, action, params) => {
      return await admin.rpc('execute_protected_action', {
        p_actor: actor,
        p_action: action,
        p_params: params,
      });
    },
  }));
}
