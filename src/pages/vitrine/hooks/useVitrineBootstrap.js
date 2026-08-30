import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchBusinessBookingAvailability,
  fetchOfficialDate,
  fetchVitrineDepoimentos,
  fetchVitrineEntregasFirstPages,
  fetchVitrineEntregasPage,
  fetchVitrineGaleria,
  fetchVitrineNegocioBySlug,
  fetchVitrineProfissionais,
} from '../api/vitrineApi';
import { getRequestErrorKey } from '../../../utils/requestError';
import { flattenEntregaPages } from '../../../utils/entregas';

const EMPTY_NOW = { ts: null, dow: 0, date: '', source: 'db', minutes: 0 };
const GALERIA_PAGE_SIZE = 12;
const DEPOIMENTOS_PAGE_SIZE = 12;
const ENTREGAS_PAGE_SIZE = 6;

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

export function useVitrineBootstrap({ slug, rpcSequence, getMsg, authUserId = null }) {
  const [negocio, setNegocio] = useState(null);
  const [profissionais, setProfissionais] = useState([]);
  const [entregaPagesByProf, setEntregaPagesByProf] = useState({});
  const entregas = useMemo(() => flattenEntregaPages(entregaPagesByProf), [entregaPagesByProf]);
  const [depoimentos, setDepoimentos] = useState([]);
  const [depoimentosHasMore, setDepoimentosHasMore] = useState(false);
  const [depoimentosLoadingMore, setDepoimentosLoadingMore] = useState(false);
  const [galeriaItems, setGaleriaItems] = useState([]);
  const [galeriaHasMore, setGaleriaHasMore] = useState(false);
  const [galeriaLoadingMore, setGaleriaLoadingMore] = useState(false);
  const [billingStatus, setBillingStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [serverNow, setServerNow] = useState(EMPTY_NOW);
  const loadRunRef = useRef(0);

  const fetchNowFromDb = useCallback(async () => {
    const payload = await fetchOfficialDate(rpcSequence);
    setServerNow(payload);
    return payload;
  }, [rpcSequence]);

  const loadEntregasPage = useCallback(async (profissionalId, page = 0, { force = false } = {}) => {
    if (!profissionalId) return [];
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
      const { rows, totalCount } = await fetchVitrineEntregasPage(profissionalId, {
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
  }, [entregaPagesByProf]);

  const refreshDepoimentos = useCallback(async (negocioId) => {
    const deps = await fetchVitrineDepoimentos(negocioId, { limit: DEPOIMENTOS_PAGE_SIZE + 1, offset: 0 });
    const visibleRows = deps.slice(0, DEPOIMENTOS_PAGE_SIZE);
    setDepoimentos(visibleRows);
    setDepoimentosHasMore(deps.length > DEPOIMENTOS_PAGE_SIZE);
    return visibleRows;
  }, []);

  const applyDepoimentosPage = useCallback((rows, mode = 'replace') => {
    const safeRows = rows || [];
    const visibleRows = safeRows.slice(0, DEPOIMENTOS_PAGE_SIZE);
    setDepoimentosHasMore(safeRows.length > DEPOIMENTOS_PAGE_SIZE);

    if (mode === 'append') {
      setDepoimentos((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        return [...current, ...visibleRows.filter((item) => !existingIds.has(item.id))];
      });
      return;
    }

    setDepoimentos(visibleRows);
  }, []);

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

  const applyEntregaFirstPages = useCallback((rows, profissionalIds) => {
    setEntregaPagesByProf((current) => buildEntregaPagesByProf(rows, profissionalIds, current));
  }, []);

  const loadMoreGaleria = useCallback(async () => {
    if (!negocio?.id || galeriaLoadingMore || !galeriaHasMore) return;

    try {
      setGaleriaLoadingMore(true);
      const rows = await fetchVitrineGaleria(negocio.id, {
        limit: GALERIA_PAGE_SIZE + 1,
        offset: galeriaItems.length,
      });
      applyGaleriaPage(rows, 'append');
    } finally {
      setGaleriaLoadingMore(false);
    }
  }, [applyGaleriaPage, galeriaHasMore, galeriaItems.length, galeriaLoadingMore, negocio?.id]);

  const loadMoreDepoimentos = useCallback(async () => {
    if (!negocio?.id || depoimentosLoadingMore || !depoimentosHasMore) return;

    try {
      setDepoimentosLoadingMore(true);
      const rows = await fetchVitrineDepoimentos(negocio.id, {
        limit: DEPOIMENTOS_PAGE_SIZE + 1,
        offset: depoimentos.length,
      });
      applyDepoimentosPage(rows, 'append');
      return rows.slice(0, DEPOIMENTOS_PAGE_SIZE).length > 0;
    } finally {
      setDepoimentosLoadingMore(false);
    }
  }, [applyDepoimentosPage, depoimentos.length, depoimentosHasMore, depoimentosLoadingMore, negocio?.id]);

  const loadVitrine = useCallback(async () => {
    const runId = loadRunRef.current + 1;
    loadRunRef.current = runId;
    setLoading(true);
    setError(null);

    const watchdog = setTimeout(() => {
      if (loadRunRef.current !== runId) return;
      setLoading(false);
      setError(getMsg('load_timeout', 'Demorou demais para carregar. Tente novamente.'));
    }, 12000);

    try {
      fetchNowFromDb().catch(() => null);

      const negocioData = await fetchVitrineNegocioBySlug(slug);
      if (loadRunRef.current !== runId) return;
      if (!negocioData) {
        setNegocio(null);
        setProfissionais([]);
        setEntregaPagesByProf({});
        setDepoimentos([]);
        setDepoimentosHasMore(false);
        setDepoimentosLoadingMore(false);
        setGaleriaItems([]);
        setGaleriaHasMore(false);
        setGaleriaLoadingMore(false);
        setBillingStatus(null);
        return;
      }

      setNegocio(negocioData);
      if (authUserId) {
        fetchBusinessBookingAvailability(negocioData.id)
          .then((status) => {
            if (loadRunRef.current === runId) setBillingStatus(status);
          })
          .catch(() => {
            if (loadRunRef.current === runId) setBillingStatus(null);
          });
      } else {
        setBillingStatus(null);
      }

      const profs = await fetchVitrineProfissionais(negocioData.id);
      if (loadRunRef.current !== runId) return;
      setProfissionais(profs);

      const profissionalIds = profs.map((p) => p.id).filter(Boolean);
      const [entregaRows, galeriaData, deps] = await Promise.all([
        fetchVitrineEntregasFirstPages(negocioData.id, profissionalIds, {
          limit: ENTREGAS_PAGE_SIZE,
        }),
        fetchVitrineGaleria(negocioData.id, { limit: GALERIA_PAGE_SIZE + 1, offset: 0 }),
        fetchVitrineDepoimentos(negocioData.id, { limit: DEPOIMENTOS_PAGE_SIZE + 1, offset: 0 }),
      ]);
      if (loadRunRef.current !== runId) return;

      applyEntregaFirstPages(entregaRows, profissionalIds);
      applyGaleriaPage(galeriaData);
      applyDepoimentosPage(deps);
    } catch (e) {
      if (loadRunRef.current !== runId) return;
      const requestKey = getRequestErrorKey(e);
      if (requestKey === 'alerts.request_timeout') {
        setError(getMsg('load_timeout', 'Demorou demais para carregar. Tente novamente.'));
      } else {
        console.error('Vitrine load error:', e);
        setError(getMsg('load_error', 'Erro ao carregar a vitrine.'));
      }
      setNegocio(null);
      setProfissionais([]);
      setEntregaPagesByProf({});
      setDepoimentos([]);
      setDepoimentosHasMore(false);
      setDepoimentosLoadingMore(false);
      setGaleriaItems([]);
      setGaleriaHasMore(false);
      setGaleriaLoadingMore(false);
      setBillingStatus(null);
    } finally {
      clearTimeout(watchdog);
      if (loadRunRef.current === runId) {
        setLoading(false);
      }
    }
  }, [applyDepoimentosPage, applyEntregaFirstPages, applyGaleriaPage, authUserId, fetchNowFromDb, getMsg, slug]);

  useEffect(() => {
    loadVitrine();
  }, [loadVitrine]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNowFromDb().catch(() => {});
      }
    }, 300000);
    return () => clearInterval(timer);
  }, [fetchNowFromDb]);

  return {
    negocio,
    profissionais,
    entregas,
    entregaPagesByProf,
    depoimentos,
    depoimentosHasMore,
    depoimentosLoadingMore,
    galeriaItems,
    galeriaHasMore,
    galeriaLoadingMore,
    billingStatus,
    loading,
    error,
    serverNow,
    fetchNowFromDb,
    refreshDepoimentos,
    loadMoreDepoimentos,
    loadMoreGaleria,
    loadEntregasPage,
    loadVitrine,
  };
}
