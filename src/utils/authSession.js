import { supabase } from '../supabase';
import { withTimeout } from './withTimeout';

let refreshPromise = null;

function errorChainText(error, depth = 0) {
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
  const text = errorChainText(error).toLowerCase();
  const hasSpecificAuthText = /\b(?:jwt\s+(?:expired|invalid)|invalid\s+jwt|token\s+is\s+expired|not\s+authenticated)\b/.test(text)
    || /\b(?:refresh\s+token|session)[\s_-]+(?:not\s+found|expired|invalid|revoked)\b/.test(text);

  return hasStatus401 || isRejectedJwtError(error) || hasSpecificAuthText || error?.code === 'not_authenticated';
}

function isRejectedJwtError(error) {
  return errorChainHas(error, (item) => item?.code === 'PGRST301' || item?.code === 'PGRST303');
}

function isRejectedRefreshToken(error) {
  return errorChainHas(error, (item) => (
    item?.code === 'refresh_token_not_found' || item?.code === 'refresh_token_already_used'
  ));
}

function authSessionError(message, cause = null) {
  const error = new Error(message);
  error.code = message;
  if (cause) error.cause = cause;
  return error;
}

export async function getCurrentSession() {
  let { data, error } = await supabase.auth.getSession();
  if (error?.name === 'AuthRefreshDiscardedError') {
    ({ data, error } = await supabase.auth.getSession());
  }
  if (error) throw authSessionError('auth_session_unavailable', error);
  return data?.session || null;
}

export async function refreshCurrentSession(currentSession = null) {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const session = currentSession || await getCurrentSession();
    if (!session?.user?.id) throw authSessionError('not_authenticated');

    const { data, error } = await supabase.auth.refreshSession(session);
    if (error?.name === 'AuthRefreshDiscardedError') {
      const latestSession = await getCurrentSession();
      if (latestSession?.user?.id === session.user.id && latestSession.access_token) {
        return latestSession;
      }
      throw authSessionError('not_authenticated', error);
    }
    if (error) {
      if (isRejectedRefreshToken(error)) {
        const latestSession = await getCurrentSession().catch(() => null);
        if (latestSession?.user?.id === session.user.id
          && latestSession.access_token !== session.access_token) {
          return latestSession;
        }
        if (latestSession?.access_token === session.access_token) {
          await signOutLocalSession();
        }
      }
      throw authSessionError('auth_session_refresh_failed', error);
    }

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

export async function withPublicAuthRetry(requestFactory, ms = 7000, label = 'public-request') {
  const result = await withTimeout(requestFactory(), ms, label);
  if (!isRejectedJwtError(result?.error)) return result;

  const session = await getCurrentSession();
  if (session) {
    try {
      await refreshCurrentSession(session);
    } catch (error) {
      if (error?.code !== 'not_authenticated' && !isRejectedRefreshToken(error)) throw error;
      if (await getCurrentSession()) throw error;
    }
  }

  return withTimeout(requestFactory(), ms, `${label}:auth-retry`);
}

export async function signOutLocalSession() {
  await supabase.auth.signOut({ scope: 'local' });
}
