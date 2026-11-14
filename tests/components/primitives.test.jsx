import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SearchEmptyState from '../../src/components/SearchEmptyState.jsx';
import BusinessGroupNotice from '../../src/components/BusinessGroupNotice.jsx';
import Heart from '../../src/pages/clientArea/components/Heart.jsx';
import ReviewStar from '../../src/pages/clientArea/components/ReviewStar.jsx';

describe('SearchEmptyState', () => {
  it('anuncia busca sem resultados', () => {
    render(<SearchEmptyState />);
    expect(screen.getByRole('status', { name: 'Nenhum resultado encontrado' })).toBeInTheDocument();
  });
  it('aceita classe adicional sem perder classe padrão', () => {
    render(<SearchEmptyState className="minha-classe" />);
    expect(screen.getByRole('status')).toHaveClass('minha-classe');
  });
});

describe('BusinessGroupNotice', () => {
  it('mostra carregamento e não oferece nova tentativa durante carregamento', () => {
    render(<BusinessGroupNotice status="loading" onRetry={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando informações');
    expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument();
  });
  it('permite repetir operação em erro', () => {
    const onRetry = vi.fn();
    render(<BusinessGroupNotice status="error" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe('Heart e ReviewStar', () => {
  it('coração preenchido usa cor atual', () => {
    const { container } = render(<Heart filled size={24} />);
    expect(container.querySelector('svg')).toHaveAttribute('fill', 'currentColor');
  });
  it('coração vazio não usa preenchimento', () => {
    const { container } = render(<Heart />);
    expect(container.querySelector('svg')).toHaveAttribute('fill', 'none');
  });
  it('estrela possui nome acessível e chama ação ao clicar', () => {
    const onClick = vi.fn();
    render(<ReviewStar active label="Nota 4" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Nota 4' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
  it('estrela ativa indica classe de destaque', () => {
    render(<ReviewStar active label="Nota 5" onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Nota 5' }).firstChild).toHaveClass('text-primary');
  });
});
