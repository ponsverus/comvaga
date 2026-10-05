import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import { serveVitrine, serveSitemap, escapeMarkup } from './publicSeo.js';
import { DEFAULT_SEO_TITLE, DEFAULT_SEO_DESCRIPTION } from '../src/utils/businessSeoMetadata.js';

export function publicSeoPlugin() {
  return {
    name: 'public-business-seo',
    transformIndexHtml(html) {
      return html
        .replaceAll('__COMVAGA_SEO_TITLE__', escapeMarkup(DEFAULT_SEO_TITLE))
        .replaceAll('__COMVAGA_SEO_DESCRIPTION__', escapeMarkup(DEFAULT_SEO_DESCRIPTION));
    },
    configureServer(server) {
      const env = { ...process.env, ...loadEnv(server.config.mode, server.config.root, '') };
      const options = { env };
      server.middlewares.use(async (req, res, next) => {
        const path = new URL(req.url, 'http://localhost').pathname;
        if (/^\/v\/[^/]+$/.test(path)) {
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
