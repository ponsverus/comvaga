import { defineConfig } from 'vite';
import { publicSeoPlugin } from './server/devSeo.js';
  import react from '@vitejs/plugin-react';
  import { sentryVitePlugin } from '@sentry/vite-plugin';

  const env = globalThis.process?.env || {};

  const enableSentrySourceMaps = Boolean(
    env.SENTRY_AUTH_TOKEN
    && env.SENTRY_ORG
    && env.SENTRY_PROJECT
  );

  const plugins = [react(), publicSeoPlugin()];

  if (enableSentrySourceMaps) {
    plugins.push(
      sentryVitePlugin({
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT,
        authToken: env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          filesToDeleteAfterUpload: ['dist/**/*.map'],
        },
      })
    );
  }

  export default defineConfig({
    build: {
      sourcemap: enableSentrySourceMaps,
    },
    plugins,
  });
