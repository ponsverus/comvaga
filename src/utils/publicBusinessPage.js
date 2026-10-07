import { PUBLIC_ORIGIN, VALID_BUSINESS_SLUG, DEFAULT_SEO_IMAGE } from './businessSeoMetadata.js';

export const PUBLIC_BUSINESS_DATA_ID = 'comvaga-public-business';
export const BUSINESS_SCHEMA_ID = 'comvaga-business-schema';

const TEXT_FIELDS = [
  'id', 'nome', 'slug', 'descricao', 'telefone', 'tipo_negocio', 'instagram', 'facebook',
  'logo_path', 'tema', 'endereco', 'endereco_rua', 'endereco_numero', 'endereco_complemento',
  'endereco_bairro', 'endereco_cidade', 'endereco_estado', 'seo_title', 'seo_description',
];
const GROUPS = new Set(['servicos', 'consultas', 'aulas']);


function previewAvatarUrl(prof, supabaseUrl) {
  try {
    if (prof.avatar_path && supabaseUrl) {
      const origin = new URL(supabaseUrl);
      if (origin.protocol !== 'https:' || !origin.hostname.endsWith('.supabase.co')) return null;
      const parts = String(prof.avatar_path).replace(/^avatars\//, '').split('/');
      if (parts.some((part) => !part || part === '.' || part === '..')) return null;
      return `${origin.origin}/storage/v1/object/public/avatars/${parts.map(encodeURIComponent).join('/')}`;
    }
    const url = new URL(prof.avatar_url);
    return url.protocol === 'https:' && url.hostname.endsWith('.supabase.co')
      && !url.username && !url.password && !url.port
      && url.pathname.startsWith('/storage/v1/object/public/avatars/') ? url.href : null;
  } catch {
    return null;
  }
}

function previewRating(value) {
  const rating = value == null ? null : Number(value);
  return Number.isFinite(rating) && rating > 0 && rating <= 5 ? rating : null;
}

function previewProfessionals(value, supabaseUrl) {
  if (!Array.isArray(value)) return [];
  return value.filter((prof) => prof && typeof prof.id === 'string' && typeof prof.nome === 'string'
    && ['ABERTO', 'FECHADO', 'ALMOCO', 'PAUSA'].includes(prof.status_key)).slice(0, 3).map((prof) => ({
    id: prof.id,
    nome: prof.nome,
    profissao: typeof prof.profissao === 'string' ? prof.profissao : null,
    anos_experiencia: Number.isInteger(prof.anos_experiencia) && prof.anos_experiencia >= 0 ? prof.anos_experiencia : null,
    avatar_url: previewAvatarUrl(prof, supabaseUrl),
    status_key: prof.status_key,
    rating: previewRating(prof.rating),
    total_entregas: Number.isSafeInteger(Number(prof.total_entregas)) && Number(prof.total_entregas) >= 0 ? Number(prof.total_entregas) : 0,
    horarios: (Array.isArray(prof.horarios) ? prof.horarios : [])
      .filter((item) => Number.isInteger(item?.dia_semana) && item.dia_semana >= 0 && item.dia_semana <= 6)
      .slice(0, 7).map((item) => ({
        dia_semana: item.dia_semana, ativo: item.ativo === true,
        ...Object.fromEntries(['horario_inicio', 'horario_fim', 'almoco_inicio', 'almoco_fim'].map((key) => [
          key, typeof item[key] === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(item[key]) ? item[key] : null,
        ])),
      })),
  }));
}

export function publicBusinessSnapshot(value, image = DEFAULT_SEO_IMAGE, supabaseUrl = null) {
  if (!value || typeof value !== 'object' || !VALID_BUSINESS_SLUG.test(value.slug || '')) return null;
  const business = Object.fromEntries(TEXT_FIELDS.map((key) => [key, typeof value[key] === 'string' ? value[key] : null]));
  business.business_group = GROUPS.has(value.business_group) ? value.business_group : 'servicos';
  business.seo_image = typeof image === 'string' && /^https:\/\//.test(image) ? image : DEFAULT_SEO_IMAGE;
  business.seo_services = [...new Set((Array.isArray(value.seo_services) ? value.seo_services : [])
    .filter((item) => item?.ativo === true && !item.excluido_em && !item.motivo_excluido)
    .map((item) => typeof item.nome === 'string' ? item.nome.trim() : '').filter(Boolean))]
    .slice(0, 3).map((nome) => ({ nome, ativo: true }));
  business.preview_professionals = previewProfessionals(value.preview_professionals, supabaseUrl);
  business.preview_rating = previewRating(value.preview_rating);
  business.preview_today_dow = Number.isInteger(value.preview_today_dow) && value.preview_today_dow >= 0 && value.preview_today_dow <= 6
    ? value.preview_today_dow : null;
  return business;
}

export function serializePublicJson(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (char) =>
    `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

export function readPublicBusinessSnapshot(doc = globalThis.document, pathname = globalThis.location?.pathname) {
  const element = doc?.getElementById(PUBLIC_BUSINESS_DATA_ID);
  if (!element || element.getAttribute('type') !== 'application/json') return null;
  try {
    const value = JSON.parse(element.textContent);
    const business = publicBusinessSnapshot(value, value?.seo_image);
    return business && pathname === `/v/${business.slug}` ? business : null;
  } catch {
    return null;
  }
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
    };
    if (business.endereco_estado?.trim()) entity.address.addressRegion = business.endereco_estado.trim();
  }
  return { '@context': 'https://schema.org', '@type': 'WebPage', '@id': `${url}#webpage`, url, name, mainEntity: entity };
}

export function applyBusinessStructuredData(business, image, doc = globalThis.document) {
  const data = buildBusinessStructuredData(business, image);
  if (!data) return () => {};
  let element = doc.getElementById(BUSINESS_SCHEMA_ID);
  if (!element) {
    element = doc.createElement('script');
    element.id = BUSINESS_SCHEMA_ID;
    element.type = 'application/ld+json';
    doc.head.appendChild(element);
  }
  element.textContent = serializePublicJson(data);
  return () => element.remove();
}
