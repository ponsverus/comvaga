import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BookingConfirmedModal from '../../src/pages/vitrine/components/BookingConfirmedModal.jsx';

const defaultProps = {
  booking: { lastSlot: { label: '09:00', dataISO: '2026-11-16' } },
  styles: { bg: '', title: '', hora: '', data: '', box: '', sub: '', hint: '', actionBtn: '', secondaryBtn: '' },
  calendarActionConfig: { primaryLabel: 'BAIXAR EVENTO', primaryAction: vi.fn(), secondaryLabel: '', secondaryAction: null },
  formatDateBR: () => '16.11.2026',
  onClose: vi.fn(),
  navigate: vi.fn(),
};

describe('BookingConfirmedModal', () => {
  it('não renderiza quando fechado', () => {
    render(<BookingConfirmedModal {...defaultProps} open={false} />);
    expect(screen.queryByText(/AGENDADO/i)).not.toBeInTheDocument();
  });
  it('apresenta data e horário confirmados', () => {
    render(<BookingConfirmedModal {...defaultProps} open />);
    expect(screen.getByText('AGENDADO :)')).toBeInTheDocument();
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText(/16\.11\.2026/)).toBeInTheDocument();
  });
  it('aciona exportação de calendário quando solicitada', () => {
    const primaryAction = vi.fn();
    render(<BookingConfirmedModal {...defaultProps} calendarActionConfig={{ ...defaultProps.calendarActionConfig, primaryAction }} open />);
    fireEvent.click(screen.getByRole('button', { name: 'BAIXAR EVENTO' }));
    expect(primaryAction).toHaveBeenCalledOnce();
  });
  it('fecha e retorna para a área do cliente', () => {
    const onClose = vi.fn(); const navigate = vi.fn();
    render(<BookingConfirmedModal {...defaultProps} open onClose={onClose} navigate={navigate} />);
    fireEvent.click(screen.getByRole('button', { name: /prefiro esquecer/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('/minha-area');
  });
  it('agendamento assistido volta ao dashboard sem mostrar exportação', () => {
    const onClose = vi.fn(); const navigate = vi.fn();
    render(<BookingConfirmedModal {...defaultProps} open assistedBooking negocioId="n1" onClose={onClose} navigate={navigate} />);
    expect(screen.queryByRole('button', { name: 'BAIXAR EVENTO' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /voltar ao dashboard/i }));
    expect(navigate).toHaveBeenCalledWith('/dashboard', { state: { negocioId: 'n1', activeTab: 'clientes' } });
  });
});
