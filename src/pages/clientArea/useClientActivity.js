import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../supabase';
import { isRateLimitError } from '../../utils/errorUtils';
import { getRequestErrorKey } from '../../utils/requestError';
import {
  cancelarAgendamentoCliente,
  createBookingReview,
  fetchAgendamentosCliente,
  fetchFavoritosCliente,
  fetchReviewedBookings,
  removerFavoritoCliente,
} from './api/clientAreaApi';
import { PAGE_SIZE, mergeById, sortByDateThenTimeDesc } from './utils';

export function useClientActivity({ clienteId, uiAlert, uiConfirm, feedback, navigate }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [favoritos, setFavoritos] = useState([]);
  const [agendamentosPage, setAgendamentosPage] = useState(0);
  const [favoritosPage, setFavoritosPage] = useState(0);
  const [agendamentosHasMore, setAgendamentosHasMore] = useState(false);
  const [favoritosHasMore, setFavoritosHasMore] = useState(false);
  const [agendamentosLoadingMore, setAgendamentosLoadingMore] = useState(false);
  const [favoritosLoadingMore, setFavoritosLoadingMore] = useState(false);
  const [removingFavoritoId, setRemovingFavoritoId] = useState(null);
  const removingFavoritoRef = useRef(false);
  const [avaliacoesPorAgendamento, setAvaliacoesPorAgendamento] = useState({});
  const [depoimentoLoading, setDepoimentoLoading] = useState(false);
  const [depoimentoAlvo, setDepoimentoAlvo] = useState(null);
  const [depoimentoNota, setDepoimentoNota] = useState(0);
  const [depoimentoTexto, setDepoimentoTexto] = useState('');

  const getVisiblePageRows = useCallback((rows, limit = PAGE_SIZE) => (rows || []).slice(0, limit), []);
  const getHasMoreRows = useCallback((rows, limit = PAGE_SIZE) => (rows || []).length > limit, []);

  const fetchAgendamentos = useCallback(async ({ cursor = null, limit = PAGE_SIZE, clienteId: clienteIdParam = clienteId } = {}) => {
    const data = await fetchAgendamentosCliente({
      clienteId: clienteIdParam,
      limit,
      cursor,
    });
    return (data || []).map(a => ({
      ...a,
      preco_final:  a.preco_final ?? null,
      data:         String(a.data || ''),
      hora_inicio:  a.horario_inicio ? String(a.horario_inicio).slice(0, 5) : '',
      hora_fim:     a.horario_fim    ? String(a.horario_fim).slice(0, 5)    : '',
      entregas: {
        nome:              a.entrega_nome,
        preco:             a.entrega_preco,
        preco_promocional: a.entrega_promo,
      },
      profissionais: {
        nome:    a.profissional_nome,
        negocios: {
          nome:         a.negocio_nome,
          slug:         a.negocio_slug,
          logo_path:    a.negocio_logo_path,
          tipo_negocio: a.negocio_tipo,
        },
      },
    }));
  }, [clienteId]);

  const fetchFavoritos = useCallback(async ({ cursor = null, limit = PAGE_SIZE, clienteId: clienteIdParam = clienteId } = {}) => {
    const data = await fetchFavoritosCliente({
      clienteId: clienteIdParam,
      limit,
      cursor,
    });
    return (data || []).map(f => ({
      ...f,
      negocios: f.tipo === 'negocio' && f.negocio_nome
        ? { nome: f.negocio_nome, slug: f.negocio_slug, logo_path: f.negocio_logo_path, tipo_negocio: f.negocio_tipo }
        : null,
      profissionais: f.tipo === 'profissional' && f.profissional_nome
        ? { nome: f.profissional_nome, negocios: f.profissional_negocio_slug ? { slug: f.profissional_negocio_slug } : null }
        : null,
    }));
  }, [clienteId]);

  const syncAvaliacoesConcluidas = useCallback(async (agendamentosRows) => {
    const concluidosIds = (agendamentosRows || [])
      .filter((item) => String(item?.status || '') === 'concluido')
      .map((item) => item?.id)
      .filter(Boolean);

    if (!concluidosIds.length) {
      setAvaliacoesPorAgendamento({});
      return;
    }

    const reviews = await fetchReviewedBookings(concluidosIds);
    const nextMap = {};
    for (const review of reviews) {
      if (!review?.agendamento_id) continue;
      nextMap[review.agendamento_id] = review.id;
    }
    setAvaliacoesPorAgendamento(nextMap);
  }, []);

  const applyInitialRows = useCallback(async (agendamentosRows, favoritosRows) => {
    const visibleAgendamentos = getVisiblePageRows(agendamentosRows);
    const visibleFavoritos = getVisiblePageRows(favoritosRows);
    setAgendamentos(visibleAgendamentos);
    setFavoritos(visibleFavoritos);
    await syncAvaliacoesConcluidas(visibleAgendamentos);
    setAgendamentosPage(0);
    setFavoritosPage(0);
    setAgendamentosHasMore(getHasMoreRows(agendamentosRows));
    setFavoritosHasMore(getHasMoreRows(favoritosRows));
  }, [getHasMoreRows, getVisiblePageRows, syncAvaliacoesConcluidas]);

  const clearActivity = useCallback(() => {
    setAgendamentos([]);
    setFavoritos([]);
    setAgendamentosPage(0);
    setFavoritosPage(0);
    setAgendamentosHasMore(false);
    setFavoritosHasMore(false);
    setAvaliacoesPorAgendamento({});
  }, []);

  const fetchAgendamentosRef = useRef(fetchAgendamentos);
  useEffect(() => { fetchAgendamentosRef.current = fetchAgendamentos; }, [fetchAgendamentos]);

  const agendamentosPageRef = useRef(agendamentosPage);
  useEffect(() => { agendamentosPageRef.current = agendamentosPage; }, [agendamentosPage]);

  const realtimeRefreshTimerRef = useRef(null);

  const subscribeRealtime = useCallback(() => {
    if (!clienteId) return undefined;
    const scheduleRefresh = () => {
      if (realtimeRefreshTimerRef.current) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
      }

      realtimeRefreshTimerRef.current = window.setTimeout(async () => {
        try {
          const limit = (agendamentosPageRef.current + 1) * PAGE_SIZE;
          const rows = await fetchAgendamentosRef.current({ limit: limit + 1 });
          const visibleRows = getVisiblePageRows(rows, limit);
          setAgendamentos(visibleRows);
          await syncAvaliacoesConcluidas(visibleRows);
          setAgendamentosHasMore(getHasMoreRows(rows, limit));
        } catch (error) {
          console.warn('Falha ao atualizar agendamentos em tempo real.', error);
        } finally {
          realtimeRefreshTimerRef.current = null;
        }
      }, 1200);
    };

    const channel = supabase
      .channel(`agendamentos_cliente:${clienteId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agendamentos', filter: `cliente_id=eq.${clienteId}` },
        scheduleRefresh
      )
      .subscribe();
    return () => {
      if (realtimeRefreshTimerRef.current) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [clienteId, getHasMoreRows, getVisiblePageRows, syncAvaliacoesConcluidas]);

  const cancelarAgendamento = async (agendamentoId) => {
    const ok = await uiConfirm('clientArea.booking_cancel_confirm', 'warning');
    if (!ok) return;
    try {
      await cancelarAgendamentoCliente(agendamentoId);
      uiAlert('clientArea.booking_canceled', 'danger');
      const limit = (agendamentosPage + 1) * PAGE_SIZE;
      const rows = await fetchAgendamentos({ limit: limit + 1 });
      const visibleRows = getVisiblePageRows(rows, limit);
      setAgendamentos(visibleRows);
      await syncAvaliacoesConcluidas(visibleRows);
      setAgendamentosHasMore(getHasMoreRows(rows, limit));
    } catch (error) {
      const requestKey = getRequestErrorKey(error);
      if (requestKey) {
        await uiAlert(requestKey, 'warning');
        return;
      }
      uiAlert('clientArea.booking_cancel_error', 'error');
    }
  };

  const marcarNovamente = (agendamento) => {
    const slug = String(agendamento?.negocio_slug || '').trim();
    const profissionalId = agendamento?.profissional_id || null;
    const entregaId = agendamento?.entrega_id || null;
    if (!slug || !profissionalId || !entregaId) {
      uiAlert('clientArea.rebook_unavailable', 'warning');
      return;
    }
    navigate(`/v/${slug}`, {
      state: {
        rebook: {
          profissionalId,
          entregaId,
        },
      },
    });
  };

  const abrirDepoimento = (agendamento) => {
    const jaAberto = depoimentoAlvo?.id === agendamento?.id;
    setDepoimentoAlvo(jaAberto ? null : agendamento);
    setDepoimentoNota(0);
    setDepoimentoTexto('');
  };

  const enviarDepoimentoAgendamento = async () => {
    if (!depoimentoAlvo?.id) return;
    if (!Number.isInteger(depoimentoNota) || depoimentoNota < 1 || depoimentoNota > 5) return;
    try {
      setDepoimentoLoading(true);
      await createBookingReview({
        agendamentoId: depoimentoAlvo.id,
        nota: depoimentoNota,
        comentario: depoimentoTexto,
      });
      setAvaliacoesPorAgendamento((prev) => ({
        ...prev,
        [depoimentoAlvo.id]: true,
      }));
      setDepoimentoAlvo(null);
      setDepoimentoTexto('');
      setDepoimentoNota(0);
      feedback.showMessage('vitrine.depoimento_sent', { variant: 'success' });
    } catch (e) {
      const requestKey = getRequestErrorKey(e);
      if (requestKey === 'alerts.rate_limit_exceeded' || isRateLimitError(e)) {
        feedback.showMessage('clientArea.depoimento_rate_limit', { variant: 'warning' });
        return;
      }
      if (requestKey === 'alerts.request_timeout') {
        feedback.showMessage('alerts.request_timeout', { variant: 'warning' });
        return;
      }
      console.error('Client review send error:', e);
      feedback.showMessage('clientArea.depoimento_send_error');
    } finally {
      setDepoimentoLoading(false);
    }
  };

  const removerFavorito = async (favoritoId) => {
    if (!clienteId || removingFavoritoRef.current) return;
    try {
      removingFavoritoRef.current = true;
      setRemovingFavoritoId(favoritoId);
      await removerFavoritoCliente({ favoritoId, clienteId });
      setFavoritos(prev => prev.filter(f => f.id !== favoritoId));
      uiAlert('clientArea.favorite_removed', 'success');
    } catch {
      uiAlert('clientArea.favorite_remove_error', 'error');
    } finally {
      removingFavoritoRef.current = false;
      setRemovingFavoritoId(null);
    }
  };

  const carregarMaisAgendamentos = async () => {
    if (agendamentosLoadingMore || !agendamentosHasMore) return;
    try {
      setAgendamentosLoadingMore(true);
      const nextPage = agendamentosPage + 1;
      const cursor = agendamentos.length ? agendamentos[agendamentos.length - 1] : null;
      const rows = await fetchAgendamentos({ cursor, limit: PAGE_SIZE + 1 });
      const visibleRows = getVisiblePageRows(rows);
      const merged = mergeById(agendamentos, visibleRows);
      setAgendamentos(merged);
      await syncAvaliacoesConcluidas(merged);
      setAgendamentosPage(nextPage);
      setAgendamentosHasMore(getHasMoreRows(rows));
    } catch {
      uiAlert('clientArea.load_more_agendamentos_error', 'warning');
    } finally {
      setAgendamentosLoadingMore(false);
    }
  };

  const carregarMaisFavoritos = async () => {
    if (favoritosLoadingMore || !favoritosHasMore) return;
    try {
      setFavoritosLoadingMore(true);
      const nextPage = favoritosPage + 1;
      const cursor = favoritos.length ? favoritos[favoritos.length - 1] : null;
      const rows = await fetchFavoritos({ cursor, limit: PAGE_SIZE + 1 });
      setFavoritos(prev => mergeById(prev, getVisiblePageRows(rows)));
      setFavoritosPage(nextPage);
      setFavoritosHasMore(getHasMoreRows(rows));
    } catch {
      uiAlert('clientArea.load_more_favoritos_error', 'warning');
    } finally {
      setFavoritosLoadingMore(false);
    }
  };

  const agendamentosPorStatus = useMemo(() => {
    const abertos = [], cancelados = [], concluidos = [];
    for (const a of (agendamentos || [])) {
      const st = String(a?.status || '');
      if (st === 'concluido')            concluidos.push(a);
      else if (st.includes('cancelado')) cancelados.push(a);
      else                               abertos.push(a);
    }
    return {
      abertos:    sortByDateThenTimeDesc(abertos),
      cancelados: sortByDateThenTimeDesc(cancelados),
      concluidos: sortByDateThenTimeDesc(concluidos),
    };
  }, [agendamentos]);

  return {
    agendamentos,
    favoritos,
    agendamentosHasMore,
    favoritosHasMore,
    agendamentosLoadingMore,
    favoritosLoadingMore,
    removingFavoritoId,
    avaliacoesPorAgendamento,
    depoimentoLoading,
    depoimentoAlvo,
    depoimentoNota,
    setDepoimentoNota,
    depoimentoTexto,
    setDepoimentoTexto,
    agendamentosPorStatus,
    fetchAgendamentos,
    fetchFavoritos,
    applyInitialRows,
    clearActivity,
    subscribeRealtime,
    cancelarAgendamento,
    marcarNovamente,
    abrirDepoimento,
    enviarDepoimentoAgendamento,
    removerFavorito,
    carregarMaisAgendamentos,
    carregarMaisFavoritos,
  };
}
