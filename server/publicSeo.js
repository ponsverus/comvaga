 import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import PublicBusinessPreview from '../src/components/PublicBusinessPreview.js';
import {
  BUSINESS_SCHEMA_ID, PUBLIC_BUSINESS_DATA_ID, publicBusinessSnapshot,
  buildBusinessStructuredData, serializePublicJson,
} from '../src/utils/publicBusinessPage.js';
import { NOT_FOUND_TITLE } from '../src/utils/notFoundSeo.js';
import {
  PUBLIC_ORIGIN, VALID_BUSINESS_SLUG,
  businessLogoUrl, buildBusinessMetadata, metadataEntries, resolveBusinessSeoImage,
} from '../src/utils/businessSeoMetadata.js';

const START = '<!-- seo:start -->';
const END = '<!-- seo:end -->';
const STATIC_PAGES = ['/', '/sobre', '/termos', '/privacidade'];

export function escapeMarkup(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

export function renderSeoHtml(template, metadata, business = null) {
  const start = template.indexOf(START);
  const end = template.indexOf(END, start);
  if (start < 0 || end < start) throw new Error('SEO markers missing in HTML template');
  const tags = [
    `<title>${escapeMarkup(metadata.title)}</title>`,
    ...(metadata.noindex ? [
      '<meta name="robots" content="noindex" data-comvaga-not-found="true" />',
    ] : [
      ...metadataEntries(metadata).map(([attribute, key, content]) =>
        `<meta ${attribute}="${key}" content="${escapeMarkup(content)}" />`),
      `<link rel="canonical" href="${escapeMarkup(metadata.canonical)}" />`,
    ]),
  ].join('\n    ');
  let html = template.slice(0, start) + START + '\n    ' + tags + '\n    ' + template.slice(end);
  if (business) {
    const root = '<div id="root"></div>';
    if (!html.includes(root)) throw new Error('Empty application root missing in HTML template');
    const snapshot = publicBusinessSnapshot(business, metadata.image);
    if (!snapshot) throw new Error('Invalid public business snapshot');
    const content = renderToString(createElement(PublicBusinessPreview, { business: snapshot }));
    const schema = buildBusinessStructuredData(snapshot, metadata.image);
    html = html.replace(root, () => `<div id="root">${content}</div>\n    <script id="${PUBLIC_BUSINESS_DATA_ID}" type="application/json">${serializePublicJson(snapshot)}</script>`);
    if (schema) html = html.replace('</head>', () => `    <script id="${BUSINESS_SCHEMA_ID}" type="application/ld+json">${serializePublicJson(schema)}</script>\n  </head>`);
  }
  return html;
}

export function seoProxyHeaders(req, scope, env = process.env) {
  if (!['public_seo', 'public_sitemap'].includes(scope)) throw new Error('Unsupported SEO scope');
  const secret = env.SEO_PROXY_SECRET;
  if (!secret) {
    if (env.VERCEL === '1') throw new Error('SEO_PROXY_SECRET configuration missing');
    return {};
  }
  if (!/^[a-f0-9]{64}$/.test(secret)) throw new Error('Invalid SEO proxy configuration');
  // Trust platform headers on Vercel, and the actual socket during local development.
  const ip = env.VERCEL === '1'
    ? req?.headers?.['x-vercel-forwarded-for'] || req?.headers?.['x-forwarded-for']
    : req?.socket?.remoteAddress;
  if (typeof ip !== 'string' || !isIP(ip)) throw new Error('Trusted visitor IP unavailable');
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', secret).update(`${scope}\n${timestamp}\n${ip}`).digest('hex');
  return { 'x-comvaga-seo-ip': ip, 'x-comvaga-seo-time': timestamp, 'x-comvaga-seo-signature': signature };
}

export function createPublicRpc(env = process.env, fetcher = fetch, req) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  return async (name, params) => {
    if (!url || !key) throw new Error('Public Supabase configuration missing');
    const scope = { get_public_business_seo: 'public_seo', get_public_business_sitemap: 'public_sitemap' }[name];
    if (!scope) throw new Error('Unsupported public SEO RPC');
    const response = await fetcher(`${url.replace(/\/$/, '')}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: key,
        ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}),
        'Content-Type': 'application/json',
        ...seoProxyHeaders(req, scope, env),
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) {
      const error = new Error(`Public SEO query failed: ${response.status}`);
      const body = await response.json().catch(() => null);
      error.rateLimited = response.status === 429 && body?.code === 'RATE_LIMIT_EXCEEDED';
      throw error;
    }
    return response.json();
  };
}

function send(req, res, status, type, content, ttl = 0) {
  res.statusCode = status;
  res.setHeader('Content-Type', `${type}; charset=utf-8`);
  res.setHeader('Cache-Control', ttl ? 'public, max-age=0, must-revalidate' : 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', ttl ? `public, max-age=${ttl}` : 'no-store');
  if (!ttl) res.setHeader('X-Robots-Tag', 'noindex');
  if (status === 503 || status === 429) res.setHeader('Retry-After', '60');
  res.end(req.method === 'HEAD' ? undefined : content);
}

function allowRead(req, res) {
  if (req.method === 'GET' || req.method === 'HEAD') return true;
  res.setHeader('Allow', 'GET, HEAD');
  send(req, res, 405, 'text/plain', 'Method not allowed');
  return false;
}

export async function serveNotFound(req, res, options = {}) {
  if (!allowRead(req, res)) return;
  try {
    const template = await (options.template || (() => readFile(resolve(process.cwd(), 'dist/app.html'), 'utf8')))();
    send(req, res, 404, 'text/html', renderSeoHtml(template, { title: NOT_FOUND_TITLE, noindex: true }));
  } catch (error) {
    console.error('Not-found page unavailable:', error.message);
    send(req, res, 503, 'text/plain', 'Página temporariamente indisponível. Tente novamente em instantes.');
  }
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
    const rpc = options.rpc || createPublicRpc(options.env || process.env, fetch, req);
    const negocio = await rpc('get_public_business_seo', { p_slug: slug });
    if (!negocio) {
      send(req, res, 404, 'text/plain', 'Vitrine não encontrada.');
      return;
    }
    const env = options.env || process.env;
    const candidate = businessLogoUrl(negocio.logo_path, env.SUPABASE_URL || env.VITE_SUPABASE_URL);
    const image = await (options.resolveImage || resolveBusinessSeoImage)(candidate);
    const template = await (options.template || (() => readFile(resolve(process.cwd(), 'dist/index.html'), 'utf8')))();
    const html = renderSeoHtml(template, buildBusinessMetadata(negocio, [], image), negocio);
    send(req, res, 200, 'text/html', html, 300);
  } catch (error) {
    console.error('Public business SEO unavailable:', error.message);
    send(req, res, error.rateLimited ? 429 : 503, 'text/plain', error.rateLimited
      ? 'Muitas consultas em pouco tempo. Aguarde um minuto e tente novamente.'
      : 'Página temporariamente indisponível. Tente novamente em instantes.');
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
    const result = await (options.rpc || createPublicRpc(options.env || process.env, fetch, req))('get_public_business_sitemap', { p_page: page });
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
    send(req, res, error.rateLimited ? 429 : 503, 'text/plain', error.rateLimited
      ? 'Muitas consultas em pouco tempo. Aguarde um minuto e tente novamente.'
      : 'Sitemap temporariamente indisponível.');
  }
}
