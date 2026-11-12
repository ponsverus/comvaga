import { lazy } from 'react';

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
export const Dashboard                 = lazyRoute(() => import('../pages/Dashboard'), 'Dashboard');
export const Vitrine                   = lazyRoute(() => import('../pages/Vitrine'), 'Vitrine');
export const ClientArea                = lazyRoute(() => import('../pages/ClientArea'), 'ClientArea');
export const CriarNegocio              = lazyRoute(() => import('../pages/CriarNegocio'), 'CriarNegocio');
export const ProfessionalAccount       = lazyRoute(() => import('../pages/ProfessionalAccount'), 'ProfessionalAccount');
export const SelecionarNegocio         = lazyRoute(() => import('../pages/SelecionarNegocio'), 'SelecionarNegocio');
export const SelecionarNegocioParceiro = lazyRoute(() => import('../pages/SelecionarNegocioParceiro'), 'SelecionarNegocioParceiro');
export const SignupProfessionalResume  = lazyRoute(() => import('../pages/SignupProfessionalResume'), 'SignupProfessionalResume');
