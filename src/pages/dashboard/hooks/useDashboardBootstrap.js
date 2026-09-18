import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchAgendamentosNegocio,
  fetchEntregasFirstPages,
  fetchEntregasPage,
  fetchGaleria,
  fetchNegocioById,
  fetchOfficialDate,
  fetchOwnerBusinessCount,
  fetchOwnerNegocio,
  fetchPartnerNegocioIds,
  fetchProfissionaisComStatus,
} from '../api/dashboardApi';
import { getRequestErrorKey } from '../../../utils/requestError';
import { isAuthSessionError, refreshCurrentSession, signOutLocalSession } from '../../../utils/authSession';
import { flattenEntregaPages } from '../../../utils/entregas';
import { ptBR } from '../../../feedback/messages/ptBR';

const AGENDAMENTOS_PAGE_SIZE = 50;
const GALERIA_PAGE_SIZE = 12;
const ENTREGAS_PAGE_SIZE = 6;
const PARTNER_DASHBOARD_ACCESS_ERROR = {
  type: 'partner_dashboard_access_inactive',
  title: ptBR.dashboard.partner_dashboard_access_inactive.title,
  body: ptBR.dashboard.partner_dashboard_access_inactive.body,
  primaryLabel: ptBR.dashboard.partner_dashboard_access_inactive.buttonText,
  primaryAction: 'partner-business-center',
};

function buildEntregaPagesByProf(rows, profissionalIds, current = {}) {
  const next = {};
  const grouped = new Map();

  for (const row of rows || []) {
    if (!row?.profissional_id) continue;
    if (!grouped.has(row.profissional_id)) grouped.set(row.profissional_id, []);
    grouped.get(row.profissional_id).push(row);
  }

  for (const profissionalId of profissionalIds || []) {
    const previous = current[profissionalId] || { pages: {}, totalCount: 0, version: 0 };
    const pageRows = grouped.get(profissionalId) || [];
    next[profissionalId] = {
      pages: {
        0: pageRows.map((row) => {
          const normalized = { ...row };
          delete normalized.total_count;
          return normalized;
        }),
      },
      totalCount: Number(pageRows[0]?.total_count || 0),
      loadingPage: null,
      version: previous.version + 1,
    };
  }

  return next;
}

function getLastPartnerNegocioId(userId) {
  if (!userId) return null;
  try {
    return window.localStorage?.getItem(`comvaga:last-partner-negocio:${userId}`) || null;
  } catch {
    return null;
  }
}

function clearLastPartnerNegocioId(userId) {
  if (!userId) return;
  try {
    window.localStorage?.removeItem(`comvaga:last-partner-negocio:${userId}`);
  } catch {
    return;
  }
}

function isValidPartnerNegocioId(negocioId, negocioIds) {
  return !!negocioId && negocioIds.includes(negocioId);
}

function isActivePartnerProfessional(profissional) {
  return String(profissional?.status || '').toLowerCase() === 'ativo';
}

export function useDashboardBootstrap({
  userId,
  professionalRole,
  locationNegocioId,
  navigate,
  rpcSequence,
  uiAlert,
}) {
  const [parceiroProfissional, setParceiroProfissional] = useState(null);
  const [negocio, setNegocio] = useState(null);
  const [profissionais, setProfissionais] = useState([]);
  const [entregaPagesByProf, setEntregaPagesByProf] = useState({});
  const entregas = useMemo(() => flattenEntregaPages(entregaPagesByProf), [entregaPagesByProf]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [agendamentosHasMore, setAgendamentosHasMore] = useState(false);
  const [agendamentosLoadingMore, setAgendamentosLoadingMore] = useState(false);
  const [galeriaItems, setGaleriaItems] = useState([]);
  const [galeriaHasMore, setGaleriaHasMore] = useState(false);
  const [galeriaLoadingMore, setGaleriaLoadingMore] = useState(false);
  const [ownerBusinessCount, setOwnerBusinessCount] = useState(0);
  const [bootstrapState, setBootstrapState] = useState('loading');
  const [error, setError] = useState(null);
  const [serverNow, setServerNow] = useState(() => ({ ts: null, dow: 0, date: '', source: 'db', minutes: 0 }));
  const [hoje, setHoje] = useState('');

  const hojeRef = useRef('');
  const loadDataRunRef = useRef(0);

  const handleAuthSessionLost = useCallback(async () => {
    await signOutLocalSession();
    setError('Sessao expirada. Faca login novamente.');
    setBootstrapState('error');
    navigate('/login', { replace: true });
  }, [navigate]);

  const fetchNowFromDb = useCallback(async () => {
    await refreshCurrentSession();
    const payload = await fetchOfficialDate(rpcSequence);
    const date = String(payload.date || '');
    hojeRef.current = date;
    setServerNow(payload);
    setHoje(date);
    return date;
  }, [rpcSequence]);

  const reloadNegocio = useCallback(async (negocioId) => {
    const id = negocioId || negocio?.id;
    if (!id) return null;
    const data = await fetchNegocioById(id);
    if (!data) return null;
    setNegocio(data);
    return data;
  }, [negocio?.id]);

  const scopeProfissionais = useCallback((allProfissionais, negocioOwnerId) => {
    const ownerContext = negocioOwnerId === userId;
    const scoped = ownerContext
      ? allProfissionais
      : allProfissionais.filter((item) => item.user_id === userId && isActivePartnerProfessional(item));
    return {
      scoped,
      parceiro: ownerContext ? null : (scoped[0] || null),
    };
  }, [userId]);

  const reloadProfissionais = useCallback(async (negocioId, negocioOwnerId = negocio?.owner_id) => {
    const id = negocioId || negocio?.id;
    if (!id) return;
    const allProfissionais = await fetchProfissionaisComStatus(id);
    const { scoped, parceiro } = scopeProfissionais(allProfissionais, negocioOwnerId);
    setProfissionais(scoped);
    setParceiroProfissional(parceiro);
    return scoped;
  }, [negocio?.id, negocio?.owner_id, scopeProfissionais]);

  const loadEntregasPage = useCallback(async (profissionalId, page = 0, { force = false } = {}) => {
    const id = negocio?.id;
    if (!id || !profissionalId) return [];
    const pageIndex = Math.max(0, Number(page) || 0);
    const cached = entregaPagesByProf?.[profissionalId]?.pages?.[pageIndex];
    if (cached && !force) return cached;

    setEntregaPagesByProf((current) => ({
      ...current,
      [profissionalId]: {
        ...(current[profissionalId] || { pages: {}, totalCount: 0, version: 0 }),
        loadingPage: pageIndex,
      },
    }));

    try {
      const { rows, totalCount } = await fetchEntregasPage({
        negocioId: id,
        profissionalId,
        limit: ENTREGAS_PAGE_SIZE,
        offset: pageIndex * ENTREGAS_PAGE_SIZE,
      });
      setEntregaPagesByProf((current) => {
        const previous = current[profissionalId] || { pages: {}, totalCount: 0, version: 0 };
        return {
          ...current,
          [profissionalId]: {
            ...previous,
            pages: {
              ...(force ? {} : previous.pages),
              [pageIndex]: rows,
            },
            totalCount: rows.length > 0 || pageIndex === 0 ? totalCount : previous.totalCount,
            loadingPage: null,
            version: force ? previous.version + 1 : previous.version,
          },
        };
      });
      return rows;
    } catch (error) {
      setEntregaPagesByProf((current) => {
        const previous = current[profissionalId] || { pages: {}, totalCount: 0, version: 0 };
        return {
          ...current,
          [profissionalId]: {
            ...previous,
            loadingPage: null,
          },
        };
      });
      throw error;
    }
  }, [entregaPagesByProf, negocio?.id]);

  const reloadEntregas = useCallback(async (negocioId, profissionalIds) => {
    const id = negocioId || negocio?.id;
    const ids = profissionalIds || profissionais.map((item) => item.id);
    if (!id || !ids?.length) {
      setEntregaPagesByProf({});
      return [];
    }
    const rows = await fetchEntregasFirstPages({
      negocioId: id,
      profissionalIds: ids,
      limit: ENTREGAS_PAGE_SIZE,
    });
    setEntregaPagesByProf((current) => {
      const next = { ...current, ...buildEntregaPagesByProf(rows, ids, current) };
      return next;
    });
    return rows.map((row) => {
      const normalized = { ...row };
      delete normalized.total_count;
      return normalized;
    });
  }, [negocio?.id, profissionais]);

  const applyEntregaFirstPages = useCallback((rows, profissionalIds) => {
    setEntregaPagesByProf((current) => {
      const next = buildEntregaPagesByProf(rows, profissionalIds, current);
      return next;
    });
  }, []);

  const reloadAgendamentos = useCallback(async (negocioId, profissionalIds, dataHoje) => {
    const id = negocioId || negocio?.id;
    const ids = profissionalIds || profissionais.map((item) => item.id);
    const dataBase = dataHoje || hojeRef.current;
    if (!id || !ids?.length || !dataBase) return;
    const rows = await fetchAgendamentosNegocio({
      negocioId: id,
      profissionalIds: ids,
      dataInicio: dataBase,
      limit: AGENDAMENTOS_PAGE_SIZE + 1,
      cursor: null,
    });
    const visibleRows = rows.slice(0, AGENDAMENTOS_PAGE_SIZE);
    setAgendamentos(visibleRows);
    setAgendamentosHasMore(rows.length > AGENDAMENTOS_PAGE_SIZE);
    return visibleRows;
  }, [negocio?.id, profissionais]);

  const loadMoreAgendamentos = useCallback(async () => {
    const id = negocio?.id;
    const ids = profissionais.map((item) => item.id);
    const dataBase = hojeRef.current;
    if (agendamentosLoadingMore || !agendamentosHasMore || !id || !ids.length || !dataBase) return;

    try {
      setAgendamentosLoadingMore(true);
      const cursor = agendamentos.length ? agendamentos[agendamentos.length - 1] : null;
      const rows = await fetchAgendamentosNegocio({
        negocioId: id,
        profissionalIds: ids,
        dataInicio: dataBase,
        limit: AGENDAMENTOS_PAGE_SIZE + 1,
        cursor,
      });
      const visibleRows = rows.slice(0, AGENDAMENTOS_PAGE_SIZE);
      setAgendamentos((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        return [...current, ...visibleRows.filter((item) => !existingIds.has(item.id))];
      });
      setAgendamentosHasMore(rows.length > AGENDAMENTOS_PAGE_SIZE);
    } finally {
      setAgendamentosLoadingMore(false);
    }
  }, [agendamentos, agendamentosHasMore, agendamentosLoadingMore, negocio?.id, profissionais]);

  const applyGaleriaPage = useCallback((rows, mode = 'replace') => {
    const safeRows = rows || [];
    const visibleRows = safeRows.slice(0, GALERIA_PAGE_SIZE);
    setGaleriaHasMore(safeRows.length > GALERIA_PAGE_SIZE);

    if (mode === 'append') {
      setGaleriaItems((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        return [...current, ...visibleRows.filter((item) => !existingIds.has(item.id))];
      });
      return;
    }

    setGaleriaItems(visibleRows);
  }, []);

  const reloadGaleria = useCallback(async (negocioId) => {
    const id = negocioId || negocio?.id;
    if (!id) return;
    const { data } = await fetchGaleria(id, { limit: GALERIA_PAGE_SIZE + 1, offset: 0 });
    applyGaleriaPage(data || []);
    return (data || []).slice(0, GALERIA_PAGE_SIZE);
  }, [applyGaleriaPage, negocio?.id]);

  const loadMoreGaleria = useCallback(async () => {
    const id = negocio?.id;
    if (galeriaLoadingMore || !galeriaHasMore || !id) return;

    try {
      setGaleriaLoadingMore(true);
      const { data } = await fetchGaleria(id, {
        limit: GALERIA_PAGE_SIZE + 1,
        offset: galeriaItems.length,
      });
      applyGaleriaPage(data || [], 'append');
    } finally {
      setGaleriaLoadingMore(false);
    }
  }, [applyGaleriaPage, galeriaHasMore, galeriaItems.length, galeriaLoadingMore, negocio?.id]);

  const loadData = useCallback(async (dataRef) => {
    if (!userId) {
      setError('Sessao invalida. Faca login novamente.');
      setBootstrapState('error');
      return;
    }

    const runId = ++loadDataRunRef.current;
    const isCurrentRun = () => loadDataRunRef.current === runId;
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    setBootstrapState('loading');
    setError(null);
    setParceiroProfissional(null);
    setNegocio(null);
    setProfissionais([]);
    setEntregaPagesByProf({});
    setAgendamentos([]);
    setAgendamentosHasMore(false);
    setGaleriaItems([]);
    setGaleriaHasMore(false);
    setGaleriaLoadingMore(false);

    try {
      const totalOwnerBusinesses = await fetchOwnerBusinessCount(userId);
      if (!isCurrentRun()) return;
      setOwnerBusinessCount(totalOwnerBusinesses);

      const resolveNegocioData = async () => {
        if (locationNegocioId) return fetchNegocioById(locationNegocioId);

        if (totalOwnerBusinesses > 0) {
          if (totalOwnerBusinesses > 1) {
            navigate('/selecionar-negocio', { replace: true });
            return '__redirect__';
          }
          return fetchOwnerNegocio(userId);
        }

        const negocioIds = await fetchPartnerNegocioIds(userId);
        const savedNegocioId = getLastPartnerNegocioId(userId);
        const selectedNegocioId = isValidPartnerNegocioId(locationNegocioId, negocioIds)
          ? locationNegocioId
          : isValidPartnerNegocioId(savedNegocioId, negocioIds)
            ? savedNegocioId
            : negocioIds[0];

        if (selectedNegocioId) return fetchNegocioById(selectedNegocioId);
        if (professionalRole === 'partner') {
          clearLastPartnerNegocioId(userId);
          setError(PARTNER_DASHBOARD_ACCESS_ERROR);
          setBootstrapState('error');
          return '__redirect__';
        }
        navigate('/conta-profissional', { replace: true });
        return '__redirect__';
      };

      let negocioData = null;
      for (const delay of [0, 120, 320]) {
        if (delay) await wait(delay);
        negocioData = await resolveNegocioData();
        if (negocioData === '__redirect__') return;
        if (negocioData) break;
      }

      if (!isCurrentRun()) return;
      if (!negocioData) {
        if (professionalRole === 'partner') {
          clearLastPartnerNegocioId(userId);
          setError(PARTNER_DASHBOARD_ACCESS_ERROR);
        } else {
          setError('Nenhum negocio cadastrado.');
        }
        setBootstrapState('error');
        return;
      }

      const allProfissionais = await fetchProfissionaisComStatus(negocioData.id);
      if (!isCurrentRun()) return;

      const { scoped: scopedProfs, parceiro: meuProfissional } = scopeProfissionais(allProfissionais, negocioData.owner_id);
      const souDonoDoNegocio = negocioData.owner_id === userId;
      if (!souDonoDoNegocio && !isActivePartnerProfessional(meuProfissional)) {
        setNegocio(null);
        setParceiroProfissional(null);
        setProfissionais([]);
        setEntregaPagesByProf({});
        setAgendamentos([]);
        setAgendamentosHasMore(false);
        setGaleriaItems([]);
        setGaleriaHasMore(false);
        setGaleriaLoadingMore(false);
        clearLastPartnerNegocioId(userId);
        setError(professionalRole === 'partner' ? PARTNER_DASHBOARD_ACCESS_ERROR : 'VocÃª nÃ£o tem acesso a este negÃ³cio.');
        setBootstrapState('error');
        return;
      }

      setNegocio(negocioData);
      setParceiroProfissional(meuProfissional);
      setProfissionais(scopedProfs);

      const galeriaResult = await fetchGaleria(negocioData.id, { limit: GALERIA_PAGE_SIZE + 1, offset: 0 });
      if (!isCurrentRun()) return;
      if (galeriaResult.error) {
        await uiAlert('dashboard.gallery_load_warning', 'warning');
      }
      applyGaleriaPage(galeriaResult.data || []);

      if (!scopedProfs.length) {
        setEntregaPagesByProf({});
        setAgendamentos([]);
        setAgendamentosHasMore(false);
        setBootstrapState('ready');
        return;
      }

      const ids = scopedProfs.map((item) => item.id);
      const dataHoje = (typeof dataRef === 'string' && dataRef) ? dataRef : hojeRef.current;
      const [entregaRows, agendamentoRows] = await Promise.all([
        fetchEntregasFirstPages({
          negocioId: negocioData.id,
          profissionalIds: ids,
          limit: ENTREGAS_PAGE_SIZE,
        }),
        dataHoje ? fetchAgendamentosNegocio({
          negocioId: negocioData.id,
          profissionalIds: ids,
          dataInicio: dataHoje,
          limit: AGENDAMENTOS_PAGE_SIZE + 1,
          cursor: null,
        }) : Promise.resolve([]),
      ]);

      if (!isCurrentRun()) return;
      applyEntregaFirstPages(entregaRows, ids);
      setAgendamentos(agendamentoRows.slice(0, AGENDAMENTOS_PAGE_SIZE));
      setAgendamentosHasMore(agendamentoRows.length > AGENDAMENTOS_PAGE_SIZE);
      setBootstrapState('ready');
    } catch (e) {
      if (!isCurrentRun()) return;
      if (isAuthSessionError(e)) {
        await handleAuthSessionLost();
        return;
      }

      const requestKey = getRequestErrorKey(e);
      if (requestKey === 'alerts.request_timeout') {
        setError('O carregamento do dashboard demorou demais. Tente novamente em instantes.');
        uiAlert(requestKey, 'warning');
      } else if (requestKey === 'alerts.rate_limit_exceeded') {
        setError('Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.');
        uiAlert(requestKey, 'warning');
      } else {
        console.error('Dashboard bootstrap error:', e);
        setError('Erro inesperado.');
      }
      setBootstrapState('error');
    }
  }, [applyEntregaFirstPages, applyGaleriaPage, handleAuthSessionLost, locationNegocioId, navigate, professionalRole, scopeProfissionais, uiAlert, userId]);

  const reloadFull = useCallback(async () => {
    try {
      const data = await fetchNowFromDb();
      await loadData(data);
    } catch (error) {
      if (isAuthSessionError(error)) {
        await handleAuthSessionLost();
        return;
      }
      await loadData('');
    }
  }, [fetchNowFromDb, handleAuthSessionLost, loadData]);

  useEffect(() => {
    let active = true;
    if (!userId) return () => { active = false; };

    (async () => {
      try {
        const data = await fetchNowFromDb();
        if (active) await loadData(data);
      } catch (error) {
        if (!active) return;
        if (isAuthSessionError(error)) {
          await handleAuthSessionLost();
          return;
        }
        await loadData('');
      }
    })();

    return () => {
      active = false;
    };
  }, [userId, fetchNowFromDb, handleAuthSessionLost, loadData]);

  return {
    parceiroProfissional,
    setParceiroProfissional,
    negocio,
    setNegocio,
    profissionais,
    setProfissionais,
    entregas,
    entregaPagesByProf,
    agendamentos,
    setAgendamentos,
    agendamentosHasMore,
    agendamentosLoadingMore,
    galeriaItems,
    setGaleriaItems,
    galeriaHasMore,
    galeriaLoadingMore,
    ownerBusinessCount,
    bootstrapState,
    error,
    serverNow,
    setServerNow,
    hoje,
    setHoje,
    fetchNowFromDb,
    reloadNegocio,
    reloadProfissionais,
    reloadEntregas,
    loadEntregasPage,
    reloadAgendamentos,
    loadMoreAgendamentos,
    loadMoreGaleria,
    reloadGaleria,
    loadData,
    reloadFull,
  };
}
