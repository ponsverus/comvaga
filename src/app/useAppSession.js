import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { isPasswordRecoveryUrl } from '../utils/auth';
import { fetchUserAccessProfile, isValidProfessionalRole, isValidType, normalizeOnboardingStatus } from '../utils/profileAccess';
import { isAuthSessionError, refreshCurrentSession, signOutLocalSession } from '../utils/authSession';
import { sleep } from '../utils/async';

const PROFILE_CONFIRM_ERROR_MESSAGE = 'Ocorreu um erro ao confirmar seu perfil. Tente novamente em alguns segundos.';

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
  const profileLoadingUserRef = useRef(null);
  const inRecoveryRef   = useRef(inRecovery);

  const safeSet = useCallback((fn) => {
    if (aliveRef.current) fn();
  }, []);

  const setRecoveryMode = useCallback((next) => {
    inRecoveryRef.current = !!next;
    setInRecovery(!!next);
  }, []);

  const handleLocalSessionEnded = useCallback(async (redirectTo = '/login') => {
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
      setPostLogoutRedirect(safeRedirect);
      loadedUserRef.current = null;
    });
  }, [safeSet, setRecoveryMode]);

  const loadProfile = useCallback(async (sessionUser, currentSession = null) => {
    if (!sessionUser?.id) return null;
    if (profileLoadingUserRef.current === sessionUser.id) return null;
    profileLoadingUserRef.current = sessionUser.id;

    safeSet(() => {
      setTypeLoading(true);
      setUserType(null);
      setOnboardingStatus(null);
      setProfessionalRole(null);
      setAccessState('active');
    });

    try {
      const sessionToCheck = currentSession || (await supabase.auth.getSession()).data?.session;
      suppressAuthRef.current = true;
      const freshSession = await refreshCurrentSession(sessionToCheck);
      suppressAuthRef.current = false;

      if (!freshSession?.access_token || !freshSession?.user?.id) {
        throw new Error('not_authenticated');
      }

      const activeUser = freshSession.user;

      if (activeUser.id !== sessionUser.id) {
        throw new Error('auth_session_user_mismatch');
      }

      safeSet(() => setUser(activeUser));
      const profile = await getUserProfileRobust(activeUser);

      if (!profile) {
        await supabase.auth.signOut();
        safeSet(() => {
          setUser(null);
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
      suppressAuthRef.current = false;
      if (isAuthSessionError(e)) {
        await handleLocalSessionEnded('/login');
        return null;
      }
      safeSet(() => {
        setUserType(null);
        setOnboardingStatus(null);
        setProfessionalRole(null);
        setAccessState('active');
        setFatalError(PROFILE_CONFIRM_ERROR_MESSAGE);
      });
      console.error('Profile load error:', e);
      return null;
    } finally {
      if (profileLoadingUserRef.current === sessionUser.id) {
        profileLoadingUserRef.current = null;
      }
      suppressAuthRef.current = false;
      safeSet(() => setTypeLoading(false));
    }
  }, [handleLocalSessionEnded, safeSet]);

  useEffect(() => {
    aliveRef.current = true;

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (!aliveRef.current) return;
        if (suppressAuthRef.current) return;

        if (event === 'PASSWORD_RECOVERY') {
          safeSet(() => { setRecoveryMode(true); setBooting(false); });
          return;
        }

        if (event === 'INITIAL_SESSION') {
          const sessionUser = session?.user || null;
          if (isPasswordRecoveryUrl() || inRecoveryRef.current) {
            safeSet(() => {
              setRecoveryMode(true);
              setUser(sessionUser);
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

          if (!sessionUser) {
            safeSet(() => {
              setUser(null);
              setUserType(null);
              setOnboardingStatus(null);
              setProfessionalRole(null);
              setAccessState('active');
              setBooting(false);
            });
            return;
          }

          setUser(sessionUser);
          if (loadedUserRef.current !== sessionUser.id) await loadProfile(sessionUser, session);
          safeSet(() => setBooting(false));
          return;
        }

        if (inRecoveryRef.current) {
          safeSet(() => {
            setUser(session?.user || null);
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

        const sessionUser = session?.user || null;
        if (!sessionUser) {
          loadedUserRef.current = null;
          setUser(null);
          setUserType(null);
          setOnboardingStatus(null);
          setProfessionalRole(null);
          setAccessState('active');
          setFatalError(null);
          return;
        }

        setUser(sessionUser);
        if (loadedUserRef.current !== sessionUser.id) await loadProfile(sessionUser, session);
      });

    return () => { aliveRef.current = false; subscription?.unsubscribe(); };
  }, [loadProfile, safeSet, setRecoveryMode]);

  const handleLogin = useCallback((userData, type, nextOnboardingStatus = 'completed', nextAccessState = 'active', nextProfessionalRole = null) => {
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
    setPostLogoutRedirect(null);
  }, []);

  const handleLogout = useCallback(async (redirectTo = '/login') => {
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
    safeSet(() => { setFatalError(null); setBooting(true); });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        safeSet(() => {
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
      await loadProfile(session.user);
      safeSet(() => setBooting(false));
    } catch {
      safeSet(() => {
        setUser(null);
        setUserType(null);
        setOnboardingStatus(null);
        setProfessionalRole(null);
        setAccessState('active');
        setFatalError(PROFILE_CONFIRM_ERROR_MESSAGE);
        setBooting(false);
      });
    }
  }, [safeSet, loadProfile]);

  return {
    user, userType, onboardingStatus, professionalRole, accessState,
    booting, typeLoading, fatalError, inRecovery, postLogoutRedirect,
    suppressAuthRef, setRecoveryMode, setPostLogoutRedirect,
    handleLocalSessionEnded, handleLogin, handleLogout, handleRetry,
  };
}
