import { useCallback, useEffect, useState } from 'react';
import { fetchDashboardOverview } from '../api/dashboardApi';

function normalizeMonth(value, todayISO) {
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  const todayMonth = String(todayISO || '').slice(0, 7);
  return /^\d{4}-\d{2}$/.test(todayMonth) ? todayMonth : '';
}

export function useDashboardMetrics({
  negocioId,
  hoje,
  faturamentoData,
  faturamentoMes,
  parceiroProfissionalId,
}) {
  const [metricsHoje, setMetricsHoje] = useState(null);
  const [metricsTopCards, setMetricsTopCards] = useState(null);
  const [metricsDia, setMetricsDia] = useState(null);
  const [metricsPeriodoData, setMetricsPeriodoData] = useState(null);
  const [metricsUtilizacao, setMetricsUtilizacao] = useState(null);
  const [metricsFutureBookings, setMetricsFutureBookings] = useState(null);
  const [proximoAgendamento, setProximoAgendamento] = useState(null);
  const [metricsHojeLoading, setMetricsHojeLoading] = useState(false);
  const [metricsTopCardsLoading, setMetricsTopCardsLoading] = useState(false);
  const [metricsDiaLoading, setMetricsDiaLoading] = useState(false);
  const [metricsPeriodoLoading, setMetricsPeriodoLoading] = useState(false);
  const [metricsUtilizacaoLoading, setMetricsUtilizacaoLoading] = useState(false);
  const [metricsFutureBookingsLoading, setMetricsFutureBookingsLoading] = useState(false);
  const [proximoAgendamentoLoading, setProximoAgendamentoLoading] = useState(false);

  const setOverviewLoading = useCallback((loading) => {
    setMetricsHojeLoading(loading);
    setMetricsTopCardsLoading(loading);
    setMetricsDiaLoading(loading);
    setMetricsPeriodoLoading(loading);
    setMetricsUtilizacaoLoading(loading);
    setMetricsFutureBookingsLoading(loading);
    setProximoAgendamentoLoading(loading);
  }, []);

  const clearOverview = useCallback(() => {
    setMetricsHoje(null);
    setMetricsTopCards(null);
    setMetricsDia(null);
    setMetricsPeriodoData(null);
    setMetricsUtilizacao(null);
    setMetricsFutureBookings(null);
    setProximoAgendamento(null);
  }, []);

  const loadOverview = useCallback(async (
    id = negocioId,
    refDateISO = hoje,
    selectedDateISO = faturamentoData || hoje,
    mes = faturamentoMes,
    profId = parceiroProfissionalId,
    options = {}
  ) => {
    if (!id || !refDateISO || !selectedDateISO) return;
    const silent = !!options?.silent;

    try {
      if (!silent) setOverviewLoading(true);
      const overview = await fetchDashboardOverview({
        negocioId: id,
        refDateISO: String(refDateISO),
        faturamentoDateISO: String(selectedDateISO),
        periodo: normalizeMonth(mes, refDateISO || hoje),
        profissionalId: profId,
      });
      setMetricsHoje(overview.metricsHoje);
      setMetricsTopCards(overview.metricsTopCards);
      setMetricsDia(overview.metricsDia);
      setMetricsPeriodoData(overview.metricsPeriodoData);
      setMetricsUtilizacao(overview.metricsUtilizacao);
      setMetricsFutureBookings(overview.metricsFutureBookings);
      setProximoAgendamento(overview.proximoAgendamento);
    } catch {
      clearOverview();
    } finally {
      if (!silent) setOverviewLoading(false);
    }
  }, [
    clearOverview,
    faturamentoData,
    faturamentoMes,
    hoje,
    negocioId,
    parceiroProfissionalId,
    setOverviewLoading,
  ]);

  const loadHoje = useCallback((id = negocioId, profId = parceiroProfissionalId, options = {}) => (
    loadOverview(id, hoje, faturamentoData || hoje, faturamentoMes, profId, options)
  ), [faturamentoData, faturamentoMes, hoje, loadOverview, negocioId, parceiroProfissionalId]);

  const loadDia = useCallback((id = negocioId, dateISO = faturamentoData || hoje, profId = parceiroProfissionalId, options = {}) => (
    loadOverview(id, hoje, dateISO, faturamentoMes, profId, options)
  ), [faturamentoData, faturamentoMes, hoje, loadOverview, negocioId, parceiroProfissionalId]);

  const loadMes = useCallback((id = negocioId, refDateISO = hoje, mes = faturamentoMes, profId = parceiroProfissionalId, options = {}) => (
    loadOverview(id, refDateISO, faturamentoData || refDateISO, mes, profId, options)
  ), [faturamentoData, faturamentoMes, hoje, loadOverview, negocioId, parceiroProfissionalId]);

  useEffect(() => {
    if (!negocioId || !hoje || !faturamentoData) return;
    loadOverview(negocioId, hoje, faturamentoData, faturamentoMes, parceiroProfissionalId);
  }, [negocioId, hoje, faturamentoData, faturamentoMes, parceiroProfissionalId, loadOverview]);

  return {
    metricsHoje,
    metricsTopCards,
    metricsDia,
    metricsPeriodoData,
    metricsUtilizacao,
    metricsFutureBookings,
    proximoAgendamento,
    metricsHojeLoading,
    metricsTopCardsLoading,
    metricsDiaLoading,
    metricsPeriodoLoading,
    metricsUtilizacaoLoading,
    metricsFutureBookingsLoading,
    proximoAgendamentoLoading,
    loadOverview,
    loadHoje,
    loadDia,
    loadMes,
  };
}
