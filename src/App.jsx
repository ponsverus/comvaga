import { Suspense, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { normalizeOnboardingStatus } from './utils/profileAccess';
import WhatsAppFloatingButton from './components/WhatsAppFloatingButton';
import PublicBusinessPreview from './components/PublicBusinessPreview.js';
import HomePublicPreview from './components/HomePublicPreview.jsx';
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
import BlogRoutes              from './components/BlogRoutes';
import BlogPublicPreview        from './components/BlogPublicPreview';

import {
  Dashboard,
  Vitrine,
  ClientArea,
  CriarNegocio,
  ProfessionalAccount,
  SelecionarNegocioParceiro,
  SignupProfessionalResume,
} from './app/lazyPages';
import {
  FullScreenLoading,
  ProfileRouteGate,
  RouteErrorGuard,
  PublicRouteLoading,
  ScrollToTopOnRouteChange,
  RecoveryWatcher,
  LogoutRedirectResetter,
  SelecionarNegocioRouteGuard,
} from './app/RouteSupport';
import { useAppSession } from './app/useAppSession';

export default function App({ initialBusiness = null }) {
  const {
    user, userType, onboardingStatus, professionalRole, accessState,
    booting, typeLoading, fatalError, inRecovery, postLogoutRedirect,
    beginAuthFlow, endAuthFlow, setRecoveryMode, setPostLogoutRedirect,
    handleLocalSessionEnded, handleLogin, handleLogout, handleRetry,
  } = useAppSession();

  const isLoggedIn = !!user;
  const metadataPartnerSignup = user?.user_metadata?.partner_signup === true
    || String(user?.user_metadata?.partner_signup || '').toLowerCase() === 'true';
  const isPartnerSignup = professionalRole === 'partner' || metadataPartnerSignup;

  const getPostLoginPath = useCallback((type, currentAccessState, status, role = professionalRole) => {
    if (type !== 'professional') return '/minha-area';
    if (role === 'partner') return '/selecionar-negocio-parceiro';
    if (currentAccessState === 'owner_resume' || normalizeOnboardingStatus(type, status) === 'pending') {
      return '/cadastro/profissional/retomada';
    }
    return '/dashboard';
  }, [professionalRole]);

  const currentPath = globalThis.location?.pathname || '';
  const matchesInitialRoute = initialBusiness && currentPath === `/v/${initialBusiness.slug}`;
  const isBlogRoute = currentPath === '/blog' || currentPath.startsWith('/blog/');
  const initialPreview = matchesInitialRoute
    ? <PublicBusinessPreview business={initialBusiness} />
    : isBlogRoute
      ? <BlogPublicPreview />
      : currentPath === '/'
        ? <HomePublicPreview />
        : <FullScreenLoading />;
  if (booting) return <Router>{initialPreview}</Router>;

  return (
    <Router>
      <ProfileRouteGate fatalError={fatalError} inRecovery={inRecovery} isLoggedIn={isLoggedIn} userType={userType} onRetry={handleRetry}>
      <FeedbackProvider>
        <RecoveryWatcher onChange={setRecoveryMode} />
        <LogoutRedirectResetter redirectPath={postLogoutRedirect} onClear={() => setPostLogoutRedirect(null)} />
        <ScrollToTopOnRouteChange />
        <WhatsAppFloatingButton />

        <RouteErrorGuard>
          <Suspense fallback={<PublicRouteLoading initialBusiness={initialBusiness} />}>
            <Routes>
            <Route path="/" element={<Home user={isLoggedIn ? user : null} userType={isLoggedIn ? userType : null} professionalRole={isLoggedIn ? professionalRole : null} onLogout={handleLogout} />} />

            <Route path="/privacidade" element={<PrivacyPolicy />} />
            <Route path="/termos" element={<TermsOfUse />} />
            <Route path="/sobre" element={<About />} />
            <Route path="/blog/*" element={<BlogRoutes nested />} />

            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/login" element={
              inRecovery ? <ResetPassword defaultRedirect="/login" />
              : isLoggedIn && userType ? <Navigate to={getPostLoginPath(userType, accessState, onboardingStatus)} />
              : <Login onLogin={handleLogin} beginAuthFlow={beginAuthFlow} endAuthFlow={endAuthFlow} />
            } />

            <Route path="/cadastro/parceiro" element={
              isLoggedIn && userType
                ? <Navigate to={getPostLoginPath(userType, accessState, onboardingStatus)} />
                : <CadastroParceiro onLogin={handleLogin} beginAuthFlow={beginAuthFlow} endAuthFlow={endAuthFlow} />
            } />

            <Route path="/login/parceiro" element={
              inRecovery
                ? <ResetPassword defaultRedirect="/login/parceiro" />
                : isLoggedIn && userType
                  ? <Navigate to={getPostLoginPath(userType, accessState, onboardingStatus)} />
                  : <LoginParceiro onLogin={handleLogin} beginAuthFlow={beginAuthFlow} endAuthFlow={endAuthFlow} />
            } />

            <Route path="/cadastro" element={
              isLoggedIn && userType
                ? <Navigate to={getPostLoginPath(userType, accessState, onboardingStatus)} />
                : <SignupChoice />
            } />

            <Route path="/cadastro/cliente" element={
              isLoggedIn && userType ? <Navigate to={getPostLoginPath(userType, accessState, onboardingStatus)} />
              : <SignupClient onLogin={handleLogin} beginAuthFlow={beginAuthFlow} endAuthFlow={endAuthFlow} />
            } />

            <Route path="/cadastro/profissional" element={
              isLoggedIn && userType ? <Navigate to={getPostLoginPath(userType, accessState, onboardingStatus)} />
              : <SignupProfessional onLogin={handleLogin} beginAuthFlow={beginAuthFlow} endAuthFlow={endAuthFlow} />
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

            <Route path="/v/:slug" element={<Vitrine initialBusiness={initialBusiness} user={isLoggedIn ? user : null} userType={isLoggedIn ? userType : null} professionalRole={professionalRole} onLogout={handleLogout} />} />

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
                    : <SelecionarNegocioRouteGuard user={user} onLogout={handleLogout} onSessionExpired={handleLocalSessionEnded} professionalRole={professionalRole} />
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
      </ProfileRouteGate>
    </Router>
  );
}
