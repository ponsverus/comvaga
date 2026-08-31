import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { UsersIcon, CheckIcon } from '../../../components/icons';
import { formatDateBRFromISO } from '../utils';
import { getPublicUrl } from '../api/dashboardApi';

const CLIENTES_PER_PAGE = 6;

function moneyBR(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return '0,00';
  return number.toFixed(2).replace('.', ',');
}

function ClienteCard({ cliente, itemLabelText, onAgendarCliente }) {
  const avatarUrl = getPublicUrl('avatars', cliente.cliente_avatar_path);
  const nome = String(cliente.cliente_nome || 'Cliente').trim();
  const inicial = nome?.[0]?.toUpperCase() || '?';

  return (
    <div className="bg-dark-200 border border-gray-800 rounded-custom p-4 h-full flex flex-col">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-700 bg-dark-100 flex items-center justify-center shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={nome} className="w-full h-full object-cover" />
          ) : (
            <span className="text-primary text-lg font-normal">{inicial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-normal text-white truncate uppercase">{nome}</h3>
          <p className="text-xs text-gray-500 uppercase">{Number(cliente.total_agendamentos || 0)} agendamentos</p>
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <div className="text-xs text-gray-500 uppercase mb-3">ÚLTIMO AGENDAMENTO</div>
        <div className="min-w-0">
          <div className="text-primary text-sm leading-snug break-words">{cliente.ultimo_entrega_nome || itemLabelText}</div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="min-w-0">
            <div className="text-xs text-gray-500 mb-1">DATA</div>
            <div className="text-white truncate">{formatDateBRFromISO(cliente.ultimo_data)}</div>
          </div>
          <div className="min-w-0">
            <div className="text-xs text-gray-500 mb-1">VALOR</div>
            <div className="text-white truncate">R$ {moneyBR(cliente.ultimo_valor)}</div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onAgendarCliente(cliente)}
        className="mt-auto w-full py-2 bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary rounded-button text-sm font-normal uppercase transition-all flex items-center justify-center gap-2"
      >
        <CheckIcon className="w-4 h-4" />
        AGENDAR CLIENTE
      </button>
    </div>
  );
}

export default function ClientesSection({
  clientes,
  clientesLoading,
  clientesError,
  clientesHasMore,
  clientesLoadingMore,
  loadMoreClientes,
  onAgendarCliente,
  itemLabel = 'SERV',
}) {
  const itemLabelText = String(itemLabel || 'SERV').toUpperCase();
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(clientes.length / CLIENTES_PER_PAGE));
  const currentPage = Math.min(page, pageCount - 1);
  const canGoNext = currentPage < pageCount - 1 || clientesHasMore;

  useEffect(() => {
    setPage((prev) => Math.min(prev, pageCount - 1));
  }, [pageCount]);

  const visibleClientes = useMemo(() => {
    const start = currentPage * CLIENTES_PER_PAGE;
    return clientes.slice(start, start + CLIENTES_PER_PAGE);
  }, [clientes, currentPage]);

  const goPrev = () => setPage((prev) => Math.max(prev - 1, 0));

  const goNext = async () => {
    if (currentPage < pageCount - 1) {
      setPage((prev) => prev + 1);
      return;
    }
    if (!clientesHasMore || clientesLoadingMore) return;
    await loadMoreClientes();
    setPage((prev) => prev + 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-normal">CLIENTES</h2>
      </div>

      {clientesLoading ? (
        <div className="text-gray-500 text-center py-12">CARREGANDO CLIENTES...</div>
      ) : clientesError ? (
        <div className="border border-red-500/30 bg-red-500/10 text-red-300 rounded-custom p-4 text-sm">
          {clientesError}
        </div>
      ) : clientes.length > 0 ? (
        <div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleClientes.map((cliente) => (
              <ClienteCard key={cliente.cliente_id} cliente={cliente} itemLabelText={itemLabelText} onAgendarCliente={onAgendarCliente} />
            ))}
          </div>

          {(pageCount > 1 || clientesHasMore) ? (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                type="button"
                onClick={goPrev}
                disabled={currentPage === 0}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-700 text-gray-300 transition-colors hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: pageCount }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setPage(index)}
                  className={['rounded-full transition-all duration-300', index === currentPage ? 'w-4 h-2 bg-primary' : 'w-2 h-2 bg-gray-600 hover:bg-gray-400'].join(' ')}
                  aria-label={`Ir para pagina ${index + 1}`}
                />
              ))}
              {clientesHasMore ? (
                <span className="w-2 h-2 rounded-full bg-gray-800" aria-hidden="true" />
              ) : null}

              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext || clientesLoadingMore}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-700 text-gray-300 transition-colors hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-center py-12">
          <UsersIcon className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-40" />
          <p className="text-gray-500 text-sm font-medium">:(</p>
        </div>
      )}
    </div>
  );
}
