import { DEFAULT_SEO_TITLE } from './businessSeoMetadata.js';

export const NOT_FOUND_TITLE = 'Página inexistente | Comvaga';

export function applyNotFoundSeo(doc = globalThis.document) {
  const previousTitle = doc.title;
  let robots = doc.head.querySelector('meta[name="robots"]');
  const previous = robots && robots.getAttribute('data-comvaga-not-found') !== 'true'
    ? [...robots.attributes].map(({ name, value }) => [name, value]) : null;
  if (!robots) {
    robots = doc.createElement('meta');
    doc.head.appendChild(robots);
  }
  doc.title = NOT_FOUND_TITLE;
  robots.setAttribute('name', 'robots');
  robots.setAttribute('content', 'noindex');
  robots.setAttribute('data-comvaga-not-found', 'true');
  return () => {
    if (doc.title === NOT_FOUND_TITLE) doc.title = previousTitle === NOT_FOUND_TITLE ? DEFAULT_SEO_TITLE : previousTitle;
    if (!previous) robots.remove();
    else {
      [...robots.attributes].forEach(({ name }) => robots.removeAttribute(name));
      previous.forEach(([name, value]) => robots.setAttribute(name, value));
    }
  };
}
