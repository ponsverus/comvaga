import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Falha imediatamente se um teste tentar escapar para rede real.
// Os testes que usam módulos Supabase DEVEM substituí-los por vi.mock.
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Acesso externo proibido nos testes do frontend'))));
  vi.stubGlobal('WebSocket', class {
    constructor() { throw new Error('WebSocket externo proibido nos testes do frontend'); }
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = () => {};
}
