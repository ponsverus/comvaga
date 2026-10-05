import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildBusinessSeo } from '../src/utils/businessSeo.js';
import { buildBusinessMetadata, businessLogoUrl, DEFAULT_SEO_IMAGE } from '../src/utils/businessSeoMetadata.js';
import { serveVitrine, serveSitemap, renderSeoHtml, createPublicRpc } from '../server/publicSeo.js';

const template = '<html><head><!-- seo:start --><title>Comvaga</title><!-- seo:end --></head><body><div id="root"></div></body></html>';
const negocio = { nome: 'Vikings', slug: 'vikings', tipo_negocio: 'barbearia', endereco_cidade: 'Coronel Fabriciano' };
function response() {
  return { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(content) { this.body = content; } };
}
const options = {
  rpc: async () => negocio, template: async () => template, resolveImage: async (image) => image,
};

test('custom fields have independent priority; fallbacks preserve literal business text', () => {
  const seo = buildBusinessSeo({ ...negocio, seo_title: 'Meu título', descricao: 'Texto original do dono.' });
  assert.equal(seo.title, 'Meu título');
  assert.equal(seo.description, 'Texto original do dono.');
  const fallback = buildBusinessSeo(negocio);
  assert.match(fallback.title, /Vikings.*barbearia.*Coronel Fabriciano/);
  assert.match(fallback.description, /Agende online/);
  const long = buildBusinessSeo({ ...negocio, seo_title: 'á'.repeat(100), seo_description: 'á'.repeat(200) });
  assert.ok(Array.from(long.title).length <= 60);
  assert.ok(Array.from(long.description).length <= 160);
});

test('server and client use the same fallback services, regardless of carousel pagination', () => {
  const business = { ...negocio, seo_services: [{ nome: 'Corte', ativo: true }] };
  assert.deepEqual(buildBusinessSeo(business, []), buildBusinessSeo(business, [{ nome: 'Outra página', ativo: true }]));
});

test('initial HTML contains escaped metadata, canonical and absolute images without JS', () => {
  const html = renderSeoHtml(template, buildBusinessMetadata({ ...negocio, seo_title: '<script>alert("x")</script>' }));
  assert.ok(!html.includes('<script>'));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /og:title/);
  assert.match(html, /og:description/);
  assert.match(html, /https:\/\/comvaga.com.br\/v\/vikings/);
  assert.match(html, /og-default.png/);
  assert.equal((html.match(/<title>/g) || []).length, 1);
  assert.throws(() => renderSeoHtml('<head></head>', buildBusinessMetadata(negocio)));
});

test('logos are encoded on trusted storage; invalid and missing paths use the default', () => {
  assert.equal(businessLogoUrl(null, 'https://example.supabase.co'), DEFAULT_SEO_IMAGE);
  assert.equal(businessLogoUrl('../logo.png', 'https://example.supabase.co'), DEFAULT_SEO_IMAGE);
  assert.equal(businessLogoUrl('logos/id/minha logo.webp', 'https://example.supabase.co'), 'https://example.supabase.co/storage/v1/object/public/logos/id/minha%20logo.webp');
});

test('vitrine GET is cacheable public HTML; HEAD has no body; other methods are refused', async () => {
  const res = response();
  await serveVitrine({ method: 'GET', url: '/v/vikings' }, res, options);
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /og:title/);
  assert.equal(res.headers['Vercel-CDN-Cache-Control'], 'public, max-age=300');
  const head = response();
  await serveVitrine({ method: 'HEAD', url: '/v/vikings' }, head, options);
  assert.equal(head.body, undefined);
  const post = response();
  await serveVitrine({ method: 'POST', url: '/v/vikings' }, post, options);
  assert.equal(post.statusCode, 405);
});

test('invalid/missing businesses return real 404; upstream failures return uncached 503', async () => {
  for (const url of ['/v/../bad', '/v/UPPER', '/v/missing']) {
    const res = response();
    await serveVitrine({ method: 'GET', url }, res, { ...options, rpc: async () => null });
    assert.equal(res.statusCode, 404);
    assert.equal(res.headers['X-Robots-Tag'], 'noindex');
  }
  const res = response();
  await serveVitrine({ method: 'GET', url: '/v/vikings' }, res, { ...options, rpc: async () => { throw new Error('simulated outage'); } });
  assert.equal(res.statusCode, 503);
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('sitemap index splits businesses into bounded shards without fake modification dates', async () => {
  const res = response();
  await serveSitemap({ method: 'GET', url: '/sitemap.xml' }, res, { rpc: async () => ({ total: 1001, slugs: [] }) });
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /sitemap-1.xml/);
  assert.match(res.body, /sitemap-2.xml/);
  assert.ok(!res.body.includes('lastmod'));
  const shard = response();
  await serveSitemap({ method: 'GET', url: '/sitemap-1.xml' }, shard, { rpc: async () => ({ total: 1, slugs: ['vikings'] }) });
  assert.match(shard.body, /\/v\/vikings/);
  assert.ok(!shard.body.includes('/dashboard'));
  const missing = response();
  await serveSitemap({ method: 'GET', url: '/sitemap-999.xml' }, missing, { rpc: async () => null });
  assert.equal(missing.statusCode, 404);
});

test('RPC transport uses public key and timeout; upstream errors are not ignored', async () => {
  let request;
  const rpc = createPublicRpc({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'public-key' }, async (url, init) => {
    request = { url, init };
    return { ok: true, json: async () => negocio };
  });
  assert.deepEqual(await rpc('get_public_business_seo', { p_slug: 'vikings' }), negocio);
  assert.equal(request.init.headers.apikey, 'public-key');
  assert.equal(JSON.parse(request.init.body).p_slug, 'vikings');
  await assert.rejects(createPublicRpc({}, async () => {})('test', {}));
});

test('Vercel routes precede SPA fallback and retain security headers', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(config.rewrites[0].source, '/v/:slug');
  assert.equal(config.rewrites.at(-1).source, '/(.*)');
  assert.equal(config.functions['api/vitrine.js'].includeFiles, 'dist/index.html');
  assert.ok(config.headers[0].headers.some(({ key }) => key === 'Content-Security-Policy'));
});
