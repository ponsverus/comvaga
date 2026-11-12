import { useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../supabase';
import { normalizeStatus } from '../utils';

export function useDashboardRealtime({
  activeTab,
  faturamentoData,
  faturamentoMes,
  hoje,
  negocio,
  parceiroProfissionalId,
  agendamentos,
  profissionais,
  reloadAgendamentos,
  loadOverview,
  setNotifAgendamentos,
}) {
  const reloadAgendamentosRef = useRef(reloadAgendamentos);
  useEffect(() => { reloadAgendamentosRef.current = reloadAgendamentos; }, [reloadAgendamentos]);

  const loadOverviewRef = useRef(loadOverview);
  useEffect(() => { loadOverviewRef.current = loadOverview; }, [loadOverview]);

  const realtimeRefreshTimerRef = useRef(null);
  const realtimeDashboardContextRef = useRef({
    activeTab,
    faturamentoData,
    faturamentoMes,
    hoje,
    negocioId: negocio?.id || null,
    parceiroProfissionalId,
  });
  useEffect(() => {
    realtimeDashboardContextRef.current = {
      activeTab,
      faturamentoData,
      faturamentoMes,
      hoje,
      negocioId: negocio?.id || null,
      parceiroProfissionalId,
    };
  }, [activeTab, faturamentoData, faturamentoMes, hoje, negocio?.id, parceiroProfissionalId]);

  const agendamentosStatusRef = useRef(new Map());
  useEffect(() => {
    agendamentosStatusRef.current = new Map(
      agendamentos
        .filter((ag) => ag?.id)
        .map((ag) => [ag.id, normalizeStatus(ag.status)])
    );
  }, [agendamentos]);

  const agProfIdsKey = useMemo(() => profissionais.map(p => p.id).sort().join(','), [profissionais]);

  const subscribeRealtime = useCallback(() => {
    if (!negocio?.id || !agProfIdsKey || !hoje) return;
    const scheduleDashboardRefresh = () => {
      if (realtimeRefreshTimerRef.current) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
      }

      realtimeRefreshTimerRef.current = window.setTimeout(() => {
        const ctx = realtimeDashboardContextRef.current;
        if (!ctx.negocioId || !ctx.hoje) return;

        Promise.resolve(reloadAgendamentosRef.current()).catch(() => {});
        Promise.resolve(loadOverviewRef.current(
          ctx.negocioId,
          ctx.hoje,
          ctx.faturamentoData || ctx.hoje,
          ctx.faturamentoMes,
          ctx.parceiroProfissionalId,
          { silent: true }
        )).catch(() => {});

        realtimeRefreshTimerRef.current = null;
      }, 1200);
    };

    const channelName = parceiroProfissionalId
      ? `agendamentos:${negocio.id}:${parceiroProfissionalId}`
      : `agendamentos:${negocio.id}`;
    const channelFilter = parceiroProfissionalId
      ? `profissional_id=eq.${parceiroProfissionalId}`
      : `negocio_id=eq.${negocio.id}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos', filter: channelFilter }, (payload) => {
        const ev = payload?.eventType;
        const novo = payload?.new;
        if (ev === 'INSERT') {
          if (novo?.id) agendamentosStatusRef.current.set(novo.id, normalizeStatus(novo.status));
          setNotifAgendamentos(prev => prev + 1);
        }
        if (ev === 'UPDATE') {
          if (novo?.id) agendamentosStatusRef.current.set(novo.id, normalizeStatus(novo.status));
        }
        scheduleDashboardRefresh();
      }).subscribe();
    return () => {
      if (realtimeRefreshTimerRef.current) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [negocio?.id, agProfIdsKey, hoje, parceiroProfissionalId, setNotifAgendamentos]);

  return { subscribeRealtime };
}
