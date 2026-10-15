import { useCallback, useEffect, useMemo, useState } from 'react';
import { AG_PAGE_SIZE, compareAgendamentoDateTimeDesc } from '../utils';
import { fetchAgendamentosNegocio } from '../api/dashboardApi';
import { getRequestErrorKey } from '../../../utils/requestError';
import { useFeedback } from '../../../feedback/useFeedback';

export function useDashboardHistorico({
  negocioId,
  hoje,
  parceiroProfissionalId,
}) {
  const feedback = useFeedback();
  const [historicoAgendamentos, setHistoricoAgendamentos] = useState([]);
  const [historicoCursor, setHistoricoCursor] = useState(null);
  const [historicoHasMore, setHistoricoHasMore] = useState(false);
  const [historicoLoadingMore, setHistoricoLoadingMore] = useState(false);
  const [historicoData, setHistoricoData] = useState('');
  const [historicoError, setHistoricoError] = useState('');

  useEffect(() => {
    setHistoricoData((prev) => (prev ? prev : hoje));
  }, [hoje]);

  const historicoProfIds = useMemo(
    () => (parceiroProfissionalId ? [parceiroProfissionalId] : []),
    [parceiroProfissionalId]
  );

  const fetchHistoricoPage = useCallback(async ({ profIds, date, cursor, append }) => {
    const rows = await fetchAgendamentosNegocio({
      negocioId,
      profissionalIds: profIds,
      dataInicio: date,
      dataFim: date,
      limit: AG_PAGE_SIZE + 1,
      cursor,
    });
    const visibleRows = rows.slice(0, AG_PAGE_SIZE);

    setHistoricoAgendamentos((prev) => {
      const next = append ? [...prev, ...visibleRows] : visibleRows;
      const seen = new Set();
      return next
        .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
        .sort(compareAgendamentoDateTimeDesc);
    });
    setHistoricoHasMore(rows.length > AG_PAGE_SIZE);
    setHistoricoCursor(visibleRows.length ? visibleRows[visibleRows.length - 1] : cursor);
    setHistoricoError('');
  }, [negocioId]);

  useEffect(() => {
    if (!historicoData || !negocioId) return;
    setHistoricoCursor(null);
    setHistoricoHasMore(false);
    setHistoricoAgendamentos([]);
    setHistoricoError('');
    fetchHistoricoPage({ profIds: historicoProfIds, date: historicoData, cursor: null, append: false })
      .catch((error) => {
        const requestKey = getRequestErrorKey(error);
        setHistoricoAgendamentos([]);
        setHistoricoHasMore(false);
        if (requestKey === 'alerts.request_timeout' || requestKey === 'alerts.rate_limit_exceeded') {
          setHistoricoError('dashboard.history_load_error');
          return;
        }
        setHistoricoError('dashboard.history_load_error');
      });
  }, [fetchHistoricoPage, historicoData, historicoProfIds, negocioId]);

  const loadMoreHistorico = useCallback(async () => {
    if (historicoLoadingMore || !historicoHasMore || !negocioId) return;
    try {
      setHistoricoLoadingMore(true);
      await fetchHistoricoPage({ profIds: historicoProfIds, date: historicoData, cursor: historicoCursor, append: true });
    } catch (error) {
      console.warn('Falha ao carregar mais histórico.', error);
      feedback.showMessage('dashboard.history_load_error');
    } finally {
      setHistoricoLoadingMore(false);
    }
  }, [
    fetchHistoricoPage,
    historicoCursor,
    historicoData,
    historicoHasMore,
    historicoLoadingMore,
    historicoProfIds,
    feedback,
    negocioId,
  ]);

  return {
    historicoAgendamentos,
    historicoHasMore,
    historicoLoadingMore,
    historicoError,
    historicoData,
    setHistoricoData,
    loadMoreHistorico,
  };
}
