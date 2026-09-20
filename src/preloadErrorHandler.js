const reloadKey = 'comvaga-preload-reload';
const reloadCooldownMs = 60_000;
let reloadRequested = false;

window.addEventListener('vite:preloadError', (event) => {
  if (reloadRequested) return;

  const now = Date.now();
  let retriedRecently = false;

  try {
    const previousAttempt = Number(
      window.sessionStorage.getItem(reloadKey)
    );

    retriedRecently = (
      Number.isFinite(previousAttempt)
      && now - previousAttempt < reloadCooldownMs
    );
  } catch {
    const navigationEntry = window.performance
      ?.getEntriesByType?.('navigation')
      ?.[0];
    retriedRecently = navigationEntry?.type === 'reload';
  }

  if (retriedRecently) return;

  event.preventDefault();
  reloadRequested = true;

  try {
    window.sessionStorage.setItem(reloadKey, String(now));
  } catch {
  }

  window.location.reload();
});
