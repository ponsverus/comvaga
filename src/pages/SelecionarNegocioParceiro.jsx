import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LogOut, RefreshCw, Send } from 'lucide-react';
import { ProfessionalIcon, SearchIcon, UserIcon } from '../components/icons';
import { ptBR } from '../feedback/messages/ptBR';
import { supabase } from '../supabase';
import { withAuthRetry } from '../utils/authSession';

const msgs = ptBR.partnerBusinessCenter;

function getPublicUrl(bucket, path) {
  if (!bucket || !path) return null;
  try {
    const stripped = path.replace(new RegExp(`^${bucket}/`), '');
    const { data } = supabase.storage.from(bucket).getPublicUrl(stripped);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

function formatBusinessAddress(negocio) {
  const rua = String(negocio?.endereco_rua || '').trim();
  const numero = String(negocio?.endereco_numero || '').trim();
  const bairro = String(negocio?.endereco_bairro || '').trim();
  const cidade = String(negocio?.endereco_cidade || '').trim();
  const estado = String(negocio?.endereco_estado || '').trim().toUpperCase();

  return [
    rua && numero ? `${rua}, ${numero}` : rua,
    bairro,
    estado || (!bairro ? cidade : ''),
  ].filter(Boolean).join(' - ');
}

function normalizeTag(row) {
  const status = String(row?.status || '').toLowerCase();
  if (status === 'ativo') return 'ATIVO';
  if (status === 'pendente') return 'AGUARDANDO';
  if (status === 'excluido') return 'EXCLUÍDO';
  if (status === 'inativo') return 'INATIVO';
  return row?.tag === 'DISPONIVEL' ? 'DISPONÍVEL' : String(row?.tag || 'DISPONÍVEL');
}

function tagClass(row) {
  const tag = normalizeTag(row);
  if (tag === 'ATIVO') return 'border-green-500/30 bg-green-500/10 text-green-300';
  if (tag === 'AGUARDANDO') return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300';
  if (tag === 'EXCLUÍDO') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (tag === 'INATIVO') return 'border-gray-500/30 bg-gray-500/10 text-gray-300';
  return 'border-primary/30 bg-primary/10 text-primary';
}

function BusinessAvatar({ negocio }) {
  const logoUrl = getPublicUrl('logos', negocio?.logo_path);
  return (
    <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-700 bg-dark-200 shrink-0 flex items-center justify-center">
      {logoUrl ? (
        <img src={logoUrl} alt={negocio?.nome || 'Negócio'} className="w-full h-full rounded-full object-cover" />
      ) : (
        <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-yellow-600 flex items-center justify-center">
          <ProfessionalIcon className="w-6 h-6 text-black" />
        </div>
      )}
    </div>
  );
}

function BusinessInfo({ negocio }) {
  const endereco = formatBusinessAddress(negocio);
  return (
    <div className="flex-1 min-w-0">
      <div className="font-normal text-white truncate">{negocio?.nome}</div>
      {negocio?.tipo_negocio && (
        <div className="text-xs text-gray-500 uppercase mt-0.5">{negocio.tipo_negocio}</div>
      )}
      {endereco && (
        <div className="text-xs text-gray-600 uppercase mt-0.5">{endereco}</div>
      )}
    </div>
  );
}

function AlertBox({ alert }) {
  if (!alert?.message) return null;
  const styles = {
    success: 'border-green-500/30 bg-green-500/10 text-green-300',
    warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
    error: 'border-red-500/30 bg-red-500/10 text-red-300',
  };
  return (
    <div className={`rounded-custom border px-4 py-3 text-sm ${styles[alert.type] || styles.error}`}>
      {alert.message}
    </div>
  );
}

export default function SelecionarNegocioParceiro({ user, onLogout }) {
  const navigate = useNavigate();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [term, setTerm] = useState('');
  const [searchRows, setSearchRows] = useState([]);
  const [searching, setSearching] = useState(false);
  const [requestingId, setRequestingId] = useState(null);
  const [nomeSolicitacao, setNomeSolicitacao] = useState('');
  const [alert, setAlert] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const desktopSearchRef = useRef(null);
  const desktopSearchInputRef = useRef(null);
  const searchResultsRef = useRef(null);

  const loadProfileName = useCallback(async () => {
    const fallback = String(user?.user_metadata?.nome || '').trim();
    if (fallback) {
      setNomeSolicitacao(fallback);
      return;
    }

    if (!user?.id) return;
    const { data } = await withAuthRetry(() => supabase
      .from('users')
      .select('nome')
      .eq('id', user.id)
      .maybeSingle(), 6000, 'partner-profile-name');

    const nome = String(data?.nome || '').trim();
    if (nome && nome.toLowerCase() !== 'sem nome') setNomeSolicitacao(nome);
  }, [user?.id, user?.user_metadata?.nome]);

  const loadCenter = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setAlert(null);
    try {
      const { data, error } = await withAuthRetry(
        () => supabase.rpc('get_partner_business_center'),
        7000,
        'partner-business-center'
      );
      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Partner business center load error:', error);
      setAlert({
        type: 'error',
        message: msgs.load_error,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfileName();
    loadCenter();
  }, [loadCenter, loadProfileName]);

  useEffect(() => {
    if (!searchOpen) return;
    desktopSearchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return undefined;

    const handlePointerDown = (event) => {
      if (desktopSearchRef.current?.contains(event.target)) return;
      if (searchResultsRef.current?.contains(event.target)) return;
      setSearchOpen(false);
      setTerm('');
      setSearchRows([]);
      setAlert(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [searchOpen]);

  const selectBusiness = (row) => {
    if (!row?.can_open_dashboard || !row?.negocio_id || !user?.id) return;
    try {
      window.localStorage?.setItem(`comvaga:last-partner-negocio:${user.id}`, row.negocio_id);
    } catch {
      // Sem armazenamento local, o state da rota ainda leva ao dashboard.
    }
    navigate('/dashboard', { state: { negocioId: row.negocio_id } });
  };

  const searchBusinesses = useCallback(async (cleanTerm) => {
    const clean = String(cleanTerm || '').trim();
    setAlert(null);
    if (clean.length < 3) {
      setSearchRows([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await withAuthRetry(
        () => supabase.rpc('search_partner_businesses', {
          p_term: clean,
          p_limit: 10,
        }),
        7000,
        'partner-business-search'
      );
      if (error) throw error;
      setSearchRows(data || []);
      if (!data?.length) setAlert({ type: 'warning', message: msgs.search_empty });
    } catch (error) {
      console.error('Partner business search error:', error);
      setAlert({ type: 'error', message: msgs.search_error });
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const clean = term.trim();
    if (clean.length < 3) {
      setSearchRows([]);
      setSearching(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      searchBusinesses(clean);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchBusinesses, term]);

  const requestAccess = async (row) => {
    const nome = (
      nomeSolicitacao
      || user?.user_metadata?.nome
      || String(user?.email || '').split('@')[0]
      || 'Profissional'
    ).trim().replace(/\s+/g, ' ');

    setRequestingId(row.negocio_id);
    setAlert(null);
    try {
      const { data, error } = await withAuthRetry(
        () => supabase.rpc('solicitar_acesso_parceiro', {
          p_negocio_id: row.negocio_id,
          p_nome: nome,
        }),
        8000,
        'partner-access-request'
      );
      if (error) throw error;

      const status = String(data?.status || '');
      if (status === 'pending_approval') {
        setAlert({ type: 'success', message: msgs.request_pending_approval });
      } else if (status === 'ok') {
        setAlert({ type: 'success', message: msgs.request_active });
      }

      await loadCenter({ silent: true });
      if (term.trim().length >= 3) {
        const { data: refreshedRows } = await withAuthRetry(
          () => supabase.rpc('search_partner_businesses', {
            p_term: term.trim(),
            p_limit: 10,
          }),
          7000,
          'partner-business-search-refresh'
        );
        setSearchRows(refreshedRows || []);
      }
    } catch (error) {
      const raw = String(error?.message || '').toLowerCase();
      if (raw.includes('access_inactive')) {
        setAlert({ type: 'warning', message: msgs.access_inactive });
      } else if (raw.includes('future_plan_professional_limit_reached')) {
        setAlert({ type: 'warning', message: msgs.future_plan_professional_limit_reached });
      } else if (raw.includes('plan_professional_limit_reached')) {
        setAlert({ type: 'warning', message: msgs.plan_professional_limit_reached });
      } else if (raw.includes('partner_plan_unavailable')) {
        setAlert({ type: 'warning', message: ptBR.dashboard.partner_plan_unavailable.body });
      } else if (raw.includes('owner_cannot_request_partner_access')) {
        setAlert({ type: 'warning', message: msgs.owner_cannot_request_partner_access });
      } else {
        console.error('Partner access request error:', error);
        setAlert({ type: 'error', message: msgs.request_error });
      }
    } finally {
      setRequestingId(null);
    }
  };

  const refresh = () => {
    setRefreshing(true);
    loadCenter({ silent: true });
  };

  const renderBusinessRow = (row, { searchResult = false } = {}) => {
    const canOpen = !searchResult && row?.can_open_dashboard;
    const canRequest = searchResult && row?.can_request === true;
    const unavailable = searchResult && !canRequest && !row.profissional_id;
    const showAction = canOpen || canRequest;
    const pillLabel = unavailable ? 'INDISPONÍVEL' : normalizeTag(row);
    const pillClass = unavailable ? 'border-gray-500/30 bg-gray-500/10 text-gray-300' : tagClass(row);
    return (
      <div
        key={`${searchResult ? 'search' : 'link'}:${row.negocio_id}:${row.profissional_id || 'none'}`}
        className="w-full bg-dark-100 border border-gray-800 rounded-custom p-4 transition-all text-left"
      >
        <div className="flex items-start gap-4">
          <BusinessAvatar negocio={row} />
          <BusinessInfo negocio={row} />
          <div className="flex shrink-0 items-start pt-0.5">
            <span className={`rounded-full border px-3 py-1 text-[11px] font-normal uppercase ${pillClass}`}>
              {pillLabel}
            </span>
          </div>
        </div>
        {showAction && (
          <div className="mt-4">
            {canOpen && (
              <button
                type="button"
                onClick={() => selectBusiness(row)}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-xs font-normal uppercase text-black transition-colors hover:bg-yellow-400"
              >
                Acessar <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            {canRequest && (
              <button
                type="button"
                disabled={requestingId === row.negocio_id}
                onClick={() => requestAccess(row)}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-primary/30 px-6 text-xs font-normal uppercase text-primary transition-colors hover:border-primary hover:bg-primary/10 disabled:opacity-60"
              >
                <Send className="h-3.5 w-3.5" />
                {requestingId === row.negocio_id ? 'Enviando' : 'Solicitar'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-primary text-xl">CARREGANDO...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse animation-delay-1s" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <img src="/Comvaga Logo.png" alt="COMVAGA" className="h-14 w-auto object-contain" />
          <div className="flex items-center gap-2">
            <div ref={desktopSearchRef} className="relative hidden md:block">
              <div
                className={[
                  'relative flex h-11 items-center overflow-hidden rounded-full transition-all duration-300 ease-out',
                  searchOpen
                    ? 'w-72 border border-white/10 bg-black/40 backdrop-blur-md lg:w-96'
                    : 'w-11 border border-transparent bg-transparent',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen((open) => {
                      if (open) {
                        setTerm('');
                        setSearchRows([]);
                        setAlert(null);
                      }
                      return !open;
                    });
                  }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center text-gray-300 transition-colors hover:text-primary"
                  aria-label="Pesquisar negócio"
                >
                  <SearchIcon strokeWidth={1.6} className="h-[18px] w-[18px]" />
                </button>
                <input
                  ref={desktopSearchInputRef}
                  type="search"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="PESQUISAR NEGÓCIO"
                  className={[
                    'min-w-0 flex-1 bg-transparent pr-4 text-sm uppercase text-white placeholder:text-gray-500 focus:outline-none transition-opacity duration-200',
                    searchOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
                  ].join(' ')}
                  tabIndex={searchOpen ? 0 : -1}
                />
                {searching && searchOpen && term.trim().length >= 3 && (
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 rounded-full border border-primary border-t-transparent animate-spin" />
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex h-11 w-11 items-center justify-center text-gray-300 transition-colors hover:text-primary disabled:opacity-60"
              title="Atualizar"
              aria-label="Atualizar"
            >
              <RefreshCw className={`h-6 w-6 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => onLogout('/login/parceiro')}
              className="inline-flex items-center justify-center gap-2 rounded-button bg-red-600 px-4 py-1.5 text-sm font-normal uppercase transition-colors hover:bg-red-700 sm:py-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-center md:hidden">
            <div className="relative flex h-11 w-full max-w-md items-center rounded-full border border-white/10 bg-black/40 backdrop-blur-md">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center text-gray-300">
                <SearchIcon strokeWidth={1.6} className="h-[18px] w-[18px]" />
              </div>
              <input
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="PESQUISAR NEGÓCIO"
                className="min-w-0 flex-1 bg-transparent pr-4 text-sm uppercase text-white placeholder:text-gray-500 focus:outline-none"
              />
                {searching && term.trim().length >= 3 && (
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 rounded-full border border-primary border-t-transparent animate-spin" />
                  </div>
                )}
            </div>
          </div>

          <div className="mt-4">
            <AlertBox alert={alert} />
          </div>

          {searchRows.length > 0 && (
            <div ref={searchResultsRef} className="mt-4 space-y-3">
              {searchRows.map((row) => renderBusinessRow(row, { searchResult: true }))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {links.length ? (
            links.map((row) => renderBusinessRow(row))
          ) : (
            <div className="px-4 py-8 text-center text-sm font-normal text-gray-500">
              <div className="mb-2 text-xl">:(</div>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => navigate('/conta-profissional')}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-gray-700 px-6 text-xs font-normal uppercase text-gray-300 transition-colors hover:border-primary hover:text-primary"
          >
            <UserIcon className="h-4 w-4" />
            Minha conta
          </button>
        </div>
      </div>
    </div>
  );
}
