import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  PUBLIC_ORIGIN, DEFAULT_SEO_IMAGE, VALID_BUSINESS_SLUG,
  businessLogoUrl, buildBusinessMetadata, metadataEntries,
} from '../src/utils/businessSeoMetadata.js';

const START = '<!-- seo:start -->';
const END = '<!-- seo:end -->';
const STATIC_PAGES = ['/', '/sobre', '/termos', '/privacidade'];

export function escapeMarkup(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

export function renderSeoHtml(template, metadata) {
  const start = template.indexOf(START);
  const end = template.indexOf(END, start);
  if (start < 0 || end < start) throw new Error('SEO markers missing in HTML template');
  const tags = [
    `<title>${escapeMarkup(metadata.title)}</title>`,
    ...metadataEntries(metadata).map(([attribute, key, content]) =>
      `<meta ${attribute}="${key}" content="${escapeMarkup(content)}" />`),
    `<link rel="canonical" href="${escapeMarkup(metadata.canonical)}" />`,
  ].join('\n    ');
  return template.slice(0, start) + START + '\n    ' + tags + '\n    ' + template.slice(end);
}

export function createPublicRpc(env = process.env, fetcher = fetch) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  return async (name, params) => {
    if (!url || !key) throw new Error('Public Supabase configuration missing');
    const response = await fetcher(`${url.replace(/\/$/, '')}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: key,
        ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error(`Public SEO query failed: ${response.status}`);
    return response.json();
  };
}

async function availableImage(candidate) {
  if (candidate === DEFAULT_SEO_IMAGE) return candidate;
  try {
    const response = await fetch(candidate, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(2000) });
    if (response.ok && /^image\/(png|jpeg|webp)(;|$)/i.test(response.headers.get('content-type') || '')) return candidate;
  } catch {
    // An unavailable logo must not prevent the business page from loading.
  }
  return DEFAULT_SEO_IMAGE;
}

function send(req, res, status, type, content, ttl = 0) {
  res.statusCode = status;
  res.setHeader('Content-Type', `${type}; charset=utf-8`);
  res.setHeader('Cache-Control', ttl ? 'public, max-age=0, must-revalidate' : 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', ttl ? `public, max-age=${ttl}` : 'no-store');
  if (!ttl) res.setHeader('X-Robots-Tag', 'noindex');
  if (status === 503) res.setHeader('Retry-After', '60');
  res.end(req.method === 'HEAD' ? undefined : content);
}

function allowRead(req, res) {
  if (req.method === 'GET' || req.method === 'HEAD') return true;
  res.setHeader('Allow', 'GET, HEAD');
  send(req, res, 405, 'text/plain', 'Method not allowed');
  return false;
}

export async function serveVitrine(req, res, options = {}) {
  if (!allowRead(req, res)) return;
  const url = new URL(req.url, PUBLIC_ORIGIN);
  const slug = req.query?.slug ?? url.searchParams.get('slug') ?? url.pathname.split('/v/')[1];
  if (typeof slug !== 'string' || !VALID_BUSINESS_SLUG.test(slug)) {
    send(req, res, 404, 'text/plain', 'Vitrine não encontrada.');
    return;
  }
  try {
    const rpc = options.rpc || createPublicRpc();
    const negocio = await rpc('get_public_business_seo', { p_slug: slug });
    if (!negocio) {
      send(req, res, 404, 'text/plain', 'Vitrine não encontrada.');
      return;
    }
    const env = options.env || process.env;
    const candidate = businessLogoUrl(negocio.logo_path, env.SUPABASE_URL || env.VITE_SUPABASE_URL);
    const image = await (options.resolveImage || availableImage)(candidate);
    const template = await (options.template || (() => readFile(resolve(process.cwd(), 'dist/index.html'), 'utf8')))();
    const html = renderSeoHtml(template, buildBusinessMetadata(negocio, [], image));
    send(req, res, 200, 'text/html', html, 300);
  } catch (error) {
    console.error('Public business SEO unavailable:', error.message);
    send(req, res, 503, 'text/plain', 'Página temporariamente indisponível. Tente novamente em instantes.');
  }
}

export async function serveSitemap(req, res, options = {}) {
  if (!allowRead(req, res)) return;
  const url = new URL(req.url, PUBLIC_ORIGIN);
  const rawPage = req.query?.page ?? url.searchParams.get('page') ?? url.pathname.match(/^\/sitemap-(\d+)\.xml$/)?.[1] ?? '0';
  if (typeof rawPage !== 'string' || !/^\d{1,9}$/.test(rawPage)) {
    send(req, res, 404, 'text/plain', 'Sitemap não encontrado.');
    return;
  }
  try {
    const page = Number(rawPage);
    const result = await (options.rpc || createPublicRpc())('get_public_business_sitemap', { p_page: page });
    if (!result) {
      send(req, res, 404, 'text/plain', 'Sitemap não encontrado.');
      return;
    }
    let xml;
    if (page === 0) {
      const count = Math.max(1, Math.ceil(result.total / 1000));
      if (count > 50000) throw new Error('Sitemap index capacity exceeded');
      const entries = Array.from({ length: count }, (_, index) =>
        `<sitemap><loc>${PUBLIC_ORIGIN}/sitemap-${index + 1}.xml</loc></sitemap>`).join('');
      xml = `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</sitemapindex>`;
    } else {
      const paths = [
        ...(page === 1 ? STATIC_PAGES : []),
        ...result.slugs.filter((slug) => VALID_BUSINESS_SLUG.test(slug)).map((slug) => `/v/${slug}`),
      ];
      xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) =>
        `<url><loc>${escapeMarkup(PUBLIC_ORIGIN + path)}</loc></url>`).join('')}</urlset>`;
    }
    send(req, res, 200, 'application/xml', '<?xml version="1.0" encoding="UTF-8"?>\n' + xml, 600);
  } catch (error) {
    console.error('Public sitemap unavailable:', error.message);
    send(req, res, 503, 'text/plain', 'Sitemap temporariamente indisponível.');
  }
}
