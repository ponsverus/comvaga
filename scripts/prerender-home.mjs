import { build } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import react from '@vitejs/plugin-react';
import { STATIC_SEO } from '../src/utils/staticSeo.js';
import { getBlogPost } from '../src/data/blogPosts/index.js';
import { BLOG_SCHEMA_ID, buildBlogStructuredData } from '../src/utils/blogSeo.js';
import { renderSeoHtml } from '../server/publicSeo.js';

const root = resolve(import.meta.dirname, '..');
const prerenderDir = resolve(root, '.prerender');
const serverEntry = resolve(root, 'src/entry-home-server.jsx');

await build({
  configFile: false,
  root,
  plugins: [react()],
  build: {
    ssr: serverEntry,
    outDir: prerenderDir,
    emptyOutDir: true,
    rollupOptions: {
      output: { entryFileNames: 'entry-home-server.mjs' },
    },
  },
});

const renderer = await import(pathToFileURL(resolve(prerenderDir, 'entry-home-server.mjs')).href);
const indexPath = resolve(root, 'dist/index.html');
const template = await readFile(indexPath, 'utf8');
await writeFile(resolve(root, 'dist/index.template.html'), template);
const rootMarkup = '<div id="root"></div>';

if (!template.includes(rootMarkup)) {
  throw new Error('Empty application root missing from dist/index.html');
}

const html = template.replace(rootMarkup, `<div id="root">${renderer.renderHome()}</div>`);
await writeFile(indexPath, html);

for (const path of Object.keys(STATIC_SEO).filter((entry) => entry === '/blog' || entry.startsWith('/blog/'))) {
  const post = path.startsWith('/blog/') ? getBlogPost(path.slice('/blog/'.length)) : null;
  const content = renderer.renderBlog(path);
  const jsonLd = post ? { id: BLOG_SCHEMA_ID, data: buildBlogStructuredData(post) } : undefined;
  const pageTemplate = renderSeoHtml(template, STATIC_SEO[path], null, null, { jsonLd });
  const pageHtml = pageTemplate.replace(rootMarkup, `<div id="root">${content}</div>`);
  const outputPath = resolve(root, 'dist', `${path.slice(1)}.html`);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, pageHtml);
}
