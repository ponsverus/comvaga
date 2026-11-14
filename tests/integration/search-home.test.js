import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchHome } from '../../src/utils/searchHome.js';
import { supabase } from '../../src/supabase.js';

vi.mock('../../src/supabase.js', () => ({ supabase: { rpc: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());

describe('Pesquisa da Home com RPC simulada', () => {
  it('não chama serviço com pesquisa curta', async () => {
    expect(await searchHome('ab')).toEqual([]);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
  it('normaliza a pesquisa e envia parâmetros esperados', async () => {
    supabase.rpc.mockResolvedValue({ data: [{ id: 'n1', slug: 'studio' }], error: null });
    expect(await searchHome('  salão  ', { limit: 5 })).toEqual([{ id: 'n1', slug: 'studio' }]);
    expect(supabase.rpc).toHaveBeenCalledWith('search_home', { p_term: 'salão', p_limit: 5 });
  });
  it('descarta resultados sem slug', async () => {
    supabase.rpc.mockResolvedValue({ data: [{ id: 'n1', slug: 'ok' }, { id: 'n2' }], error: null });
    expect(await searchHome('salão')).toEqual([{ id: 'n1', slug: 'ok' }]);
  });
  it('propaga falha da RPC simulada', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: new Error('falha simulada') });
    await expect(searchHome('salão')).rejects.toThrow('falha simulada');
  });
});
