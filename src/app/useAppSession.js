import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { isPasswordRecoveryUrl } from '../utils/auth';
import { fetchUserAccessProfile, isValidProfessionalRole, isValidType, normalizeOnboardingStatus } from '../utils/profileAccess';
import { getCurrentSession, isAuthSessionError, signOutLocalSession } from '../utils/authSession';
import { sleep } from '../utils/async';

const PROFILE_CONFIRM_ERROR_MESSAGE = 'Ocorreu um erro ao confirmar seu perfil. Tente novamente em alguns segundos.';
const SESSION_CONFIRM_ERROR_MESSAGE = 'Ocorreu um erro ao confirmar sua sessão. Tente novamente em alguns segundos.';

async function getUserProfileRobust(authUser) {
  if (!authUser?.id) return null;

  const delays = [100, 250, 500];
  let lastErr = null;

  for (let i = 0; i < delays.length; i++) {
    try {
      const profile = await fetchUserAccessProfile();
      if (profile) return profile;
      if (i < delays.length - 1) await sleep(delays[i]);
    } catch (e) {
      lastErr = e;
      if (i < delays.length - 1) await sleep(delays[i]);
    }
  }

  if (lastErr) throw lastErr;
  return null;
}

export function useAppSession() {
  const [user,             setUser]             = useState(null);
  const [userType,         setUserType]         = useState(null);
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [professionalRole, setProfessionalRole] = useState(null);
  const [accessState,      setAccessState]      = useState('active');
  const [booting,          setBooting]          = useState(true);
  const [typeLoading,      setTypeLoading]      = useState(false);
  const [fatalError,       setFatalError]       = useState(null);
  const [inRecovery,       setInRecovery]       = useState(() => isPasswordRecoveryUrl());
  const [postLogoutRedirect, setPostLogoutRedirect] = useState(null);

  const aliveRef        = useRef(true);
  const loadedUserRef   = useRef(null);
  const suppressAuthRef = useRef(false);
  const authRunRef = useRef(0);
  const pendingProfileRef = useRef(null);
  const inRecoveryRef   = useRef(inRecovery);

  const safeSet = useCallback((fn) => {
    if (aliveRef.current) fn();
  }, []);

  const setRecoveryMode = useCallback((next) => {
    inRecoveryRef.current = !!next;
    setInRecovery(!!next);
  }, []);

  const handleLocalSessionEnded = useCallback(async (redirectTo = '/login') => {
    authRunRef.current += 1;
    const safeRedirect = (
      typeof redirectTo === 'string'
      && redirectTo.startsWith('/')
    )
      ? redirectTo
      : '/login';

    try {
      await signOutLocalSession();
    } catch (signOutError) {
      console.warn('Erro ao encerrar sessao local.', signOutError);
    }

    safeSet(() => {
      setRecoveryMode(false);
      setUser(null);
      setUserType(null);
      setOnboardingStatus(null);
      setProfessionalRole(null);
      setAccessState('active');
      setFatalError(null);
      setTypeLoading(false);
      setBooting(false);
      setPostLogoutRedirect(safeRedirect);
      loadedUserRef.current = null;
    });
  }, [safeSet, setRecoveryMode]);

  const loadProfile = useCallback(async (sessionUser, runId) => {
    if (!sessionUser?.id || runId !== authRunRef.current) return null;

    safeSet(() => {
      setTypeLoading(true);
      setUserType(null);
      setOnboardingStatus(null);
      setProfessionalRole(null);
      setAccessState('active');
    });

    try {
      let pending = pendingProfileRef.current;
      if (pending?.userId !== sessionUser.id) {
        pending = { userId: sessionUser.id, promise: getUserProfileRobust(sessionUser) };
        pendingProfileRef.current = pending;
      }
      let profile;
      try {
        profile = await pending.promise;
      } finally {
        if (pendingProfileRef.current === pending) pendingProfileRef.current = null;
      }
      if (runId !== authRunRef.current || !aliveRef.current || suppressAuthRef.current) return null;

      const currentSession = await getCurrentSession();
      if (runId !== authRunRef.current || !aliveRef.current || suppressAuthRef.current) return null;
      if (!currentSession?.user?.id) {
        safeSet(() => {
          loadedUserRef.current = null;
          setUser(null);
          setUserType(null);
          setOnboardingStatus(null);
          setProfessionalRole(null);
          setAccessState('active');
          setFatalError(null);
          setPostLogoutRedirect('/login');
        });
        return null;
      }
      if (currentSession.user.id !== sessionUser.id) {
        safeSet(() => {
          setUser(currentSession.user);
          setFatalError(SESSION_CONFIRM_ERROR_MESSAGE);
        });
        return null;
      }
      const activeUser = currentSession.user;

      if (!profile) {
        safeSet(() => {
          setUser(activeUser);
          setUserType(null);
          setOnboardingStatus(null);
          setProfessionalRole(null);
          setAccessState('active');
          loadedUserRef.current = null;
          setFatalError('Perfil inexistente. Crie ou conclua seu cadastro para prosseguir.');
        });
        return null;
      }

      loadedUserRef.current = activeUser.id;
      safeSet(() => {
        setUserType(profile.type);
        setOnboardingStatus(profile.onboardingStatus);
        setProfessionalRole(isValidProfessionalRole(profile.professionalRole) ? profile.professionalRole : null);
        setAccessState(profile.accessState);
        setFatalError(null);
      });
      return profile;
    } catch (e) {
      if (runId !== authRunRef.current || !aliveRef.current || suppressAuthRef.current) return null;
      let currentSession;
      try {
        currentSession = await getCurrentSession();
      } catch {
        currentSession = undefined;
      }
      if (runId !== authRunRef.current || !aliveRef.current || suppressAuthRef.current) return null;
      if (currentSession === null) {
        safeSet(() => {
          loadedUserRef.current = null;
          setUser(null);
          setUserType(null);
          setOnboardingStatus(null);
          setProfessionalRole(null);
          setAccessState('active');
          setFatalError(null);
          setPostLogoutRedirect('/login');
        });
        return null;
      }
      if (currentSession?.user?.id && currentSession.user.id !== sessionUser.id) {
        safeSet(() => {
          setUser(currentSession.user);
          setFatalError(SESSION_CONFIRM_ERROR_MESSAGE);
        });
        return null;
      }
      safeSet(() => {
        setUserType(null);
        setOnboardingStatus(null);
        setProfessionalRole(null);
        setAccessState('active');
        setFatalError(isAuthSessionError(e) || e?.code === 'auth_session_unavailable'
          ? SESSION_CONFIRM_ERROR_MESSAGE : PROFILE_CONFIRM_ERROR_MESSAGE);
      });
      console.error('Profile load error:', e);
      return null;
    } finally {
      if (runId === authRunRef.current) safeSet(() => setTypeLoading(false));
    }
  }, [safeSet]);

  useEffect(() => {
    aliveRef.current = true;

    const processAuthEvent = async (event, eventSession, runId) => {
      const isCurrent = () => aliveRef.current && runId === authRunRef.current && !suppressAuthRef.current;
      if (!isCurrent()) return;

      if (event === 'PASSWORD_RECOVERY' || isPasswordRecoveryUrl() || inRecoveryRef.current) {
        safeSet(() => {
          setRecoveryMode(true);
          setUser(eventSession?.user || null);
          setUserType(null);
          setOnboardingStatus(null);
          setProfessionalRole(null);
          setAccessState('active');
          setFatalError(null);
          setTypeLoading(false);
          setBooting(false);
        });
        return;
      }

      try {
        const currentSession = await getCurrentSession();
        if (!isCurrent()) return;
        const sessionUser = currentSession?.user || null;
        if (!sessionUser) {
          loadedUserRef.current = null;
          safeSet(() => {
            setUser(null);
            setUserType(null);
            setOnboardingStatus(null);
            setProfessionalRole(null);
            setAccessState('active');
            setFatalError(null);
            setTypeLoading(false);
          });
          return;
        }

        safeSet(() => setUser(sessionUser));
        if (loadedUserRef.current !== sessionUser.id) await loadProfile(sessionUser, runId);
      } catch (error) {
        if (!isCurrent()) return;
        safeSet(() => {
          setUser(eventSession?.user || null);
          setUserType(null);
          setOnboardingStatus(null);
          setProfessionalRole(null);
          setAccessState('active');
          setFatalError(SESSION_CONFIRM_ERROR_MESSAGE);
          setTypeLoading(false);
        });
        console.error('Session load error:', error);
      } finally {
        if (isCurrent()) safeSet(() => setBooting(false));
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!aliveRef.current || suppressAuthRef.current) return;
      if (event === 'SIGNED_OUT') loadedUserRef.current = null;
      const runId = ++authRunRef.current;
      // Defer Supabase reads until its auth callback has returned.
      setTimeout(() => { void processAuthEvent(event, session, runId); }, 0);
    });

    return () => { aliveRef.current = false; authRunRef.current += 1; subscription?.unsubscribe(); };
  }, [loadProfile, safeSet, setRecoveryMode]);

  const handleLogin = useCallback((userData, type, nextOnboardingStatus = 'completed', nextAccessState = 'active', nextProfessionalRole = null) => {
    authRunRef.current += 1;
    loadedUserRef.current = userData?.id || null;
    setUser(userData || null);
    setUserType(isValidType(type) ? type : null);
    setOnboardingStatus(
      isValidType(type)
        ? normalizeOnboardingStatus(type, nextOnboardingStatus)
        : null
    );
    setProfessionalRole(isValidProfessionalRole(nextProfessionalRole) ? nextProfessionalRole : null);
    setAccessState(nextAccessState);
    setFatalError(null);
    setTypeLoading(false);
    setBooting(false);
    setPostLogoutRedirect(null);
  }, []);

  const handleLogout = useCallback(async (redirectTo = '/login') => {
    authRunRef.current += 1;
    const safeRedirect = (
      typeof redirectTo === 'string'
      && redirectTo.startsWith('/')
    )
      ? redirectTo
      : '/login';

    loadedUserRef.current = null;
    setPostLogoutRedirect(safeRedirect);
    try {
      await supabase.auth.signOut();
    } finally {
      setRecoveryMode(false);
      setUser(null);
      setUserType(null);
      setOnboardingStatus(null);
      setProfessionalRole(null);
      setAccessState('active');
      setFatalError(null);
      setTypeLoading(false);
    }
  }, [setRecoveryMode]);

  const handleRetry = useCallback(async () => {
    const runId = ++authRunRef.current;
    safeSet(() => { setFatalError(null); setBooting(true); });
    try {
      const session = await getCurrentSession();
      if (runId !== authRunRef.current || !aliveRef.current) return;
      if (!session?.user) {
        safeSet(() => {
          loadedUserRef.current = null;
          setUser(null);
          setUserType(null);
          setOnboardingStatus(null);
          setProfessionalRole(null);
          setAccessState('active');
          setBooting(false);
        });
        return;
      }

      safeSet(() => setUser(session.user));
      await loadProfile(session.user, runId);
      if (runId === authRunRef.current) safeSet(() => setBooting(false));
    } catch (error) {
      if (runId !== authRunRef.current || !aliveRef.current) return;
      safeSet(() => {
        setUserType(null);
        setOnboardingStatus(null);
        setProfessionalRole(null);
        setAccessState('active');
        setFatalError(SESSION_CONFIRM_ERROR_MESSAGE);
        setBooting(false);
      });
      console.error('Session retry error:', error);
    }
  }, [safeSet, loadProfile]);

  return {
    user, userType, onboardingStatus, professionalRole, accessState,
    booting, typeLoading, fatalError, inRecovery, postLogoutRedirect,
    suppressAuthRef, setRecoveryMode, setPostLogoutRedirect,
    handleLocalSessionEnded, handleLogin, handleLogout, handleRetry,
  };
}
