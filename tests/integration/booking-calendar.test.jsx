import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BookingCalendar from '../../src/components/BookingCalendar.jsx';
import { supabase } from '../../src/supabase.js';
import { invokeProtectedAction } from '../../src/utils/protectedAction.js';
import { useFeedback } from '../../src/feedback/useFeedback.js';

// Intercepta TODOS os pontos do fluxo que poderiam chamar o backend.
vi.mock('../../src/supabase.js', () => ({ supabase: { rpc: vi.fn() } }));
vi.mock('../../src/utils/authSession.js', () => ({ withAuthRetry: vi.fn((request) => request()) }));
vi.mock('../../src/utils/protectedAction.js', () => ({ invokeProtectedAction: vi.fn() }));
vi.mock('../../src/feedback/useFeedback.js', () => ({ useFeedback: vi.fn() }));
vi.mock('../../src/feedback/feedbackStore.js', () => ({ getFeedbackState: () => ({ open: false }) }));

const base = {
  profissional: { id: 'p1', nome: 'Ana', horarios: [{ dia_semana: 1, ativo: true }] },
  entrega: { id: 'e1', nome: 'Corte', duracao_minutos: 30, preco: 100 },
  todayISO: '2026-11-16', negocioId: 'n1', actorUserId: 'cliente1',
  onClose: vi.fn(), onConfirm: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  useFeedback.mockReturnValue({ showCustom: vi.fn() });
  supabase.rpc.mockResolvedValue({ data: [{ label: '09:00', is_heat: false, is_raio: false, horario_inicio: '09:00', horario_fim: '09:30' }], error: null });
  invokeProtectedAction.mockResolvedValue({ data: [{ inicio: '09:00', fim: '09:30' }], error: null });
});

describe('Calendário de agendamento com backend totalmente simulado', () => {
  it('mostra que horário oficial é necessário quando ausente', () => {
    render(<BookingCalendar {...base} todayISO={null} officialTimeUnavailable />);
    expect(screen.queryByRole('button', { name: '16' })).not.toBeInTheDocument();
    expect(screen.getByText('Agendamento')).toBeInTheDocument();
  });

  it('consulta horários simulados após escolher uma data', async () => {
    render(<BookingCalendar {...base} />);
    fireEvent.click(screen.getByRole('button', { name: '16' }));
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledWith('rpc_get_slots_v4', {
      p_profissional_id: 'p1', p_dia: '2026-11-16', p_entrega_min: 30, p_margem_min: 5, p_modo: 'todos',
    }));
    expect(await screen.findByRole('button', { name: /09:00/ })).toBeInTheDocument();
  });

  it('seleciona horário e confirma sem gravar no banco', async () => {
    const onConfirm = vi.fn();
    render(<BookingCalendar {...base} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: '16' }));
    fireEvent.click(await screen.findByRole('button', { name: /09:00/ }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar agendamento/i }));
    await waitFor(() => expect(invokeProtectedAction).toHaveBeenCalledWith('rpc_criar_agendamento', {
      p_negocio_id: 'n1', p_profissional_id: 'p1', p_entrega_id: 'e1', p_data: '2026-11-16', p_horario_inicio: '09:00',
    }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({ inicio: '09:00', fim: '09:30', label: '09:00', dataISO: '2026-11-16' }));
  });

  it('trata falha simulada na confirmação sem declarar sucesso', async () => {
    const onConfirm = vi.fn();
    invokeProtectedAction.mockResolvedValue({ data: null, error: new Error('falha simulada') });
    render(<BookingCalendar {...base} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: '16' }));
    fireEvent.click(await screen.findByRole('button', { name: /09:00/ }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar agendamento/i }));
    await waitFor(() => expect(useFeedback().showCustom).toHaveBeenCalled());
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
