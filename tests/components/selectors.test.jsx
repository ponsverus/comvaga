
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ProfissionalSelect from '../../src/components/ProfissionalSelect.jsx';
import DatePicker from '../../src/components/DatePicker.jsx';

const profissionais = [
  { id: 'p1', nome: 'Ana', status: 'ativo', profissao: 'Cabeleireira' },
  { id: 'p2', nome: 'Bruno', status: 'inativo' },
];

describe('ProfissionalSelect', () => {
  it('exibe placeholder sem profissional selecionado', () => {
    render(<ProfissionalSelect value={null} onChange={() => {}} profissionais={profissionais} />);
    expect(screen.getByRole('button', { name: /selecione/i })).toBeInTheDocument();
  });
  it('oculta profissionais inativos automaticamente', () => {
    render(<ProfissionalSelect value={null} onChange={() => {}} profissionais={profissionais} />);
    fireEvent.click(screen.getByRole('button', { name: /selecione/i }));
    expect(screen.getByRole('button', { name: /ana/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /bruno/i })).not.toBeInTheDocument();
  });
  it('seleciona profissional e fecha lista', () => {
    const onChange = vi.fn();
    render(<ProfissionalSelect value={null} onChange={onChange} profissionais={profissionais} />);
    fireEvent.click(screen.getByRole('button', { name: /selecione/i }));
    fireEvent.click(screen.getByRole('button', { name: /ana/i }));
    expect(onChange).toHaveBeenCalledWith('p1');
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
  it('pode mostrar profissionais inativos se configurado', () => {
    render(<ProfissionalSelect value={null} onChange={() => {}} apenasAtivos={false} profissionais={profissionais} />);
    fireEvent.click(screen.getByRole('button', { name: /selecione/i }));
    expect(screen.getByRole('button', { name: /bruno/i })).toBeInTheDocument();
  });
});

describe('DatePicker', () => {
  it('mostra o valor selecionado em formato brasileiro', () => {
    render(<DatePicker value="2026-11-16" todayISO="2026-11-14" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '16.11.2026' })).toBeInTheDocument();
  });
  it('seleciona dia e retorna ISO', () => {
    const onChange = vi.fn();
    render(<DatePicker value="" todayISO="2026-11-14" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /selecionar/i }));
    fireEvent.click(screen.getByRole('button', { name: '20' }));
    expect(onChange).toHaveBeenCalledWith('2026-11-20');
  });
  it('atalho hoje retorna a data informada', () => {
    const onChange = vi.fn();
    render(<DatePicker value="" todayISO="2026-11-14" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /selecionar/i }));
    fireEvent.click(screen.getByRole('button', { name: /^hoje$/i }));
    expect(onChange).toHaveBeenCalledWith('2026-11-14');
  });
});
