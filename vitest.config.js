import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const dom = {
  environment: 'jsdom',
  setupFiles: ['./tests/setup/dom.js'],
  testTimeout: 10000,
  hookTimeout: 10000,
};

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      { extends: true, test: { ...dom, name: 'components', include: ['tests/components/**/*.test.jsx'] } },
      { extends: true, test: { ...dom, name: 'integration', include: ['tests/integration/**/*.test.{js,jsx}'] } },
    ],
  },
});
