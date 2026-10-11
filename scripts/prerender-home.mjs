import { build } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import react from '@vitejs/plugin-react';

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
const rootMarkup = '<div id="root"></div>';

if (!template.includes(rootMarkup)) {
  throw new Error('Empty application root missing from dist/index.html');
}

const html = template.replace(rootMarkup, `<div id="root">${renderer.renderHome()}</div>`);
await writeFile(indexPath, html);
