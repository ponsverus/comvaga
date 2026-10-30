import { build, loadEnv } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import react from '@vitejs/plugin-react';
import { STATIC_SEO } from '../src/utils/staticSeo.js';
import { getBlogPost } from '../src/data/blogPosts/index.js';
import {
  BLOG_INDEX_SCHEMA_ID,
  BLOG_SCHEMA_ID,
  buildBlogIndexStructuredData,
  buildBlogStructuredData,
} from '../src/utils/blogSeo.js';
import { HOME_SCHEMA_ID, buildHomeStructuredData } from '../src/utils/homeSeo.js';
import { renderSeoHtml } from '../server/publicSeo.js';
import { PUBLIC_HOME_REVIEWS_ID, publicHomeReviewsSnapshot } from '../src/utils/publicHomeReviews.js';
import { serializePublicJson } from '../src/utils/structuredData.js';

const root = resolve(import.meta.dirname, '..');
const prerenderDir = resolve(root, '.prerender');
const serverEntry = resolve(root, 'src/entry-server.jsx');

async function fetchHomeReviews() {
  const env = loadEnv('production', root, '');
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Public Supabase configuration missing for home reviews');
  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/get_depoimentos_app_home`, {
    method: 'POST',
    headers: {
      apikey: key,
      ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}),
      'Content-Type': 'application/json',
    },
    body: '{}',
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error(`Home reviews request failed: HTTP ${response.status}`);
  return publicHomeReviewsSnapshot(await response.json(), url);
}

await build({
  configFile: false,
  root,
  plugins: [react()],
  build: {
    ssr: serverEntry,
    outDir: prerenderDir,
    emptyOutDir: true,
    rollupOptions: {
      output: { entryFileNames: 'entry-server.mjs' },
    },
  },
});

const renderer = await import(pathToFileURL(resolve(prerenderDir, 'entry-server.mjs')).href);
const indexPath = resolve(root, 'dist/index.html');
const template = await readFile(indexPath, 'utf8');
await writeFile(resolve(root, 'dist/index.template.html'), template);
const rootMarkup = '<div id="root"></div>';

if (!template.includes(rootMarkup)) {
  throw new Error('Empty application root missing from dist/index.html');
}

let homeReviews = { items: [], hasMore: false, rating: null };
try {
  homeReviews = await fetchHomeReviews();
} catch (error) {
  console.warn('Home reviews unavailable during prerender:', error);
}
const homeTemplate = renderSeoHtml(template, STATIC_SEO['/'], null, null, {
  jsonLd: { id: HOME_SCHEMA_ID, data: buildHomeStructuredData(homeReviews.rating) },
});
const html = homeTemplate.replace(rootMarkup, () =>
  `<div id="root">${renderer.renderHome(homeReviews)}</div>\n    <script id="${PUBLIC_HOME_REVIEWS_ID}" type="application/json">${serializePublicJson(homeReviews)}</script>`);
await writeFile(indexPath, html);

for (const path of Object.keys(STATIC_SEO).filter((entry) => entry === '/blog' || entry.startsWith('/blog/'))) {
  const post = path.startsWith('/blog/') ? getBlogPost(path.slice('/blog/'.length)) : null;
  const content = renderer.renderBlog(path);
  const jsonLd = post
    ? { id: BLOG_SCHEMA_ID, data: buildBlogStructuredData(post) }
    : path === '/blog'
      ? { id: BLOG_INDEX_SCHEMA_ID, data: buildBlogIndexStructuredData() }
      : undefined;
  const pageTemplate = renderSeoHtml(template, STATIC_SEO[path], null, null, { jsonLd });
  const pageHtml = pageTemplate.replace(rootMarkup, `<div id="root">${content}</div>`);
  const outputPath = resolve(root, 'dist', `${path.slice(1)}.html`);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, pageHtml);
}
