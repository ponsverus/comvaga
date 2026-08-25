import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './supabase';
import { isPasswordRecoveryUrl } from './utils/auth';
import { fetchUserAccessProfile, isValidProfessionalRole, isValidType, normalizeOnboardingStatus } from './utils/profileAccess';
import { ptBR } from './feedback/messages/ptBR.js';
import WhatsAppFloatingButton from './components/WhatsAppFloatingButton';

import FeedbackProvider from './feedback/FeedbackProvider';

import Home                   from './pages/Home';
import Login                  from './pages/Login';
import SignupChoice           from './pages/SignupChoice';
import SignupClient           from './pages/SignupClient';
import SignupProfessional     from './pages/SignupProfessional';
import CadastroParceiro       from './pages/CadastroParceiro';
import LoginParceiro          from './pages/LoginParceiro';
import ResetPassword          from './pages/ResetPassword';
import NotFound               from './pages/NotFound';
import About                  from './pages/About';
import PrivacyPolicy          from './pages/PrivacyPolicy';
import TermsOfUse             from './pages/TermsOfUse';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LAZY_RELOAD_STORAGE_KEY = 'comvaga:lazy-route-reload:v1';

function isRecoverableLazyLoadError(error) {
  const text = `${error?.name || ''} ${error?.message || ''}`.toLowerCase();
  return text.includes('failed to fetch dynamically imported module')
    || text.includes('importing a module script failed')
    || text.includes('error loading dynamically imported module')
    || text.includes('loading chunk')
    || text.includes('chunkloaderror')
    || text.includes('did not return a default export')
    || text.includes("cannot read properties of undefined (reading 'default')");
}

function reloadOnceForLazyRoute(pageName) {
  if (typeof window === 'undefined') return false;

  try {
    const key = `${LAZY_RELOAD_STORAGE_KEY}:${window.location.pathname}:${pageName}`;
    if (window.sessionStorage?.getItem(key) === '1') return false;
    window.sessionStorage?.setItem(key, '1');
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

function lazyRoute(loader, pageName) {
  return lazy(async () => {
    try {
      const mod = await loader();
      if (mod?.default) return mod;
      throw new TypeError(`Lazy route "${pageName}" did not return a default export.`);
    } catch (error) {
      if (isRecoverableLazyLoadError(error) && reloadOnceForLazyRoute(pageName)) {
        return new Promise(() => {});
      }
      throw error;
    }
  });
}

const Dashboard                 = lazyRoute(() => import('./pages/Dashboard'), 'Dashboard');
const Vitrine                   = lazyRoute(() => import('./pages/Vitrine'), 'Vitrine');
const ClientArea                = lazyRoute(() => import('./pages/ClientArea'), 'ClientArea');
const CriarNegocio              = lazyRoute(() => import('./pages/CriarNegocio'), 'CriarNegocio');
const ProfessionalAccount       = lazyRoute(() => import('./pages/ProfessionalAccount'), 'ProfessionalAccount');
const SelecionarNegocio         = lazyRoute(() => import('./pages/SelecionarNegocio'), 'SelecionarNegocio');
const SelecionarNegocioParceiro = lazyRoute(() => import('./pages/SelecionarNegocioParceiro'), 'SelecionarNegocioParceiro');
const SignupProfessionalResume  = lazyRoute(() => import('./pages/SignupProfessionalResume'), 'SignupProfessionalResume');

function isAuthJwtError(error) {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''} ${error?.code || ''}`.toLowerCase();
  return Number(error?.status) === 401
    || text.includes('jwt')
    || text.includes('invalid token')
    || text.includes('not authenticated');
}

function FullScreenLoading({ text = 'CARREGANDO...' }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <div className="text-primary text-xl">{text}</div>
      </div>
    </div>
  );
}

function FullScreenError({ message, onRetry }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-dark-100 border border-red-500/40 rounded-custom p-8 text-center">
        <h1 className="text-2xl font-normal text-white mb-2">Algo deu errado</h1>
        <p className="text-gray-400 mb-6 whitespace-pre-wrap">{message}</p>
        <button onClick={onRetry} className="w-full px-6 py-3 bg-primary/20 border border-primary/50 text-primary rounded-button">
          TENTAR NOVAMENTE
        </button>
      </div>
    </div>
  );
}

const ROUTE_LOAD_FAILED_MESSAGE =
  ptBR.alerts?.route_load_failed?.body ||
  'O carregamento da tela falhou. Por favor, atualize a pagina e tente novamente.';

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('Route render error:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <FullScreenError
          message={ROUTE_LOAD_FAILED_MESSAGE}
          onRetry={() => window.location.reload()}
        />
      );
    }

    return this.props.children;
  }
}

function RouteErrorGuard({ children }) {
  const { pathname } = useLocation();
  return <RouteErrorBoundary key={pathname}>{children}</RouteErrorBoundary>;
}

async function getUserProfileRobust(authUser) {
  if (!authUser?.id) return null;

  const delays = [100, 250, 500];
  let lastErr = null;

  for (let i = 0; i < delays.length; i++) {
    try {
      const profile = await fetchUserAccessProfile(authUser.id);
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

function ScrollToTopOnRouteChange() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function RecoveryWatcher({ onChange }) {
  const loc = useLocation();
  useEffect(() => {
    onChange(isPasswordRecoveryUrl());
  }, [loc.pathname, loc.search, loc.hash, onChange]);
  return null;
}

function LogoutRedirectResetter({ redirectPath, onClear }) {
  const loc = useLocation();

  useEffect(() => {
    if (!redirectPath) return;
    if (loc.pathname === redirectPath) onClear();
  }, [loc.pathname, redirectPath, onClear]);

  return null;
}

function SelecionarNegocioRouteGuard({ user, onLogout, professionalRole }) {
  const [loading, setLoading] = useState(true);
  const [ownerBusinessCount, setOwnerBusinessCount] = useState(0);

  useEffect(() => {
    let active = true;

    if (!user?.id) {
      setOwnerBusinessCount(0);
      setLoading(false);
      return () => { active = false; };
    }

    supabase
      .from('negocios')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .then(({ count, error }) => {
        if (!active) return;
        if (error) {
          setOwnerBusinessCount(0);
          setLoading(false);
          return;
        }
        setOwnerBusinessCount(Number(count || 0));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  if (loading) return <FullScreenLoading text="CARREGANDO..." />;
  if (professionalRole === 'partner') return <Navigate to="/selecionar-negocio-parceiro" replace />;
  if (ownerBusinessCount > 1) return <SelecionarNegocio user={user} onLogout={onLogout} professionalRole={professionalRole} />;
  if (ownerBusinessCount === 0) return <Navigate to="/conta-profissional" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
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
  const inRecoveryRef   = useRef(inRecovery);

  const isLoggedIn = !!user;
  const metadataPartnerSignup = user?.user_metadata?.partner_signup === true
    || String(user?.user_metadata?.partner_signup || '').toLowerCase() === 'true';
  const isPartnerSignup = professionalRole === 'partner' || metadataPartnerSignup;

  const safeSet = useCallback((fn) => {
    if (aliveRef.current) fn();
  }, []);

  const setRecoveryMode = useCallback((next) => {
    inRecoveryRef.current = !!next;
    setInRecovery(!!next);
  }, []);

  const getPostLoginPath = useCallback((type, currentAccessState, status, role = professionalRole) => {
    if (type !== 'professional') return '/minha-area';
    if (role === 'partner') return '/selecionar-negocio-parceiro';
    if (currentAccessState === 'owner_resume' || normalizeOnboardingStatus(type, status) === 'pending') {
      return '/cadastro/profissional/retomada';
    }
    return '/dashboard';
  }, [professionalRole]);

  const loadProfile = useCallback(async (sessionUser) => {
    if (!sessionUser?.id) return null;

    safeSet(() => {
      setTypeLoading(true);
      setUserType(null);
      setOnboardingStatus(null);
      setProfessionalRole(null);
      setAccessState('active');
    });

    try {
      const profile = await getUserProfileRobust(sessionUser);

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

      loadedUserRef.current = sessionUser.id;
      safeSet(() => {
        setUserType(profile.type);
        setOnboardingStatus(profile.onboardingStatus);
        setProfessionalRole(isValidProfessionalRole(profile.professionalRole) ? profile.professionalRole : null);
        setAccessState(profile.accessState || 'active');
        setFatalError(null);
      });
      return profile;
    } catch (e) {
      if (isAuthJwtError(e)) {
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          try { await supabase.auth.signOut(); } catch (signOutError) {
            console.warn('Erro ao sair da conta.', signOutError);
          }
        }
        safeSet(() => {
          setUser(null);
          setUserType(null);
          setOnboardingStatus(null);
          setProfessionalRole(null);
          setAccessState('active');
          setFatalError(null);
          setPostLogoutRedirect('/login');
          loadedUserRef.current = null;
        });
        return null;
      }
      safeSet(() => {
        setUserType(null);
        setOnboardingStatus(null);
        setProfessionalRole(null);
        setAccessState('active');
        setFatalError('Falha ao carregar perfil.');
      });
      console.error('Profile load error:', e);
      return null;
    } finally {
      safeSet(() => setTypeLoading(false));
    }
  }, [safeSet]);

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
          if (loadedUserRef.current !== sessionUser.id) await loadProfile(sessionUser);
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
        if (loadedUserRef.current !== sessionUser.id) await loadProfile(sessionUser);
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
        setBooting(false);
      });
    }
  }, [safeSet, loadProfile]);

  if (booting) return <FullScreenLoading />;
  if (fatalError && !inRecovery) return <FullScreenError message={fatalError} onRetry={handleRetry} />;
  if (isLoggedIn && !userType && !inRecovery) return <FullScreenLoading text="CARREGANDO PERFIL..." />;

  return (
    <Router>
      <FeedbackProvider>
        <RecoveryWatcher onChange={setRecoveryMode} />
        <LogoutRedirectResetter redirectPath={postLogoutRedirect} onClear={() => setPostLogoutRedirect(null)} />
        <ScrollToTopOnRouteChange />
        <WhatsAppFloatingButton />

        <RouteErrorGuard>
          <Suspense fallback={<FullScreenLoading />}>
            <Routes>
            <Route path="/" element={<Home user={isLoggedIn ? user : null} userType={isLoggedIn ? userType : null} professionalRole={isLoggedIn ? professionalRole : null} onLogout={handleLogout} />} />

            <Route path="/privacidade" element={<PrivacyPolicy />} />
            <Route path="/termos" element={<TermsOfUse />} />
            <Route path="/sobre" element={<About />} />

            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/login" element={
              inRecovery ? <Login onLogin={handleLogin} inRecovery={true} />
              : isLoggedIn && userType ? <Navigate to={getPostLoginPath(userType, accessState, onboardingStatus)} />
              : <Login onLogin={handleLogin} inRecovery={false} />
            } />

            <Route path="/cadastro/parceiro" element={
              isLoggedIn && userType
                ? <Navigate to={getPostLoginPath(userType, accessState, onboardingStatus)} />
                : <CadastroParceiro onLogin={handleLogin} suppressAuthRef={suppressAuthRef} />
            } />

            <Route path="/login/parceiro" element={
              inRecovery
                ? <LoginParceiro onLogin={handleLogin} suppressAuthRef={suppressAuthRef} inRecovery={true} />
                : isLoggedIn && userType
                  ? <Navigate to={getPostLoginPath(userType, accessState, onboardingStatus)} />
                  : <LoginParceiro onLogin={handleLogin} suppressAuthRef={suppressAuthRef} />
            } />

            <Route path="/cadastro" element={
              isLoggedIn && userType
                ? <Navigate to={getPostLoginPath(userType, accessState, onboardingStatus)} />
                : <SignupChoice />
            } />

            <Route path="/cadastro/cliente" element={
              isLoggedIn && userType ? <Navigate to={getPostLoginPath(userType, accessState, onboardingStatus)} />
              : <SignupClient onLogin={handleLogin} />
            } />

            <Route path="/cadastro/profissional" element={
              isLoggedIn && userType ? <Navigate to={getPostLoginPath(userType, accessState, onboardingStatus)} />
              : <SignupProfessional onLogin={handleLogin} />
            } />

            <Route path="/cadastro/profissional/retomada" element={
              isLoggedIn ? (
                typeLoading ? <FullScreenLoading text="CARREGANDO..." />
                : userType === 'professional'
                  ? isPartnerSignup && accessState === 'owner_resume'
                    ? <Navigate to="/selecionar-negocio-parceiro" />
                    : accessState === 'owner_resume'
                    ? <SignupProfessionalResume user={user} onLogin={handleLogin} />
                    : <Navigate to={getPostLoginPath(userType, accessState, onboardingStatus)} />
                  : userType ? <Navigate to="/minha-area" />
                  : <Navigate to="/login" />
              ) : <Navigate to="/login" />
            } />

            <Route path="/dashboard" element={
              isLoggedIn ? (
                typeLoading ? <FullScreenLoading text="CARREGANDO..." />
                : userType === 'professional'
                  ? accessState === 'owner_resume'
                    ? <Navigate to={getPostLoginPath(userType, accessState, onboardingStatus)} />
                    : <Dashboard user={user} onLogout={handleLogout} userType={userType} professionalRole={professionalRole} />
                : userType ? <Navigate to="/minha-area" />
                : <Navigate to={postLogoutRedirect || "/login"} />
              ) : <Navigate to={postLogoutRedirect || "/login"} />
            } />

            <Route path="/minha-area" element={
              isLoggedIn ? (
                typeLoading ? <FullScreenLoading text="CARREGANDO..." />
                : userType === 'client' ? <ClientArea user={user} onLogout={handleLogout} userType={userType} />
                : userType ? <Navigate to={getPostLoginPath(userType, accessState, onboardingStatus)} />
                : <Navigate to="/login" />
              ) : <Navigate to="/login" />
            } />

            <Route path="/v/:slug" element={<Vitrine user={isLoggedIn ? user : null} userType={isLoggedIn ? userType : null} professionalRole={professionalRole} onLogout={handleLogout} />} />

            <Route path="/criar-negocio" element={
              isLoggedIn ? (
                typeLoading ? <FullScreenLoading text="CARREGANDO..." />
                : userType === 'professional'
                  ? accessState === 'owner_resume'
                    ? <Navigate to={getPostLoginPath(userType, accessState, onboardingStatus)} />
                    : professionalRole === 'partner'
                        ? <Navigate to="/selecionar-negocio-parceiro" replace />
                        : <CriarNegocio user={user} />
                : userType ? <Navigate to="/minha-area" />
                : <Navigate to={postLogoutRedirect || "/login"} />
              ) : <Navigate to={postLogoutRedirect || "/login"} />
            } />

            <Route path="/selecionar-negocio" element={
              isLoggedIn ? (
                typeLoading ? <FullScreenLoading text="CARREGANDO..." />
                : userType === 'professional'
                  ? accessState === 'owner_resume'
                    ? <Navigate to={getPostLoginPath(userType, accessState, onboardingStatus)} />
                    : <SelecionarNegocioRouteGuard user={user} onLogout={handleLogout} professionalRole={professionalRole} />
                : userType ? <Navigate to="/minha-area" />
                : <Navigate to={postLogoutRedirect || "/login"} />
              ) : <Navigate to={postLogoutRedirect || "/login"} />
            } />

            <Route path="/selecionar-negocio-parceiro" element={
              isLoggedIn ? (
                typeLoading ? <FullScreenLoading text="CARREGANDO..." />
                : userType === 'professional' && professionalRole === 'partner'
                  ? <SelecionarNegocioParceiro user={user} onLogout={handleLogout} />
                : userType === 'professional'
                  ? <Navigate to={getPostLoginPath(userType, accessState, onboardingStatus)} />
                : userType ? <Navigate to="/minha-area" />
                : <Navigate to={postLogoutRedirect || "/login"} />
              ) : <Navigate to={postLogoutRedirect || "/login/parceiro"} />
            } />

            <Route path="/conta-profissional" element={
              isLoggedIn ? (
                typeLoading ? <FullScreenLoading text="CARREGANDO..." />
                : userType === 'professional'
                  ? accessState === 'owner_resume' && professionalRole !== 'partner'
                    ? <Navigate to={getPostLoginPath(userType, accessState, onboardingStatus)} />
                    : <ProfessionalAccount user={user} onLogout={handleLogout} professionalRole={professionalRole} />
                : userType ? <Navigate to="/minha-area" />
                : <Navigate to={postLogoutRedirect || "/login"} />
              ) : <Navigate to={postLogoutRedirect || "/login"} />
            } />

            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RouteErrorGuard>
      </FeedbackProvider>
    </Router>
  );
}
