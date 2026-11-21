import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import BookingCalendar from '../../src/components/BookingCalendar.jsx';
import { supabase } from '../../src/supabase.js';
import { invokeProtectedAction } from '../../src/utils/protectedAction.js';
import { ptBR } from '../../src/feedback/messages/ptBR.js';

vi.mock('../../src/supabase.js', () => ({ supabase: { rpc: vi.fn() } }));
vi.mock('../../src/utils/authSession.js', () => ({ withAuthRetry: vi.fn((request) => request()) }));
vi.mock('../../src/utils/protectedAction.js', () => ({ invokeProtectedAction: vi.fn() }));
vi.mock('../../src/feedback/feedbackStore.js', () => ({ getFeedbackState: () => ({ open: false }) }));

const base = {
  profissional: { id: 'p1', nome: 'Ana', horarios: [{ dia_semana: 1, ativo: true }] },
  entrega: { id: 'e1', nome: 'Corte', tempo_minutos: 30, valor: 100 },
  todayISO: '2026-11-16', negocioId: 'n1', actorUserId: 'cliente1',
  onClose: vi.fn(), onConfirm: vi.fn(), onAlert: vi.fn(),
};

const slots = (hora = '09:00') => ({
  label: hora, is_heat: false, is_raio: false,
  horario_inicio: hora, horario_fim: '09:30',
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
  supabase.rpc.mockResolvedValue({ data: [slots()], error: null });
  invokeProtectedAction.mockResolvedValue({ data: [{ inicio: '09:00', fim: '09:30' }], error: null });
});

describe('Calendário de agendamento com backend totalmente simulado', () => {
  it('abre como diálogo, identifica os controles e devolve o foco ao fechar', () => {
    function Launcher() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Abrir calendário</button>
          {open && <BookingCalendar {...base} onClose={() => setOpen(false)} />}
        </>
      );
    }

    render(<Launcher />);
    const trigger = screen.getByRole('button', { name: 'Abrir calendário' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Agendamento Corte' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Fechar calendário' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /16 de novembro de 2026/i })).toHaveAttribute('aria-current', 'date');

    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('mantém o fechamento bloqueado durante uma confirmação pendente', async () => {
    const pending = deferred();
    const onClose = vi.fn();
    invokeProtectedAction.mockReturnValue(pending.promise);
    render(<BookingCalendar {...base} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /16 de novembro de 2026/i }));
    fireEvent.click(await screen.findByRole('button', { name: /09:00/ }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar agendamento/i }));

    const closeButton = screen.getByRole('button', { name: 'Fechar calendário' });
    expect(closeButton).toHaveAttribute('aria-disabled', 'true');
    closeButton.focus();
    expect(closeButton).toHaveFocus();
    fireEvent.click(closeButton);
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => { pending.resolve({ data: [{ inicio: '09:00', fim: '09:30' }], error: null }); });
    expect(closeButton).toHaveAttribute('aria-disabled', 'false');
  });

  it('mostra que horário oficial é necessário quando ausente', () => {
    render(<BookingCalendar {...base} todayISO={null} officialTimeUnavailable />);
    expect(screen.queryByRole('button', { name: /16 de novembro de 2026/i })).not.toBeInTheDocument();
    expect(screen.getByText('Agendamento')).toBeInTheDocument();
  });

  it('consulta horários simulados após escolher uma data', async () => {
    render(<BookingCalendar {...base} />);
    fireEvent.click(screen.getByRole('button', { name: /16 de novembro de 2026/i }));
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledWith('rpc_get_slots_v4', {
      p_profissional_id: 'p1', p_dia: '2026-11-16', p_entrega_min: 30, p_margem_min: 5, p_modo: 'todos',
    }));
    expect(await screen.findByRole('button', { name: /09:00/ })).toBeInTheDocument();
  });

  it('seleciona horário e confirma sem gravar no banco', async () => {
    const onConfirm = vi.fn();
    render(<BookingCalendar {...base} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: /16 de novembro de 2026/i }));
    fireEvent.click(await screen.findByRole('button', { name: /09:00/ }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar agendamento/i }));
    await waitFor(() => expect(invokeProtectedAction).toHaveBeenCalledWith('rpc_criar_agendamento', {
      p_negocio_id: 'n1', p_profissional_id: 'p1', p_entrega_id: 'e1', p_data: '2026-11-16', p_horario_inicio: '09:00',
    }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({ inicio: '09:00', fim: '09:30', label: '09:00', dataISO: '2026-11-16' }));
  });

  it('sinaliza falha de checagem na abertura da Vitrine sem declarar sucesso.', async () => {
    const onConfirm = vi.fn();
    const onAlert = vi.fn();
    invokeProtectedAction.mockResolvedValue({ data: null, error: new Error('falha simulada') });
    render(<BookingCalendar {...base} onConfirm={onConfirm} onAlert={onAlert} />);
    fireEvent.click(screen.getByRole('button', { name: /16 de novembro de 2026/i }));
    fireEvent.click(await screen.findByRole('button', { name: /09:00/ }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar agendamento/i }));
    await waitFor(() => expect(onAlert).toHaveBeenCalledWith({
      title: 'Agendamento', body: ptBR.vitrine.schedule_errors.unexpected,
      variant: 'danger', buttonText: 'OK',
    }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('avisa falta de horários sem aplicar tema escuro.', async () => {
    const onAlert = vi.fn();
    supabase.rpc.mockResolvedValue({ data: [], error: null });
    render(<BookingCalendar {...base} onAlert={onAlert} temaAtivo="light" />);
    fireEvent.click(screen.getByRole('button', { name: /16 de novembro de 2026/i }));
    await waitFor(() => expect(onAlert).toHaveBeenCalledWith({
      title: 'Horários', body: ptBR.vitrine.schedule_errors.no_slots,
      variant: 'warning', buttonText: 'OK',
    }));
    expect(onAlert.mock.calls[0][0]).not.toHaveProperty('screen');
  });

  it('avisa falta de carregamento sem aplicar tema escuro.', async () => {
    const onAlert = vi.fn();
    supabase.rpc.mockRejectedValue(new Error('falha de rede simulada'));
    render(<BookingCalendar {...base} onAlert={onAlert} temaAtivo="light" />);
    fireEvent.click(screen.getByRole('button', { name: /16 de novembro de 2026/i }));
    await waitFor(() => expect(onAlert).toHaveBeenCalledWith({
      title: 'Horários', body: ptBR.vitrine.schedule_errors.slots_load_error,
      variant: 'danger', buttonText: 'OK',
    }));
    expect(onAlert.mock.calls[0][0]).not.toHaveProperty('screen');
  });

  it('ignora aviso de horários vazios que chega depois de fechar o calendário', async () => {
    const pending = deferred();
    const onAlert = vi.fn();
    supabase.rpc.mockReturnValue(pending.promise);
    const { unmount } = render(<BookingCalendar {...base} onAlert={onAlert} />);
    fireEvent.click(screen.getByRole('button', { name: /16 de novembro de 2026/i }));
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => { pending.resolve({ data: [], error: null }); });
    expect(onAlert).not.toHaveBeenCalled();
  });

  it('ignora falha de rede que chega depois de fechar o calendário', async () => {
    const pending = deferred();
    const onAlert = vi.fn();
    supabase.rpc.mockReturnValue(pending.promise);
    const { unmount } = render(<BookingCalendar {...base} onAlert={onAlert} />);
    fireEvent.click(screen.getByRole('button', { name: /16 de novembro de 2026/i }));
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => { pending.reject(new Error('rede indisponível')); });
    expect(onAlert).not.toHaveBeenCalled();
  });

  it('ignora erro de retorno que chega depois de fechar o calendário.', async () => {
    const pending = deferred();
    const onAlert = vi.fn();
    invokeProtectedAction.mockReturnValue(pending.promise);
    const { unmount } = render(<BookingCalendar {...base} onAlert={onAlert} />);
    fireEvent.click(screen.getByRole('button', { name: /16 de novembro de 2026/i }));
    fireEvent.click(await screen.findByRole('button', { name: /09:00/ }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar agendamento/i }));
    await waitFor(() => expect(invokeProtectedAction).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => { pending.resolve({ data: null, error: new Error('falha tardia') }); });
    expect(onAlert).not.toHaveBeenCalled();
  });

  it('confirma agendamento assistido com vários trabalhos e usa o fim do último', async () => {
    const onConfirm = vi.fn();
    invokeProtectedAction.mockResolvedValue({
      data: [{ inicio: '09:00', fim: '09:30' }, { inicio: '09:30', fim: '10:00' }], error: null,
    });
    render(<BookingCalendar
      {...base}
      entrega={{ ...base.entrega, entrega_ids: ['e1', 'e2'], tempo_minutos: 60 }}
      assistedBooking assistedClienteId="cliente-assistido" onConfirm={onConfirm}
    />);
    fireEvent.click(screen.getByRole('button', { name: /16 de novembro de 2026/i }));
    fireEvent.click(await screen.findByRole('button', { name: /09:00/ }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar agendamento/i }));
    await waitFor(() => expect(invokeProtectedAction).toHaveBeenCalledWith('rpc_criar_agendamentos_multiplos_assistido', {
      p_cliente_id: 'cliente-assistido', p_negocio_id: 'n1', p_profissional_id: 'p1',
      p_entrega_ids: ['e1', 'e2'], p_data: '2026-11-16', p_horario_inicio: '09:00',
    }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({
      inicio: '09:00', fim: '10:00', label: '09:00', dataISO: '2026-11-16',
    }));
  });

  it('ignora horários de uma data anterior quando a resposta chega depois', async () => {
    const first = deferred();
    const second = deferred();
    supabase.rpc.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    render(<BookingCalendar {...base} />);
    fireEvent.click(screen.getByRole('button', { name: /16 de novembro de 2026/i }));
    fireEvent.click(screen.getByRole('button', { name: /23 de novembro de 2026/i }));
    await act(async () => {
      second.resolve({ data: [slots('10:00')], error: null });
      first.resolve({ data: [slots('09:00')], error: null });
    });
    expect(screen.getByRole('button', { name: /10:00/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /09:00/ })).not.toBeInTheDocument();
  });

  it('omite aviso de falha de uma data antiga ao selecionar outra.', async () => {
    const first = deferred();
    const second = deferred();
    const onAlert = vi.fn();
    supabase.rpc.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    render(<BookingCalendar {...base} onAlert={onAlert} />);
    fireEvent.click(screen.getByRole('button', { name: /16 de novembro de 2026/i }));
    fireEvent.click(screen.getByRole('button', { name: /23 de novembro de 2026/i }));
    await act(async () => {
      second.resolve({ data: [slots('10:00')], error: null });
      first.reject(new Error('erro antigo'));
    });
    expect(screen.getByRole('button', { name: /10:00/ })).toBeInTheDocument();
    expect(onAlert).not.toHaveBeenCalled();
  });

  it('reconsulta horários após erro de horário expirado e emite aviso para a Vitrine', async () => {
    const onAlert = vi.fn();
    invokeProtectedAction.mockResolvedValue({ data: null, error: new Error('agendamento_horario_expirado') });
    render(<BookingCalendar {...base} onAlert={onAlert} />);
    fireEvent.click(screen.getByRole('button', { name: /16 de novembro de 2026/i }));
    fireEvent.click(await screen.findByRole('button', { name: /09:00/ }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar agendamento/i }));
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onAlert).toHaveBeenCalledWith({
      title: 'Agendamento', body: ptBR.vitrine.schedule_errors.slot_expired,
      variant: 'warning', buttonText: 'OK',
    }));
  });
});
