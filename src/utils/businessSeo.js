import { PUBLIC_ORIGIN, VALID_BUSINESS_SLUG, DEFAULT_SEO_IMAGE } from './seoMetadata.js';
import { applyStructuredData } from './structuredData.js';

export const BUSINESS_SCHEMA_ID = 'comvaga-business-schema';

function formatBrazilianPostalCode(value) {
  const raw = String(value ?? '').trim();
  if (!/^\d{5}-?\d{3}$/.test(raw)) return null;
  const digits = raw.replace('-', '');
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function socialProfileUrl(value, platform) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  const domain = `${platform}.com`;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${domain}/${raw.replace(/^@/, '')}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port
      || ![domain, `www.${domain}`, ...(platform === 'facebook' ? [`m.${domain}`] : [])].includes(url.hostname)) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    const handle = parts[0]?.toLowerCase();
    const reserved = ['instagram', 'facebook', 'home', 'login', 'accounts', 'explore', 'p', 'reel', 'reels',
      'stories', 'share', 'sharer', 'sharer.php', 'watch', 'groups', 'events', 'marketplace', 'help'];
    if (platform === 'facebook' && handle === 'profile.php') {
      const id = url.searchParams.get('id');
      return parts.length === 1 && /^\d+$/.test(id || '') ? `https://${domain}/profile.php?id=${id}` : null;
    }
    if (parts.length !== 1 || reserved.includes(handle) || !/^[a-zA-Z0-9._]+$/.test(parts[0])) return null;
    return `https://${domain}/${parts[0]}`;
  } catch {
    return null;
  }
}

export function buildBusinessStructuredData(business, image = DEFAULT_SEO_IMAGE) {
  const name = String(business?.nome || '').trim();
  if (!name || !VALID_BUSINESS_SLUG.test(business?.slug || '')) return null;
  const url = `${PUBLIC_ORIGIN}/v/${business.slug}`;
  const street = String(business.endereco_rua || '').trim();
  const city = String(business.endereco_cidade || '').trim();
  const hasAddress = Boolean(street && city && business.endereco?.trim());
  const entity = {
    '@type': hasAddress ? 'LocalBusiness' : 'Organization',
    '@id': `${url}#business`, name, url,
  };
  if (business.descricao?.trim()) entity.description = business.descricao.trim();
  if (business.telefone?.trim()) entity.telephone = business.telefone.trim();
  const profiles = [socialProfileUrl(business.instagram, 'instagram'), socialProfileUrl(business.facebook, 'facebook')]
    .filter(Boolean);
  if (profiles.length) entity.sameAs = profiles;
  if (image !== DEFAULT_SEO_IMAGE && /^https:\/\//.test(image)) entity.image = image;
  if (hasAddress) {
    entity.address = {
      '@type': 'PostalAddress',
      streetAddress: [street, business.endereco_numero, business.endereco_complemento]
        .filter((part) => typeof part === 'string' && part.trim()).map((part) => part.trim()).join(', '),
      addressLocality: city,
      addressCountry: 'BR',
    };
    if (business.endereco_estado?.trim()) entity.address.addressRegion = business.endereco_estado.trim();
    const postalCode = formatBrazilianPostalCode(business.endereco_cep);
    if (postalCode) entity.address.postalCode = postalCode;
  }
  return { '@context': 'https://schema.org', '@type': 'WebPage', '@id': `${url}#webpage`, url, name, mainEntity: entity };
}

export function applyBusinessStructuredData(business, image, doc = globalThis.document) {
  const data = buildBusinessStructuredData(business, image);
  if (!data) return () => {};
  return applyStructuredData(BUSINESS_SCHEMA_ID, data, doc);
}
