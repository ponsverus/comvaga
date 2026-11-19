import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDashboardEntregaMutations } from '../../src/pages/dashboard/hooks/useDashboardEntregaMutations.js';
import { insertEntrega, updateEntregaById } from '../../src/pages/dashboard/api/dashboardApi.js';

vi.mock('../../src/pages/dashboard/api/dashboardApi.js', () => ({
  ativarEntregaSeguramente: vi.fn(),
  excluirEntregaSeguramente: vi.fn(),
  inativarEntregaSeguramente: vi.fn(),
  insertEntrega: vi.fn(),
  updateEntregaById: vi.fn(),
}));

function props() {
  return {
    negocio: { id: 'n1' },
    businessGroup: 'servs',
    reloadEntregas: vi.fn(),
    checarPermissao: vi.fn().mockResolvedValue(true),
    uiAlert: vi.fn().mockResolvedValue(undefined),
    uiConfirm: vi.fn(),
    formEntrega: { nome: 'Corte', duracao_minutos: '30', valor: '', valor_promocional: '', profissional_id: 'p1' },
    setFormEntrega: vi.fn(),
    entregas: [{ id: 'e1', profissional_id: 'p1' }],
    editingEntregaId: 'e1',
    setEditingEntregaId: vi.fn(),
    setShowNovaEntrega: vi.fn(),
    lockAction: vi.fn(),
    unlockAction: vi.fn(),
    getBillingErrorKey: vi.fn().mockReturnValue(null),
  };
}

beforeEach(() => vi.clearAllMocks());

describe('Validar o valor da entrega', () => {
  it.each(['createEntrega', 'updateEntrega'])('%s mostra o aviso de valor inválido sem gravar', async (action) => {
    const config = props();
    const { result } = renderHook(() => useDashboardEntregaMutations(config));

    await act(async () => result.current[action]({ preventDefault: vi.fn() }));

    expect(config.uiAlert).toHaveBeenCalledExactlyOnceWith('dashboard.entrega_valor_invalid', 'error');
    expect(insertEntrega).not.toHaveBeenCalled();
    expect(updateEntregaById).not.toHaveBeenCalled();
    expect(result.current.submittingEntrega).toBe(false);
  });
});
