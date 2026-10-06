import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import { serveVitrine, serveSitemap, escapeMarkup, renderSeoHtml } from './publicSeo.js';
import { DEFAULT_SEO_TITLE, DEFAULT_SEO_DESCRIPTION } from '../src/utils/businessSeoMetadata.js';
import { STATIC_SEO } from '../src/utils/staticSeo.js';

export function publicSeoPlugin() {
  return {
    name: 'public-business-seo',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replaceAll('__COMVAGA_SEO_TITLE__', escapeMarkup(DEFAULT_SEO_TITLE))
        .replaceAll('__COMVAGA_SEO_DESCRIPTION__', escapeMarkup(DEFAULT_SEO_DESCRIPTION));
    },
    generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset') throw new Error('HTML entry missing from build');
      const template = String(index.source);
      // Keep the neutral SPA shell separate from the public home page.
      this.emitFile({ type: 'asset', fileName: 'app.html', source: template });
      for (const [path, metadata] of Object.entries(STATIC_SEO)) {
        const html = renderSeoHtml(template, metadata);
        if (path === '/') index.source = html;
        else this.emitFile({ type: 'asset', fileName: `${path.slice(1)}.html`, source: html });
      }
    },
    configureServer(server) {
      const env = { ...process.env, ...loadEnv(server.config.mode, server.config.root, '') };
      const options = { env };
      server.middlewares.use(async (req, res, next) => {
        const path = new URL(req.url, 'http://localhost').pathname;
        if (Object.hasOwn(STATIC_SEO, path)) {
          const template = await server.transformIndexHtml(
            req.url, await readFile(resolve(server.config.root, 'index.html'), 'utf8'),
          );
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(req.method === 'HEAD' ? undefined : renderSeoHtml(template, STATIC_SEO[path]));
        } else if (/^\/v\/[^/]+$/.test(path)) {
          await serveVitrine(req, res, {
            ...options,
            template: async () => server.transformIndexHtml(
              req.url, await readFile(resolve(server.config.root, 'index.html'), 'utf8'),
            ),
          });
        } else if (/^\/sitemap(?:-\d+)?\.xml$/.test(path)) {
          await serveSitemap(req, res, options);
        } else next();
      });
    },
  };
}
