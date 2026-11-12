import { Component, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { isPasswordRecoveryUrl } from '../utils/auth';
import { isAuthSessionError, withAuthRetry } from '../utils/authSession';
import { ptBR } from '../feedback/messages/ptBR.js';
import PublicBusinessPreview from '../components/PublicBusinessPreview.js';
import { SelecionarNegocio } from './lazyPages';

const PRIVATE_PROFILE_PATHS = new Set([
  '/cadastro/profissional/retomada', '/dashboard', '/minha-area',
  '/criar-negocio', '/selecionar-negocio', '/selecionar-negocio-parceiro',
  '/conta-profissional',
]);

export function FullScreenLoading({ text = 'CARREGANDO...' }) {
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

export function ProfileRouteGate({ fatalError, inRecovery, isLoggedIn, userType, onRetry, children }) {
  const { pathname } = useLocation();
  if (PRIVATE_PROFILE_PATHS.has(pathname)) {
    if (fatalError && !inRecovery) return <FullScreenError message={fatalError} onRetry={onRetry} />;
    if (isLoggedIn && !userType && !inRecovery) return <FullScreenLoading text="CARREGANDO PERFIL..." />;
  }
  return children;
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

export function RouteErrorGuard({ children }) {
  const { pathname } = useLocation();
  return <RouteErrorBoundary key={pathname}>{children}</RouteErrorBoundary>;
}

export function PublicRouteLoading({ initialBusiness }) {
  const { pathname } = useLocation();
  return initialBusiness && pathname === `/v/${initialBusiness.slug}`
    ? <PublicBusinessPreview business={initialBusiness} /> : <FullScreenLoading />;
}

export function ScrollToTopOnRouteChange() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export function RecoveryWatcher({ onChange }) {
  const loc = useLocation();
  useEffect(() => {
    onChange(isPasswordRecoveryUrl());
  }, [loc.pathname, loc.search, loc.hash, onChange]);
  return null;
}

export function LogoutRedirectResetter({ redirectPath, onClear }) {
  const loc = useLocation();

  useEffect(() => {
    if (!redirectPath) return;
    if (loc.pathname === redirectPath) onClear();
  }, [loc.pathname, redirectPath, onClear]);

  return null;
}

export function SelecionarNegocioRouteGuard({ user, onLogout, onSessionExpired, professionalRole }) {
  const [businessLoad, setBusinessLoad] = useState({ status: 'loading', negocios: [] });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    if (professionalRole === 'partner') return () => { active = false; };
    if (!user?.id) {
      void onSessionExpired?.('/login');
      return () => { active = false; };
    }

    setBusinessLoad({ status: 'loading', negocios: [] });
    (async () => {
      try {
        const { data, error } = await withAuthRetry(
          () => supabase
            .from('negocios')
            .select('id, nome, slug, logo_path, tipo_negocio, endereco_cep, endereco_rua, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_estado')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: true }),
          7000,
          'owner-business-list'
        );

        if (!active) return;
        if (error) throw error;
        if (!Array.isArray(data)) throw new Error('business_list_invalid_response');
        setBusinessLoad({ status: 'ready', negocios: data });
      } catch (error) {
        if (!active) return;
        if (isAuthSessionError(error)) {
          await onSessionExpired?.('/login');
          return;
        }
        setBusinessLoad({ status: 'error', negocios: [] });
      }
    })();

    return () => {
      active = false;
    };
  }, [onSessionExpired, professionalRole, retryKey, user?.id]);

  if (professionalRole === 'partner') return <Navigate to="/selecionar-negocio-parceiro" replace />;
  if (businessLoad.status === 'loading') return <FullScreenLoading text="CARREGANDO..." />;
  if (businessLoad.status === 'error') return (
    <FullScreenError
      message={ptBR.dashboard.inline_errors.business_selection_load_error}
      onRetry={() => setRetryKey((current) => current + 1)}
    />
  );
  if (businessLoad.negocios.length > 1) return (
    <SelecionarNegocio
      onLogout={onLogout}
      professionalRole={professionalRole}
      negocios={businessLoad.negocios}
    />
  );
  if (businessLoad.negocios.length === 0) return <Navigate to="/conta-profissional" replace />;
  return <Navigate to="/dashboard" replace />;
}
