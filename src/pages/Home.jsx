import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useFeedback } from '../feedback/useFeedback';
import { SearchIcon, ProfessionalIcon } from '../components/icons';
import { getSupportHref } from '../support';
import { searchHome } from '../utils/searchHome';
import { useStaticSeo } from '../hooks/useStaticSeo.js';
import HomePublicContent from '../components/HomePublicContent.jsx';

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

      {searchOpen && !buscando && searchTerm.trim().length >= 3 && resultadosBusca.length === 0 && (
        <div className="absolute right-0 top-full z-50 mt-3 w-[min(24rem,calc(100vw-2rem))] rounded-[3px] border border-white/10 bg-dark-100/95 px-5 py-4 text-sm text-gray-400 shadow-2xl backdrop-blur-xl">
          :(
        </div>
      )}
    </div>
  );
}

export default function Home({ user, userType, professionalRole = null, onLogout }) {
  useStaticSeo('/');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [buscando, setBuscando] = useState(false);

  const plansSectionRef = useRef(null);

  const { showMessage } = useFeedback();
  const isLogged = !!user && !!userType;
  const isPartner = userType === 'professional' && professionalRole === 'partner';
  const loggedAreaLink = userType === 'professional'
    ? isPartner ? '/selecionar-negocio-parceiro' : '/dashboard'
    : '/minha-area';
  const loggedAreaLabel = userType === 'professional'
    ? isPartner ? 'SELECIONAR NEGÓCIO' : 'DASHBOARD'
    : 'MINHA ÁREA';
  const supportHref = getSupportHref(userType);

  useEffect(() => {
    let cancelled = false;

    const buscar = async () => {
      const term = String(searchTerm || '').trim();

      if (term.length < 3) {
        if (!cancelled) {
          setResultadosBusca([]);
          setBuscando(false);
        }
        return;
      }

      if (!cancelled) setBuscando(true);

      try {
        const rows = await searchHome(term, { limit: 10 });
        if (cancelled) return;
        setResultadosBusca(rows);
      } catch (error) {
        if (cancelled) return;
        console.error('Erro na busca:', error);
        showMessage('home.search_failed_support');
        setResultadosBusca([]);
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
      plansSectionRef={plansSectionRef}
      isLogged={isLogged}
      loggedAreaLink={loggedAreaLink}
      loggedAreaLabel={loggedAreaLabel}
      supportHref={supportHref}
      handleLogoutClick={handleLogoutClick}
    />
  );
}
