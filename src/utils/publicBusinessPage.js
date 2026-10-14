import { VALID_BUSINESS_SLUG, DEFAULT_SEO_IMAGE } from './seoMetadata.js';

export const PUBLIC_BUSINESS_DATA_ID = 'comvaga-public-business';

const TEXT_FIELDS = [
  'id', 'nome', 'slug', 'descricao', 'telefone', 'tipo_negocio', 'instagram', 'facebook',
  'logo_path', 'tema', 'endereco', 'endereco_cep', 'endereco_rua', 'endereco_numero', 'endereco_complemento',
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
    && ['ABERTO', 'FECHADO', 'PAUSA'].includes(prof.status_key)).slice(0, 3).map((prof) => ({
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
        ...Object.fromEntries(['horario_inicio', 'horario_fim', 'pausa_inicio', 'pausa_fim'].map((key) => [
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
  business.professional_ratings = (Array.isArray(value.professional_ratings) ? value.professional_ratings : [])
    .filter((item) => typeof item?.id === 'string' && previewRating(item.rating) != null
      && Number.isSafeInteger(Number(item.count)) && Number(item.count) > 0)
    .map((item) => ({ id: item.id, rating: previewRating(item.rating), count: Number(item.count) }));
  business.preview_today_dow = Number.isInteger(value.preview_today_dow) && value.preview_today_dow >= 0 && value.preview_today_dow <= 6
    ? value.preview_today_dow : null;
  return business;
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
