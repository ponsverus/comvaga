import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useFeedback } from '../feedback/useFeedback';
import { SearchIcon, ProfessionalIcon } from '../components/icons';
import SearchEmptyState from '../components/SearchEmptyState';
import { getSupportHref } from '../support';
import { searchHome } from '../utils/searchHome';
import { useStaticSeo } from '../hooks/useStaticSeo.js';
import HomePublicContent from '../components/HomePublicContent.jsx';
import { applyStructuredData } from '../utils/structuredData.js';
import { HOME_SCHEMA_ID, buildHomeStructuredData } from '../utils/homeSeo.js';
import { withTimeout } from '../utils/withTimeout.js';
import { withAuthRetry } from '../utils/authSession.js';
import { getPublicUrl } from '../utils/storage.js';

const APP_REVIEWS_PAGE_SIZE = 12;

// Converte uma linha de depoimento do app no formato esperado pelo cartão.
// avatar_path só chega quando o autor autorizou a foto (regra aplicada no banco).
function toAppReviewItem(row) {
  return {
    ...row,
    users: { nome: row.nome_publico },
    avatarClienteUrl: getPublicUrl('avatars', row.avatar_path),
  };
}

async function fetchAppReviews(cursor = null) {
  const { data, error } = await withTimeout(
    supabase.rpc('get_depoimentos_app', {
      p_limit: APP_REVIEWS_PAGE_SIZE + 1,
      p_cursor_created_at: cursor?.created_at ?? null,
      p_cursor_id: cursor?.id ?? null,
    }),
    7000,
    'depoimentos-app'
  );
  if (error) throw error;
  return data || [];
}

async function fetchAppReviewsHome() {
  const { data, error } = await withTimeout(
    supabase.rpc('get_depoimentos_app_home'),
    7000,
    'depoimentos-app-home'
  );
  if (error) throw error;
  if (!data || !Array.isArray(data.items)) throw new Error('Resposta inválida de depoimentos da Comvaga');

  const count = Number(data.rating_count);
  const value = data.rating_value == null ? null : Number(data.rating_value);
  if (!Number.isSafeInteger(count) || count < 0 || count < data.items.length
    || (count > 0 && (!Number.isFinite(value) || value < 1 || value > 5))
    || (count === 0 && data.items.length > 0)) {
    throw new Error('Resumo inválido de depoimentos da Comvaga');
  }
  return { items: data.items, rating: count > 0 ? { count, value } : null };
}

function getBusinessLogoUrl(path) {
  if (!path) return null;
  try {
    const normalizedPath = String(path).trim();
    if (!normalizedPath || /^https?:\/\//i.test(normalizedPath)) return null;

    const stripped = normalizedPath.replace(/^logos\//, '');
    const { data } = supabase.storage.from('logos').getPublicUrl(stripped);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

function SearchBox({
  searchOpen,
  setSearchOpen,
  searchTerm,
  setSearchTerm,
  resultadosBusca,
  setResultadosBusca,
  buscando,
  searchFailed,
}) {
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!searchOpen) return;
    inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const handlePointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) {
        setSearchOpen(false);
        setSearchTerm('');
        setResultadosBusca([]);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [searchOpen, setResultadosBusca, setSearchOpen, setSearchTerm]);

  return (
    <div ref={wrapRef} className="relative">
      <div
        className={[
          'relative flex items-center overflow-hidden rounded-full bg-black/40 backdrop-blur-md transition-all duration-300 ease-out',
          searchOpen
            ? 'w-[min(24rem,calc(100vw-2rem))] border border-white/10 shadow-[0_0_0_1px_rgba(255,209,26,0.18)]'
            : 'w-11 border border-transparent bg-transparent backdrop-blur-0',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={() => {
            if (searchOpen && !searchTerm) {
              setSearchOpen(false);
              return;
            }
            setSearchOpen(true);
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center text-gray-300 transition-colors hover:text-primary"
          aria-label="Pesquisar"
        >
          <SearchIcon strokeWidth={1.6} className="h-[18px] w-[18px]" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="BUSQUE UM PROFISSIONAL OU NEGÓCIO :)"
          className={[
            'bg-transparent pr-4 text-sm text-white uppercase placeholder:text-gray-500 focus:outline-none transition-all duration-300',
            searchOpen ? 'w-full opacity-100' : 'w-0 opacity-0',
          ].join(' ')}
        />

        {buscando && searchTerm.trim().length >= 3 && (
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 rounded-full border border-primary border-t-transparent animate-spin" />
          </div>
        )}
      </div>

      {searchOpen && resultadosBusca.length > 0 && (
        <div className="absolute right-0 top-full z-50 mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[3px] border border-white/10 bg-dark-100/95 shadow-2xl backdrop-blur-xl">
          {resultadosBusca.map((r, i) => {
            const isNegocio = String(r?.tipo || '').toLowerCase() === 'negocio';
            const businessLogoUrl = isNegocio ? getBusinessLogoUrl(r.logo_path) : null;

            return (
              <Link
                key={`${r.tipo}-${r.id}-${i}`}
                to={`/v/${r.slug}`}
                onClick={() => {
                  setSearchOpen(false);
                  setSearchTerm('');
                  setResultadosBusca([]);
                }}
                className="block border-b border-white/5 px-5 py-4 transition-colors hover:bg-dark-200/90 last:border-b-0"
              >
                {isNegocio ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-dark-200">
                      {businessLogoUrl ? (
                        <img
                          src={businessLogoUrl}
                          alt=""
                          className="h-full w-full rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-primary to-yellow-600">
                          <ProfessionalIcon className="h-5 w-5 text-black" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-normal text-white uppercase">{r.nome}</div>
                      {r.subtitulo && (
                        <div className="mt-1 truncate text-sm text-gray-400">{r.subtitulo}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="font-normal text-white uppercase">{r.nome}</div>
                    {r.subtitulo && (
                      <div className="mt-1 text-sm text-gray-400">{r.subtitulo}</div>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {searchOpen && !buscando && !searchFailed && searchTerm.trim().length >= 3 && resultadosBusca.length === 0 && (
        <SearchEmptyState className="absolute right-0 top-full z-50 mt-3 w-[min(24rem,calc(100vw-2rem))]" />
      )}
    </div>
  );
}

export default function Home({ user, userType, professionalRole = null, onLogout }) {
  const navigate = useNavigate();
  useStaticSeo('/');
  const [appReviewRating, setAppReviewRating] = useState(null);
  useEffect(() => applyStructuredData(HOME_SCHEMA_ID, buildHomeStructuredData(appReviewRating)), [appReviewRating]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);

  const plansSectionRef = useRef(null);

  const { showMessage, confirm } = useFeedback();
  const [appReviewItems, setAppReviewItems] = useState([]);
  const [appReviewsHasMore, setAppReviewsHasMore] = useState(false);
  const [appReviewsLoadingMore, setAppReviewsLoadingMore] = useState(false);
  const [appReviewSending, setAppReviewSending] = useState(false);
  const [appReviewNota, setAppReviewNota] = useState(0);
  const [appReviewTexto, setAppReviewTexto] = useState('');
  const appReviewLoadLock = useRef(false);
  const appReviewSendLock = useRef(false);
  const appReviewRequestId = useRef(0);
  const isLogged = !!user && !!userType;
  const isPartner = userType === 'professional' && professionalRole === 'partner';
  const loggedAreaLink = userType === 'professional'
    ? isPartner ? '/selecionar-negocio-parceiro' : '/dashboard'
    : '/minha-area';
  const loggedAreaLabel = userType === 'professional'
    ? isPartner ? 'SELECIONAR NEGÓCIO' : 'DASHBOARD'
    : 'MINHA ÁREA';
  const supportHref = getSupportHref(userType);

  const applyAppReviewsHome = useCallback(({ items, rating }) => {
    setAppReviewItems(items.slice(0, APP_REVIEWS_PAGE_SIZE).map(toAppReviewItem));
    setAppReviewsHasMore(items.length > APP_REVIEWS_PAGE_SIZE);
    setAppReviewRating(rating);
  }, []);

  useEffect(() => {
    let active = true;
    const requestId = ++appReviewRequestId.current;
    fetchAppReviewsHome()
      .then((snapshot) => {
        if (!active || requestId !== appReviewRequestId.current) return;
        applyAppReviewsHome(snapshot);
      })
      .catch((error) => {
        if (!active || requestId !== appReviewRequestId.current) return;
        console.error('Falha ao carregar depoimentos da Comvaga:', error);
        setAppReviewItems([]);
        setAppReviewsHasMore(false);
        setAppReviewRating(null);
        showMessage('home.app_reviews_load_error');
      });
    return () => { active = false; };
  }, [applyAppReviewsHome, showMessage]);

  const loadMoreAppReviews = async () => {
    if (appReviewLoadLock.current || !appReviewsHasMore || appReviewItems.length === 0) return false;
    appReviewLoadLock.current = true;
    setAppReviewsLoadingMore(true);
    const requestId = appReviewRequestId.current;
    try {
      const rows = await fetchAppReviews(appReviewItems[appReviewItems.length - 1]);
      if (requestId !== appReviewRequestId.current) return false;
      const next = rows.slice(0, APP_REVIEWS_PAGE_SIZE).map(toAppReviewItem);
      setAppReviewItems((current) => {
        const ids = new Set(current.map((item) => item.id));
        return [...current, ...next.filter((item) => !ids.has(item.id))];
      });
      setAppReviewsHasMore(rows.length > APP_REVIEWS_PAGE_SIZE);
      return next.length > 0;
    } finally {
      appReviewLoadLock.current = false;
      setAppReviewsLoadingMore(false);
    }
  };

  const sendAppReview = async () => {
    if (!user?.id) {
      if (await confirm('home.app_review_need_login')) navigate('/login');
      return;
    }
    if (!Number.isInteger(appReviewNota) || appReviewNota < 1 || appReviewNota > 5) return;
    const comentario = appReviewTexto.trim();
    if (comentario.length > 1000) {
      showMessage('home.app_review_invalid_comment');
      return;
    }
    if (appReviewSendLock.current) return;
    appReviewSendLock.current = true;
    try {
      const consentGranted = await confirm('home.app_review_publish_confirm');
      if (!consentGranted) return;
      setAppReviewSending(true);
      const { error } = await withAuthRetry(
        () => supabase.rpc('create_depoimento_app', {
          p_nota: appReviewNota,
          p_comentario: comentario || null,
          p_consentimento: true,
          p_consentimento_foto: true,
        }),
        7000,
        'enviar-depoimento-app'
      );
      if (error) throw error;
      setAppReviewNota(0);
      setAppReviewTexto('');
      showMessage('home.app_review_sent');
      const requestId = ++appReviewRequestId.current;
      try {
        const snapshot = await fetchAppReviewsHome();
        if (requestId === appReviewRequestId.current) applyAppReviewsHome(snapshot);
      } catch (reloadError) {
        if (requestId !== appReviewRequestId.current) return;
        console.error('Falha ao atualizar depoimentos da Comvaga:', reloadError);
        setAppReviewItems([]);
        setAppReviewsHasMore(false);
        setAppReviewRating(null);
        showMessage('home.app_reviews_load_error');
      }
    } catch (error) {
      console.error('Falha ao enviar depoimento da Comvaga:', error);
      showMessage(error?.code === '23505' ? 'home.app_review_already_sent' : 'home.app_review_send_error');
    } finally {
      appReviewSendLock.current = false;
      setAppReviewSending(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const buscar = async () => {
      const term = String(searchTerm || '').trim();

      if (term.length < 3) {
        if (!cancelled) {
          setResultadosBusca([]);
          setBuscando(false);
          setSearchFailed(false);
        }
        return;
      }

      if (!cancelled) {
        setBuscando(true);
        setSearchFailed(false);
      }

      try {
        const rows = await searchHome(term, { limit: 10 });
        if (cancelled) return;
        setResultadosBusca(rows);
      } catch (error) {
        if (cancelled) return;
        console.error('Erro na busca:', error);
        showMessage('home.search_failed_support');
        setResultadosBusca([]);
        setSearchFailed(true);
      } finally {
        if (!cancelled) setBuscando(false);
      }
    };

    const timer = setTimeout(buscar, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setBuscando(false);
    };
  }, [searchTerm, showMessage]);

  const handleLogoutClick = () => onLogout?.();

  return (
    <HomePublicContent
      SearchBoxComponent={SearchBox}
      searchOpen={searchOpen}
      setSearchOpen={setSearchOpen}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      resultadosBusca={resultadosBusca}
      setResultadosBusca={setResultadosBusca}
      buscando={buscando}
      searchFailed={searchFailed}
      plansSectionRef={plansSectionRef}
      isLogged={isLogged}
      loggedAreaLink={loggedAreaLink}
      loggedAreaLabel={loggedAreaLabel}
      supportHref={supportHref}
      handleLogoutClick={handleLogoutClick}
      appReviews={{
        items: appReviewItems,
        rating: appReviewRating,
        form: {
          nota: appReviewNota,
          texto: appReviewTexto,
          loading: appReviewSending,
        },
        actions: {
          setNota: setAppReviewNota,
          setTexto: setAppReviewTexto,
          onEnviar: sendAppReview,
        },
        pagination: {
          hasMore: appReviewsHasMore,
          loadingMore: appReviewsLoadingMore,
          onLoadMore: loadMoreAppReviews,
          onLoadMoreError: () => showMessage('home.app_reviews_load_more_error'),
        },
      }}
    />
  );
}
