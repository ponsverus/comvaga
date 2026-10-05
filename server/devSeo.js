import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import { serveVitrine, serveSitemap } from './publicSeo.js';

export function publicSeoPlugin() {
  return {
    name: 'public-business-seo',
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
