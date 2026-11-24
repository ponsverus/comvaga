export function isPasswordRecoveryUrl() {
  const storageKey = 'comvaga-password-recovery';
  try {
    if (window.sessionStorage?.getItem(storageKey) === '1') return true;
    const url = new URL(window.location.href);
    if (url.pathname === '/reset-password') return true;
    const s = url.searchParams;
    const hashRaw = (url.hash || '').replace(/^#/, '');
    const hashParams = new URLSearchParams(
      hashRaw.startsWith('?') ? hashRaw.slice(1) : hashRaw
    );

    const type = s.get('type') || hashParams.get('type');
    return type === 'recovery';
  } catch {
    const href = window.location.href || '';
    return (
      window.sessionStorage?.getItem(storageKey) === '1' ||
      href.includes('/reset-password') ||
      href.includes('type=recovery')
    );
  }
}

export function clearPasswordRecoveryState() {
  try {
    window.sessionStorage?.removeItem('comvaga-password-recovery');
  } catch (error) {
    console.warn('Falha ao limpar estado de troca de senha.', error);
  }
}
