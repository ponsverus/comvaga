import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useVitrineBooking } from '../../src/pages/vitrine/hooks/useVitrineBooking.js';
import { getPrecoFinalEntrega } from '../../src/pages/vitrine/utils.js';
import { fetchVitrineEntregaById } from '../../src/pages/vitrine/api/vitrineApi.js';

// Nunca importa o cliente Supabase; serviço remoto substituído por simulação.
vi.mock('../../src/pages/vitrine/api/vitrineApi.js', () => ({ fetchVitrineEntregaById: vi.fn() }));

const ana = { id: 'p1', nome: 'Ana' };
const corte = { id: 'e1', profissional_id: 'p1', nome: 'Corte', preco: 100, preco_promocional: 80, duracao_minutos: 30, ativo: true };
const barba = { id: 'e2', profissional_id: 'p1', nome: 'Barba', preco: 40, duracao_minutos: 20, ativo: true };

function config(overrides = {}) {
  return {
    user: { id: 'cliente-1' }, userType: 'client', todayISO: '2026-11-16',
    fetchNowFromDb: vi.fn(), confirmKey: vi.fn().mockResolvedValue(true), alertKey: vi.fn(),
    navigate: vi.fn(), location: { pathname: '/v/teste', key: 'a', state: {} },
    loading: false, negocio: { id: 'n1' }, nomeNegocioLabel: 'Salão', profissionais: [ana],
    entregas: [corte, barba], counterPlural: 'serviços', getPrecoFinalEntrega,
    gerarLinkGoogle: vi.fn().mockReturnValue('https://calendar.google.com/teste'),
    gerarArquivoICS: vi.fn().mockReturnValue({ filename: 'evento.ics', content: 'BEGIN:VCALENDAR' }),
    calendarPlatformMode: 'ics', billingStatus: { booking_allowed: true },
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe('Fluxo simulado de seleção e início do agendamento', () => {
  it('cliente autenticado inicia agendamento sem chamar o banco', async () => {
    const props = config();
    const { result } = renderHook(() => useVitrineBooking(props));
    await act(async () => result.current.handleAgendarAgora(ana, [corte]));
    expect(result.current.flow.step).toBe('booking');
    expect(result.current.flow.profissional).toEqual(ana);
    expect(result.current.entregaVirtual.preco).toBe(80);
    expect(props.confirmKey).not.toHaveBeenCalled();
    expect(fetchVitrineEntregaById).not.toHaveBeenCalled();
  });

  it('bloqueia agendamento quando plano não permite', async () => {
    const props = config({ billingStatus: { booking_allowed: false } });
    const { result } = renderHook(() => useVitrineBooking(props));
    await act(async () => result.current.handleAgendarAgora(ana, [corte]));
    expect(result.current.flow.step).toBe('idle');
    expect(props.alertKey).toHaveBeenCalledWith('schedule_blocked', expect.any(String), expect.any(String), expect.any(String));
  });

  it('solicita login ao visitante e navega se autorizado', async () => {
    const props = config({ user: null, userType: null });
    const { result } = renderHook(() => useVitrineBooking(props));
    await act(async () => result.current.handleAgendarAgora(ana, [corte]));
    expect(result.current.flow.step).toBe('idle');
    expect(props.confirmKey).toHaveBeenCalledOnce();
    expect(props.navigate).toHaveBeenCalledWith('/login');
  });

  it('bloqueia uso profissional sem agendamento assistido', async () => {
    const props = config({ userType: 'professional' });
    const { result } = renderHook(() => useVitrineBooking(props));
    await act(async () => result.current.handleAgendarAgora(ana, [corte]));
    expect(result.current.flow.step).toBe('idle');
    expect(props.alertKey).toHaveBeenCalledWith('schedule_only_client', expect.any(String), expect.any(String), expect.any(String));
  });

  it('exige horário oficial quando não informado', async () => {
    const props = config({ todayISO: null });
    const { result } = renderHook(() => useVitrineBooking(props));
    await act(async () => result.current.handleAgendarAgora(ana, [corte]));
    expect(props.fetchNowFromDb).toHaveBeenCalledOnce();
    expect(result.current.flow.step).toBe('booking');
  });

  it('falha de horário oficial interrompe agendamento', async () => {
    const props = config({ todayISO: null, fetchNowFromDb: vi.fn().mockRejectedValue(new Error('sem horário')) });
    const { result } = renderHook(() => useVitrineBooking(props));
    await act(async () => result.current.handleAgendarAgora(ana, [corte]));
    expect(result.current.flow.step).toBe('idle');
    expect(props.alertKey).toHaveBeenCalledWith('schedule_time_unavailable');
  });

  it('combina serviços e soma duração e preços promocionais', async () => {
    const { result } = renderHook(() => useVitrineBooking(config()));
    await act(async () => result.current.handleAgendarAgora(ana, [corte, barba]));
    expect(result.current.entregaVirtual).toMatchObject({
      nome: '2 serviços', duracao_minutos: 50, preco: 120, entrega_ids: ['e1', 'e2'],
    });
  });


  it('seleciona dois serviços e confirma a seleção para o calendário', async () => {
    const { result } = renderHook(() => useVitrineBooking(config()));
    await act(async () => result.current.handleToggleSelecao(ana, corte));
    await act(async () => result.current.handleToggleSelecao(ana, barba));
    expect(result.current.hasSelecao).toBe(true);
    expect(result.current.entregasSelecionadas.map((item) => item.id)).toEqual(['e1', 'e2']);
    act(() => result.current.handleConfirmarSelecao());
    expect(result.current.flow.step).toBe('booking');
    expect(result.current.entregaVirtual).toMatchObject({ duracao_minutos: 50, preco: 120 });
    expect(result.current.hasSelecao).toBe(false);
  });

  it('fecha formulário e volta ao estado inicial', async () => {
    const { result } = renderHook(() => useVitrineBooking(config()));
    await act(async () => result.current.handleAgendarAgora(ana, [corte]));
    act(() => result.current.closeBooking());
    expect(result.current.flow.step).toBe('idle');
  });

  it('reagendamento usa serviço simulado quando não está no cache', async () => {
    fetchVitrineEntregaById.mockResolvedValue(corte);
    const props = config({ entregas: [], location: { pathname: '/v/teste', key: 'rebook', state: { rebook: { profissionalId: 'p1', entregaId: 'e1' } } } });
    const { result } = renderHook(() => useVitrineBooking(props));
    await waitFor(() => expect(result.current.flow.step).toBe('booking'));
    expect(fetchVitrineEntregaById).toHaveBeenCalledWith({ profissionalId: 'p1', entregaId: 'e1' });
    expect(props.navigate).toHaveBeenCalledWith('/v/teste', { replace: true, state: {} });
  });
});
