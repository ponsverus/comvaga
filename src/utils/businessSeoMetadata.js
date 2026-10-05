import { buildBusinessSeo } from './businessSeo.js';

export const PUBLIC_ORIGIN = 'https://comvaga.com.br';
export const DEFAULT_SEO_IMAGE = `${PUBLIC_ORIGIN}/og-default.png`;
export const VALID_BUSINESS_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function businessLogoUrl(path, supabaseUrl) {
  if (!path || !supabaseUrl) return DEFAULT_SEO_IMAGE;
  const parts = String(path).replace(/^logos\//, '').split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) return DEFAULT_SEO_IMAGE;
  return `${new URL(supabaseUrl).origin}/storage/v1/object/public/logos/${parts.map(encodeURIComponent).join('/')}`;
}

export function buildBusinessMetadata(negocio, entregas = [], image = DEFAULT_SEO_IMAGE) {
  return {
    ...buildBusinessSeo(negocio, entregas),
    canonical: `${PUBLIC_ORIGIN}/v/${encodeURIComponent(negocio.slug)}`,
    image,
    imageAlt: image === DEFAULT_SEO_IMAGE ? 'Identidade visual padrão dos negócios na Comvaga' : `Logo de ${negocio.nome}`,
  };
}

export function metadataEntries(metadata) {
  return [
    ['name', 'description', metadata.description],
    ['property', 'og:type', 'website'],
    ['property', 'og:locale', 'pt_BR'],
    ['property', 'og:site_name', 'Comvaga'],
    ['property', 'og:title', metadata.title],
    ['property', 'og:description', metadata.description],
    ['property', 'og:url', metadata.canonical],
    ['property', 'og:image', metadata.image],
    ['property', 'og:image:alt', metadata.imageAlt],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', metadata.title],
    ['name', 'twitter:description', metadata.description],
    ['name', 'twitter:image', metadata.image],
  ];
}

export function applyBusinessMetadata(metadata) {
  const previousTitle = document.title;
  const startedWithBusiness = document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') === metadata.canonical;
  const changes = [];
  const update = (selector, tag, attributes) => {
    let element = document.head.querySelector(selector);
    const previous = element ? [...element.attributes].map(({ name, value }) => [name, value]) : null;
    if (!element) {
      element = document.createElement(tag);
      document.head.appendChild(element);
    }
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    changes.push(() => {
      if (!previous) element.remove();
      else {
        [...element.attributes].forEach(({ name }) => element.removeAttribute(name));
        previous.forEach(([name, value]) => element.setAttribute(name, value));
      }
    });
  };
  document.title = metadata.title;
  metadataEntries(metadata).forEach(([attribute, key, content]) => update(`meta[${attribute}="${key}"]`, 'meta', { [attribute]: key, content }));
  update('link[rel="canonical"]', 'link', { rel: 'canonical', href: metadata.canonical });
  return () => {
    document.title = previousTitle;
    changes.reverse().forEach((restore) => restore());
    if (startedWithBusiness) {
      document.title = 'Comvaga: Inteligência de Agenda';
      document.head.querySelector('meta[name="description"]')?.setAttribute('content', 'Plataforma inteligente de agendamento');
      document.head.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"]').forEach((element) => element.remove());
    }
  };
}
