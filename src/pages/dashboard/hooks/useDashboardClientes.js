import { useCallback, useEffect, useState } from 'react';
import { fetchClientesDashboard } from '../api/dashboardApi';
import { getRequestErrorKey } from '../../../utils/requestError';
import { ptBR } from '../../../feedback/messages/ptBR';

const CLIENTES_PAGE_SIZE = 50;

export function useDashboardClientes({ negocioId }) {
  const [clientes, setClientes] = useState([]);
  const [clientesHasMore, setClientesHasMore] = useState(false);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [clientesLoadingMore, setClientesLoadingMore] = useState(false);
  const [clientesError, setClientesError] = useState('');

  const loadClientes = useCallback(async ({ cursor = null, append = false } = {}) => {
    if (!negocioId) return;
    const rows = await fetchClientesDashboard({
      negocioId,
      limit: CLIENTES_PAGE_SIZE + 1,
      cursor,
    });
    const visibleRows = rows.slice(0, CLIENTES_PAGE_SIZE);

    setClientes((prev) => {
      const next = append ? [...prev, ...visibleRows] : visibleRows;
      const seen = new Set();
      return next.filter((item) => {
        if (!item?.cliente_id || seen.has(item.cliente_id)) return false;
        seen.add(item.cliente_id);
        return true;
      });
    });
    setClientesHasMore(rows.length > CLIENTES_PAGE_SIZE);
  }, [negocioId]);

  useEffect(() => {
    if (!negocioId) {
      setClientes([]);
      setClientesHasMore(false);
      return;
    }

    let active = true;
    setClientesLoading(true);
    setClientesError('');
    setClientesHasMore(false);

      loadClientes({ cursor: null, append: false })
      .catch((error) => {
        if (!active) return;
        setClientes([]);
        const requestKey = getRequestErrorKey(error);
        if (requestKey === 'alerts.request_timeout') {
          setClientesError(ptBR.dashboard.inline_errors.clients_load_timeout);
        } else if (requestKey === 'alerts.rate_limit_exceeded') {
          setClientesError(ptBR.alerts.rate_limit_exceeded.body);
        } else {
          console.error('Dashboard clients load error:', error);
          setClientesError(ptBR.dashboard.inline_errors.clients_load_error);
        }
      })
      .finally(() => {
        if (active) setClientesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadClientes, negocioId]);

  const loadMoreClientes = useCallback(async () => {
    if (clientesLoadingMore || !clientesHasMore || !negocioId) return;
    try {
      setClientesLoadingMore(true);
      const cursor = clientes.length ? clientes[clientes.length - 1] : null;
      await loadClientes({ cursor, append: true });
    } catch (error) {
      const requestKey = getRequestErrorKey(error);
      if (requestKey === 'alerts.request_timeout') {
        setClientesError(ptBR.dashboard.inline_errors.clients_load_more_timeout);
      } else if (requestKey === 'alerts.rate_limit_exceeded') {
        setClientesError(ptBR.alerts.rate_limit_exceeded.body);
      } else {
        console.error('Dashboard clients load more error:', error);
        setClientesError(ptBR.dashboard.inline_errors.clients_load_more_error);
      }
    } finally {
      setClientesLoadingMore(false);
    }
  }, [clientes, clientesHasMore, clientesLoadingMore, loadClientes, negocioId]);

  return {
    clientes,
    clientesLoading,
    clientesError,
    clientesHasMore,
    clientesLoadingMore,
    loadMoreClientes,
  };
}
