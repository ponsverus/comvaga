import { supabase } from '../supabase';
import { withTimeout } from './withTimeout';

let refreshPromise = null;

export function errorChainText(error, depth = 0) {
  if (!error || depth > 3) return '';
  const current = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''} ${error?.code || ''} ${error?.status || ''}`;
  return `${current} ${errorChainText(error?.cause, depth + 1)}`;
}

function errorChainHas(error, predicate, depth = 0) {
  if (!error || depth > 3) return false;
  if (predicate(error)) return true;
  return errorChainHas(error?.cause, predicate, depth + 1)
    || errorChainHas(error?.context, predicate, depth + 1);
}

export function isAuthSessionError(error) {
  const hasStatus401 = errorChainHas(error, (item) => Number(item?.status) === 401);
  const hasKnownCode = errorChainHas(error, (item) => (
    item?.code === 'PGRST301'
    || item?.code === 'PGRST303'
  ));
  const text = errorChainText(error).toLowerCase();
  const hasSpecificAuthText = /\b(?:jwt\s+(?:expired|invalid)|invalid\s+jwt|token\s+is\s+expired|not\s+authenticated)\b/.test(text)
    || /\b(?:refresh\s+token|session)[\s_-]+(?:not\s+found|expired|invalid|revoked)\b/.test(text);

  return hasStatus401 || hasKnownCode || hasSpecificAuthText;
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

export async function withAuthRetry(requestFactory, ms = 7000, label = 'auth-request') {
  let result = await withTimeout(requestFactory(), ms, label);
  if (!isAuthSessionError(result?.error)) return result;

  await refreshCurrentSession();
  result = await withTimeout(requestFactory(), ms, `${label}:auth-retry`);
  return result;
}

export async function signOutLocalSession() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    await supabase.auth.signOut();
  }
}
