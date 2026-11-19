import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useVitrineBooking } from '../../src/pages/vitrine/hooks/useVitrineBooking.js';
import { getValorFinalEntrega } from '../../src/pages/vitrine/utils.js';
import { fetchVitrineEntregaById } from '../../src/pages/vitrine/api/vitrineApi.js';

vi.mock('../../src/pages/vitrine/api/vitrineApi.js', () => ({ fetchVitrineEntregaById: vi.fn() }));

const ana = { id: 'p1', nome: 'Ana' };
const corte = { id: 'e1', profissional_id: 'p1', nome: 'Corte', valor: 100, valor_promocional: 80, tempo_minutos: 30, ativo: true };
const barba = { id: 'e2', profissional_id: 'p1', nome: 'Barba', valor: 40, tempo_minutos: 20, ativo: true };

function config(overrides = {}) {
  return {
    user: { id: 'cliente-1' }, userType: 'client', todayISO: '2026-11-16',
    fetchNowFromDb: vi.fn(), confirmKey: vi.fn().mockResolvedValue(true), alertKey: vi.fn(),
    navigate: vi.fn(), location: { pathname: '/v/teste', key: 'a', state: {} },
    loading: false, negocio: { id: 'n1' }, nomeNegocioLabel: 'Barbearia', profissionais: [ana],
    entregas: [corte, barba], counterPlural: 'trabalhos', getValorFinalEntrega,
    gerarLinkGoogle: vi.fn().mockReturnValue('https://calendar.google.com/teste'),
    gerarArquivoICS: vi.fn().mockReturnValue({ filename: 'evento.ics', content: 'BEGIN:VCALENDAR' }),
    calendarPlatformMode: 'ics', billingStatus: { booking_allowed: true },
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe('Fluxo simulado de escolha e abertura do agendamento', () => {
  it('cliente autenticado inicia agendamento sem chamar o banco', async () => {
    const props = config();
    const { result } = renderHook(() => useVitrineBooking(props));
    await act(async () => result.current.handleAgendarAgora(ana, [corte]));
    expect(result.current.flow.step).toBe('booking');
    expect(result.current.flow.profissional).toEqual(ana);
    expect(result.current.entregaVirtual.valor).toBe(80);
    expect(props.confirmKey).not.toHaveBeenCalled();
    expect(fetchVitrineEntregaById).not.toHaveBeenCalled();
  });

  it('impede agendamento quando o plano bloqueia', async () => {
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

  it('impede uso profissional sem agendamento assistido', async () => {
    const props = config({ userType: 'professional' });
    const { result } = renderHook(() => useVitrineBooking(props));
    await act(async () => result.current.handleAgendarAgora(ana, [corte]));
    expect(result.current.flow.step).toBe('idle');
    expect(props.alertKey).toHaveBeenCalledWith('schedule_only_client', expect.any(String), expect.any(String), expect.any(String));
  });

  it('busca horario oficial quando ausente', async () => {
    const props = config({ todayISO: null });
    const { result } = renderHook(() => useVitrineBooking(props));
    await act(async () => result.current.handleAgendarAgora(ana, [corte]));
    expect(props.fetchNowFromDb).toHaveBeenCalledOnce();
    expect(result.current.flow.step).toBe('booking');
  });

  it('falha ao consultar horario oficial interrompe agendamento', async () => {
    const props = config({ todayISO: null, fetchNowFromDb: vi.fn().mockRejectedValue(new Error('sem horário')) });
    const { result } = renderHook(() => useVitrineBooking(props));
    await act(async () => result.current.handleAgendarAgora(ana, [corte]));
    expect(result.current.flow.step).toBe('idle');
    expect(props.alertKey).toHaveBeenCalledWith('schedule_time_unavailable');
  });

  it('combina trabalhos e soma tempo e valores promocionais', async () => {
    const { result } = renderHook(() => useVitrineBooking(config()));
    await act(async () => result.current.handleAgendarAgora(ana, [corte, barba]));
    expect(result.current.entregaVirtual).toMatchObject({
      nome: '2 trabalhos', tempo_minutos: 50, valor: 120, entrega_ids: ['e1', 'e2'],
    });
  });

  it('escolhe dois trabalhos e confirma para o calendario', async () => {
    const { result } = renderHook(() => useVitrineBooking(config()));
    await act(async () => result.current.handleToggleSelecao(ana, corte));
    await act(async () => result.current.handleToggleSelecao(ana, barba));
    expect(result.current.hasSelecao).toBe(true);
    expect(result.current.entregasSelecionadas.map((item) => item.id)).toEqual(['e1', 'e2']);
    act(() => result.current.handleConfirmarSelecao());
    expect(result.current.flow.step).toBe('booking');
    expect(result.current.entregaVirtual).toMatchObject({ tempo_minutos: 50, valor: 120 });
    expect(result.current.hasSelecao).toBe(false);
  });

  it('fecha formulario e retorna ao estado inicial', async () => {
    const { result } = renderHook(() => useVitrineBooking(config()));
    await act(async () => result.current.handleAgendarAgora(ana, [corte]));
    act(() => result.current.closeBooking());
    expect(result.current.flow.step).toBe('idle');
  });

  it('reagendamento busca trabalho simulado fora do cache', async () => {
    fetchVitrineEntregaById.mockResolvedValue(corte);
    const props = config({ entregas: [], location: { pathname: '/v/teste', key: 'rebook', state: { rebook: { profissionalId: 'p1', entregaId: 'e1' } } } });
    const { result } = renderHook(() => useVitrineBooking(props));
    await waitFor(() => expect(result.current.flow.step).toBe('booking'));
    expect(fetchVitrineEntregaById).toHaveBeenCalledWith({ profissionalId: 'p1', entregaId: 'e1' });
    expect(props.navigate).toHaveBeenCalledWith('/v/teste', { replace: true, state: {} });
  });
});
