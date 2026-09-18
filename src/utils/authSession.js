import { supabase } from '../supabase';

let refreshPromise = null;

export function errorChainText(error, depth = 0) {
  if (!error || depth > 3) return '';
  const current = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''} ${error?.code || ''} ${error?.status || ''}`;
  return `${current} ${errorChainText(error?.cause, depth + 1)}`;
}

export function isAuthSessionError(error) {
  const text = errorChainText(error).toLowerCase();
  return Number(error?.status) === 401
    || Number(error?.cause?.status) === 401
    || Number(error?.context?.status) === 401
    || Number(error?.cause?.context?.status) === 401
    || text.includes('pgrst301')
    || text.includes('pgrst303')
    || text.includes('jwt')
    || text.includes('invalid token')
    || text.includes('not authenticated')
    || text.includes('refresh token')
    || text.includes('session not found')
    || text.includes('session_not_found')
    || text.includes('not_authenticated');
}

function authSessionError(message, cause = null) {
  const error = new Error(message);
  error.code = message;
  if (cause) error.cause = cause;
  return error;
}

export async function refreshCurrentSession(currentSession = null) {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const session = currentSession || (await supabase.auth.getSession()).data?.session;
    if (!session?.user?.id) throw authSessionError('not_authenticated');

    const { data, error } = await supabase.auth.refreshSession(session);
    if (error) throw authSessionError('auth_session_refresh_failed', error);

    const freshSession = data?.session || null;
    if (!freshSession?.access_token || !freshSession?.user?.id) {
      throw authSessionError('not_authenticated');
    }

    return freshSession;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function signOutLocalSession() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    await supabase.auth.signOut();
  }
}
