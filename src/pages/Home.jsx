import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useFeedback } from '../feedback/useFeedback';
import { CheckDoubleIcon, ZapIcon, SearchIcon, ProfessionalIcon, CheckIcon } from '../components/icons';
import { getSupportHref, getCustomPlanHref } from '../support';
import { saveSelectedPlanIntent } from '../utils/plans';
import { searchHome } from '../utils/searchHome';

const planSignupTo = (planCode) => `/cadastro/profissional?plano=${planCode}`;
function getBusinessLogoUrl(path) {
  if (!path) return null;
  try {
    if (/^https?:\/\//i.test(path)) return path;
    const stripped = path.replace(/^logos\//, '');
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

function StarGlyph({ className = '', sizeClass = 'h-8 w-8 text-[32px]' }) {
  return (
    <span className={`inline-flex items-center justify-center font-normal leading-none text-primary ${sizeClass} ${className}`}>
      {'\u2606'}
    </span>
  );
}

function MoneyGlyph({ className = '', sizeClass = 'h-8 w-8 text-[32px]' }) {
  return (
    <span
      style={{ fontFamily: 'Roboto Condensed, sans-serif' }}
      className={`inline-flex items-center justify-center font-normal leading-none text-primary ${sizeClass} ${className}`}
    >
      $
    </span>
  );
}

function SmileGlyph({ className = '', sizeClass = 'h-8 w-8 text-[32px]' }) {
  return (
    <span
      style={{ fontFamily: 'Roboto Condensed, sans-serif' }}
      className={`inline-flex items-center justify-center font-normal leading-none text-primary ${sizeClass} ${className}`}
    >
      :)
    </span>
  );
}

export default function Home({ user, userType, professionalRole = null, onLogout }) {
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

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* BARRA DE TESTE */}
      <div className="relative z-50 w-full bg-yellow-400 border-b border-yellow-300/50 overflow-hidden h-10 flex items-center">
        <div className="announcement-bar-wrapper flex">
          {[1, 2].map((i) => (
            <div key={i} className="announcement-bar-track flex items-center shrink-0 whitespace-nowrap" aria-hidden={i === 2}>
              {[...Array(14)].map((_, index) => (
                <div key={index} className="flex items-center">
                  <span className="text-black font-normal text-sm uppercase mx-4">TESTE 30 DIAS GRÁTIS</span>
                  <span className="text-black mx-4">●</span>
                  <span className="text-black font-normal text-sm uppercase mx-4">TESTE 30 DIAS GRÁTIS</span>
                  <span className="text-black mx-4">●</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <style>{`
          @keyframes announcement-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .announcement-bar-wrapper {
            display: flex;
            width: max-content;
            animation: announcement-scroll 50s linear infinite;
          }
          .announcement-bar-wrapper:hover { animation-play-state: paused; }
          @media (prefers-reduced-motion: reduce) {
            .announcement-bar-wrapper { animation: none; }
          }
        `}</style>
      </div>

      {/* HEADER */}
      <header className="absolute top-20 left-0 w-full z-40 bg-transparent border-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-center h-16 sm:h-20">
            <Link to="/" className="flex flex-col items-center justify-center gap-1">
              <img src="/Comvaga Logo.png" alt="Comvaga" className="h-15 w-auto object-contain sm:h-17" />
              <span className="text-2xl sm:text-3xl font-black">COMVAGA</span>
            </Link>
            <div className="absolute right-0 top-[40%] -translate-y-1/2">
              <SearchBox
                searchOpen={searchOpen}
                setSearchOpen={setSearchOpen}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                resultadosBusca={resultadosBusca}
                setResultadosBusca={setResultadosBusca}
                buscando={buscando}
              />
            </div>
          </div>
        </div>
      </header>

      {/* 01 — PROMESSA */}
      <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-20 lg:pt-48 lg:pb-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-yellow-600/10" />
        <div className="absolute top-20 right-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 border border-primary/30 rounded-button mb-8 backdrop-blur-sm">
            <ZapIcon className="w-4 h-4 text-primary" />
            <span className="text-primary font-bold text-sm">O FIM DA AGENDA ESBURACADA</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-6 leading-tight drop-shadow-lg">
            SUA AGENDA,
            <br />
            <span className="bg-gradient-to-r from-primary to-yellow-600 bg-clip-text text-transparent">
              MATEMATICAMENTE PERFEITA
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-3xl mx-auto drop-shadow-md">
            A Comvaga organiza agenda, vitrine, equipe e clientes em uma experiência só.
            O sistema <span className="text-primary">antecipa conflitos</span>, respeita o
            tempo real de cada trabalho e transforma horários livres em oportunidades reais de atendimento.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/cadastro"
              className="px-10 py-5 bg-gradient-to-r from-primary to-yellow-600 text-black rounded-button font-black text-lg hover:shadow-2xl hover:shadow-primary/50 transition-all hover:scale-105 flex items-center justify-center gap-3"
            >
              TESTAR GRÁTIS POR 30 DIAS
              <ZapIcon className="w-5 h-5" />
            </Link>
            <button
              type="button"
              onClick={() => scrollTo('problema')}
              className="px-10 py-5 bg-white/10 border border-white/20 text-white rounded-button font-bold text-lg hover:bg-white/20 backdrop-blur-sm"
            >
              ENTENDER O PROBLEMA
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-5">
            Comece sem compromisso e veja a experiência antes de decidir.
          </p>
        </div>
      </section>

      {/* 02 — PROBLEMA */}
      <section id="problema" className="py-24 px-4 bg-dark-200 border-y border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mb-14">
            <span className="text-primary text-xs font-bold uppercase tracking-[0.25em]">O PROBLEMA</span>
            <h2 className="text-4xl sm:text-5xl font-black mt-4 mb-6 leading-tight">
              SUA AGENDA PODE ESTAR PERDENDO DINHEIRO
              <span className="text-primary"> SEM PARECER VAZIA.</span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-400 leading-relaxed">
              Cancelamentos, intervalos e encaixes mal calculados criam espaços que poderiam
              estar ocupados por novos clientes. O problema não é apenas ter horários livres:
              é não conseguir aproveitá-los de forma inteligente.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-gray-800 border border-gray-800">
            {[
              ['CANCELAMENTOS', 'Um horário é liberado e pode permanecer vazio pelo resto do dia.'],
              ['INTERVALOS', 'Pequenas lacunas entre serviços se acumulam e reduzem sua capacidade de atendimento.'],
              ['CONFLITOS', 'Serviços com durações diferentes tornam a organização manual mais difícil e sujeita a erros.'],
            ].map(([title, text]) => (
              <div key={title} className="bg-dark-200 p-8 sm:p-10">
                <div className="w-10 h-10 rounded-full border border-primary/40 flex items-center justify-center text-primary font-black mb-6">!</div>
                <h3 className="text-xl font-black text-white mb-3">{title}</h3>
                <p className="text-gray-400 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 03 — CUSTO E CONSEQUÊNCIA */}
      <section className="py-24 px-4 bg-black">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <span className="text-primary text-xs font-bold uppercase tracking-[0.25em]">CADA ESPAÇO CONTA</span>
            <h2 className="text-4xl sm:text-5xl font-black mt-4 mb-6 leading-tight">
              UM HORÁRIO VAZIO NÃO É SÓ UM HORÁRIO.
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed mb-6">
              É capacidade de atendimento que deixou de ser aproveitada. Quando isso acontece
              repetidamente, o impacto aparece no faturamento mesmo que a agenda continue movimentada.
            </p>
            <p className="text-lg text-gray-300 leading-relaxed">
              A Comvaga foi criada para atacar esse ponto:
              <span className="text-primary font-bold"> aproveitar melhor a capacidade que sua agenda já possui.</span>
            </p>
          </div>

          <div className="border border-gray-800 bg-dark-200 p-8 sm:p-10">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-6">A LÓGICA</p>
            <div className="space-y-5">
              {[
                'Um cancelamento libera uma janela.',
                'A janela volta para disponibilidade.',
                'O sistema considera duração, rotina e horários já confirmados.',
                'Novas oportunidades podem ocupar o espaço adequado.',
              ].map((item, index) => (
                <div key={item} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-black font-black flex items-center justify-center shrink-0">{index + 1}</div>
                  <p className="text-gray-300 leading-relaxed pt-1">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 04 — SOLUÇÃO */}
      <section className="py-24 px-4 bg-dark-200 border-y border-gray-800">
        <div className="max-w-6xl mx-auto text-center">
          <span className="text-primary text-xs font-bold uppercase tracking-[0.25em]">A SOLUÇÃO</span>
          <h2 className="text-4xl sm:text-5xl font-black mt-4 mb-6 leading-tight">
            A COMVAGA NÃO APENAS REGISTRA
            <span className="text-primary"> O HORÁRIO.</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Ela considera a rotina de cada profissional, a duração real dos serviços,
            os horários ocupados e as mudanças que acontecem ao longo do dia antes de confirmar um atendimento.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mt-14 text-left">
            {[
              ['ORGANIZA', 'Cada profissional trabalha com seus próprios dias, horários e pausas.'],
              ['CALCULA', 'Novos agendamentos consideram a duração real de cada trabalho e do bloco completo.'],
              ['REAPROVEITA', 'Cancelamentos e mudanças podem transformar espaços vazios em novas oportunidades.'],
            ].map(([title, text], index) => (
              <div key={title} className="bg-dark-100 border border-gray-800 p-8">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  {index === 0 ? <ProfessionalIcon className="w-7 h-7 text-primary" /> : index === 1 ? <ZapIcon className="w-7 h-7 text-primary" /> : <CheckDoubleIcon className="w-7 h-7 text-primary" />}
                </div>
                <h3 className="text-2xl font-black mb-3">{title}</h3>
                <p className="text-gray-400 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollTo('demonstracao')}
            className="mt-12 px-8 py-4 bg-white/10 border border-white/20 text-white rounded-button font-bold hover:bg-white/20 transition-all"
          >
            VER A COMVAGA EM FUNCIONAMENTO
          </button>
        </div>
      </section>

      {/* 05 — DEMONSTRAÇÃO */}
      <section id="demonstracao" className="py-0 bg-black overflow-hidden border-b border-gray-800">
        <div className="w-full bg-dark-200 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse" />

          <div className="bg-gray-800 w-full">
            <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-16 text-center sm:px-8 sm:py-20 md:px-16 lg:px-24">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest">VEJA AO VIVO</span>
              </div>

              <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
                VEJA A COMVAGA
                <br />
                <span className="text-primary">EM FUNCIONAMENTO.</span>
              </h2>

              <p className="text-lg text-gray-400 mb-10 leading-relaxed max-w-3xl">
                Conheça uma vitrine de exemplo e veja como o cliente encontra o negócio,
                conhece os serviços, visualiza a equipe e chega ao agendamento.
              </p>

              <a
                href="https://comvaga.com.br/v/vikings"
                target="_blank"
                rel="noreferrer"
                className="px-8 py-4 bg-primary text-black font-black rounded-button hover:shadow-[0_0_30px_rgba(255,209,26,0.3)] transition-all flex items-center justify-center gap-3"
              >
                VER VITRINE EXEMPLO
                <ZapIcon className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 06 — MECANISMO */}
      <section id="como-funciona" className="py-24 bg-dark-100 w-full">
        <div className="max-w-7xl mx-auto px-4 text-center mb-16">
          <span className="text-primary text-xs font-bold uppercase tracking-[0.25em]">POR TRÁS DA EXPERIÊNCIA</span>
          <h2 className="text-4xl sm:text-5xl font-black mt-4 mb-4">
            COMO A COMVAGA
            <span className="text-primary"> PENSA A AGENDA</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            A tecnologia existe para uma coisa: aproveitar melhor o tempo disponível sem criar
            conflitos ou exigir que o profissional faça todos os cálculos manualmente.
          </p>
        </div>

        <div className="w-full bg-gray-800 border-y border-gray-800 grid md:grid-cols-2 lg:grid-cols-3 gap-px">
          {[
            ['01', 'ROTINA REAL', 'Cada profissional trabalha com seus próprios dias, horários e pausas. A agenda se adapta à rotina individual.'],
            ['02', 'ENCAIXE AUTOMÁTICO', 'O sistema recalcula a agenda a cada evento: novos horários, desistências ou trocas.'],
            ['03', 'ZONA DE CALOR', 'Novos clientes são direcionados para horários próximos de atendimentos já confirmados, compactando o dia e reduzindo intervalos.'],
            ['04', 'MÚLTIPLOS SERVIÇOS', 'Quando o cliente seleciona mais de um trabalho, o sistema considera o tempo total e verifica se o bloco completo cabe no turno.'],
            ['05', 'REAPROVEITAMENTO INTELIGENTE', 'Um horário liberado por cancelamento volta à vitrine como oportunidade de atendimento, respeitando a duração disponível.'],
            ['06', 'CONTROLE DE CONFLITOS', 'A lógica de integridade impede que dois agendamentos sejam confirmados no mesmo espaço de tempo.'],
          ].map(([num, title, text]) => (
            <div key={num} className="bg-dark-100 p-8 md:p-10 flex flex-col">
              <div className="w-14 h-14 bg-gradient-to-br from-primary to-yellow-600 rounded-full flex items-center justify-center text-black font-black text-xl shadow-lg shadow-primary/50 mb-6">
                {num}
              </div>
              <h3 className="text-2xl font-normal mb-3 text-white">{title}</h3>
              <p className="text-gray-400 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 07 — BENEFÍCIOS */}
      <section className="py-24 bg-dark-200 w-full">
        <div className="max-w-7xl mx-auto px-4 text-center mb-16">
          <span className="text-primary text-xs font-bold uppercase tracking-[0.25em]">NA PRÁTICA</span>
          <h2 className="text-4xl sm:text-5xl font-black mt-4 mb-4">
            O QUE VOCÊ <span className="text-primary">GANHA</span>
          </h2>
          <p className="text-xl text-gray-400">Menos atrito na rotina, mais praticidade para o cliente.</p>
        </div>

        <div className="w-full bg-gray-800 border-y border-gray-800 grid sm:grid-cols-2 lg:grid-cols-3 gap-px">
          {[
            ['VITRINE PROFISSIONAL', 'Tenha um link bio personalizado. O cliente vê profissionalismo desde o primeiro clique.'],
            ['RESGATE IMEDIATO', 'Cancelamentos deixam de ser apenas um horário perdido: a janela volta para a vitrine e pode ser preenchida por outro cliente.'],
            ['MAIS HORÁRIOS APROVEITADOS', 'Menos tempo perdido entre clientes e mais atendimentos possíveis no mesmo dia.'],
            ['MAIS CAPACIDADE DE FATURAMENTO', 'Ao reduzir espaços ociosos, você aproveita melhor a capacidade de atendimento que já possui.'],
            ['CLIENTE SATISFEITO', 'Quem agenda tem a certeza de ser atendido no horário marcado, sem depender de cálculos manuais.'],
            ['FLUXO COMPLETO', 'Da descoberta ao pós-atendimento, profissional e cliente continuam dentro do mesmo sistema.'],
          ].map(([title, text]) => (
            <div key={title} className="bg-dark-200 p-8 sm:p-10 hover:bg-dark-100 transition-colors">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <CheckIcon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-normal mb-3 text-white">{title}</h3>
              <p className="text-gray-400 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 08 — PROVA DISPONÍVEL / REDUÇÃO DE RISCO */}
      <section className="py-24 px-4 bg-black border-y border-gray-800">
        <div className="max-w-5xl mx-auto text-center">
          <span className="text-primary text-xs font-bold uppercase tracking-[0.25em]">VEJA ANTES DE DECIDIR</span>
          <h2 className="text-4xl sm:text-5xl font-black mt-4 mb-6">
            NÃO PRECISA ACREDITAR
            <span className="text-primary"> SÓ NA PROMESSA.</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Você pode explorar uma vitrine de exemplo antes de escolher um plano.
            Depois, teste a plataforma por 30 dias e descubra se ela se encaixa na sua operação.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="https://comvaga.com.br/v/vikings"
              target="_blank"
              rel="noreferrer"
              className="px-8 py-4 bg-primary text-black font-black rounded-button hover:shadow-2xl hover:shadow-primary/30 transition-all"
            >
              EXPLORAR EXEMPLO
            </a>
            <button
              type="button"
              onClick={() => scrollTo('planos')}
              className="px-8 py-4 bg-white/10 border border-white/20 text-white font-bold rounded-button hover:bg-white/20 transition-all"
            >
              VER PLANOS
            </button>
          </div>
        </div>
      </section>

      {/* 09 — PLANOS */}
      <section ref={plansSectionRef} id="planos" className="py-24 bg-dark-100 w-full">
        <div className="max-w-7xl mx-auto px-4 text-center mb-16">
          <span className="text-primary text-xs font-bold uppercase tracking-[0.25em]">ESCOLHA SEM PRESSA</span>
          <h2 className="text-4xl sm:text-5xl font-black mt-4 mb-4">
            TUDO O QUE VOCÊ PRECISA,
            <span className="text-primary"> SEM BUROCRACIA</span>
          </h2>
          <p className="text-xl text-gray-400">
            Teste grátis por 30 dias o plano escolhido. Sem compromisso e sem burocracia.
          </p>
        </div>

        <div className="w-full bg-gray-800 border-y border-gray-800 flex md:grid md:grid-cols-2 gap-px overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="shrink-0 w-[85vw] md:w-auto snap-start bg-dark-100 px-4 sm:px-8 md:px-12 lg:px-16 py-12 md:py-16">
            <span className="inline-block text-[10px] font-normal uppercase tracking-widest text-gray-400 bg-gray-800 rounded-full px-3 py-1 mb-4">
              TODOS OS PLANOS INCLUEM
            </span>
            <h3 className="text-3xl md:text-4xl font-black text-white mb-2">TODOS OS RECURSOS</h3>
            <p className="text-gray-400 mb-8">
              A mesma inteligência em todos os planos. Nenhum recurso fica bloqueado atrás de um plano mais caro.
            </p>

            <div className="flex flex-col gap-5">
              {[
                ['Reabertura automática de horários cancelados na agenda', 'Horários liberados por cancelamentos voltam automaticamente à disponibilidade.'],
                ['Reserva em lote de múltiplos trabalhos', 'O sistema organiza vários atendimentos em sequência dentro do mesmo período disponível.'],
                ['Direcionamento inteligente de novos agendamentos', 'Novas reservas seguem para as zonas de calor, compactando a agenda.'],
                ['Comprometimento da agenda e receita futura projetada', 'Acompanhe quanto da agenda já está preenchido e quanto está projetado de receita para o dia seguinte.'],
                ['Agendamento assistido pelo profissional', 'O profissional registra o agendamento pela agenda quando o cliente precisa de ajuda.'],
                ['Reagendamento inteligente pela área exclusiva do cliente', 'Um novo horário pode ser escolhido sem repetir todas as etapas da reserva.'],
                ['Alertas por e-mail em tempo real', 'O sistema avisa você e seu cliente sobre novos agendamentos ou cancelamentos.'],
                ['Lembrete automático + WhatsApp', 'Um lembrete automático avisa o cliente 30 minutos antes.'],
                ['Sincronia com o Google Agenda', 'O cliente confirma se quer manter ou criar o agendamento no Google Agenda.'],
              ].map(([title, text]) => (
                <div key={title} className="flex items-start gap-2.5">
                  <CheckIcon className="w-4 h-4 text-primary shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-200 leading-snug">{title}</p>
                    <p className="text-sm text-gray-500 leading-snug mt-0.5">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="shrink-0 w-[85vw] md:w-auto snap-start bg-dark-200 flex flex-col divide-y divide-gray-800">
            <div className="px-4 sm:px-8 md:px-12 lg:px-16 pt-12 md:pt-16 pb-6">
              <span className="inline-block text-[10px] font-normal uppercase tracking-widest text-primary bg-primary/15 rounded-full px-3 py-1 mb-4">
                ESCOLHA A CAPACIDADE
              </span>
              <h3 className="text-3xl md:text-4xl font-black text-white mb-2">QUANTOS PROFISSIONAIS?</h3>
              <p className="text-gray-400">
                Estrutura flexível para diferentes volumes de trabalho. Escolha a capacidade adequada para sua equipe.
              </p>
            </div>

            {[
              { code: 'essencial', name: 'Essencial', capacity: '1 profissional', oldPrice: null, price: 'R$ 69,99', badge: null },
              { code: 'profissional', name: 'Profissional', capacity: 'Até 3 profissionais', oldPrice: 'R$ 99,99', price: 'R$ 69,99', badge: 'MAIS ESCOLHIDO' },
              { code: 'premium', name: 'Premium', capacity: 'Até 9 profissionais', oldPrice: null, price: 'R$ 129,99', badge: null },
            ].map((plan) => (
              <div
                key={plan.code}
                className={`px-4 sm:px-8 md:px-12 lg:px-16 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 ${plan.code === 'profissional' ? 'bg-primary/5' : ''}`}
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] font-normal uppercase tracking-widest text-gray-400">{plan.name}</span>
                    {plan.badge && (
                      <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-black">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-lg md:text-xl font-normal uppercase text-primary mb-2">{plan.capacity}</p>
                  <div className="flex items-end gap-x-3 gap-y-1 flex-wrap">
                    {plan.oldPrice && (
                      <span className="text-base font-normal text-red-500 line-through decoration-red-500 decoration-2">{plan.oldPrice}</span>
                    )}
                    <span className={`text-xl font-normal ${plan.code === 'profissional' ? 'text-green-400' : 'text-white'}`}>
                      {plan.price}<span className="text-sm font-normal text-gray-500">/mês</span>
                    </span>
                  </div>
                </div>

                <Link
                  to={planSignupTo(plan.code)}
                  onClick={() => saveSelectedPlanIntent(plan.code)}
                  className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-yellow-600 text-black text-xs font-black uppercase tracking-wider rounded-full hover:shadow-lg hover:shadow-primary/30 transition-all"
                >
                  TESTAR O {plan.name}
                  <ZapIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}

            <div className="flex-1 flex flex-col items-start justify-center text-left gap-3 px-4 sm:px-8 md:px-12 lg:px-16 py-10 bg-primary/5">
              <span className="text-[10px] font-normal uppercase tracking-widest text-primary">PERSONALIZADO</span>
              <p className="text-xl md:text-2xl font-normal text-white">Precisa de um plano personalizado?</p>
              <p className="text-sm text-gray-400 max-w-sm">
                Precisa de mais limite, recursos específicos ou um formato diferente de atendimento?
                Fale com nossa equipe.
              </p>
              <a
                href={getCustomPlanHref()}
                target="_blank"
                rel="noreferrer"
                className="mt-2 w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-yellow-600 text-black text-xs font-black uppercase tracking-wider rounded-full hover:shadow-lg hover:shadow-primary/30 transition-all"
              >
                FALAR COM SUPORTE
                <ZapIcon className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 10 — FAQ / OBJEÇÕES */}
      <section className="py-24 px-4 bg-black">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-primary text-xs font-bold uppercase tracking-[0.25em]">AINDA COM DÚVIDA?</span>
            <h2 className="text-4xl sm:text-5xl font-black mt-4 mb-4">
              ANTES DE COMEÇAR,
              <span className="text-primary"> SAIBA DISSO.</span>
            </h2>
            <p className="text-lg text-gray-400">
              Algumas respostas rápidas para as dúvidas mais importantes antes do teste.
            </p>
          </div>

          <div className="space-y-3">
            {[
              ['Posso testar antes de decidir?', 'Sim. A oferta apresentada inclui 30 dias grátis no plano escolhido, sem compromisso.'],
              ['Preciso escolher um plano mais caro para ter os recursos principais?', 'Não. A mesma inteligência está disponível em todos os planos; a diferença apresentada é principalmente a capacidade de profissionais.'],
              ['A Comvaga considera serviços com durações diferentes?', 'Sim. O mecanismo de múltiplos serviços considera o tempo dos trabalhos e verifica se o bloco completo cabe no turno do profissional.'],
              ['O cliente consegue reagendar?', 'Sim. Entre os recursos apresentados está o reagendamento inteligente pela área exclusiva do cliente.'],
              ['Posso conhecer a experiência antes de contratar?', 'Sim. A página disponibiliza uma vitrine de exemplo e, depois, você pode iniciar o teste gratuito de 30 dias.'],
            ].map(([question, answer]) => (
              <details key={question} className="group border border-gray-800 bg-dark-200">
                <summary className="cursor-pointer list-none px-6 py-5 flex items-center justify-between gap-6 text-white font-bold">
                  <span>{question}</span>
                  <span className="text-primary text-xl transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="px-6 pb-6">
                  <p className="text-gray-400 leading-relaxed">{answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 11 — CTA FINAL */}
      <section className="py-24 px-4 bg-gradient-to-r from-primary via-yellow-500 to-yellow-600">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block text-black/60 text-xs font-black uppercase tracking-[0.25em] mb-5">
            AGORA VOCÊ JÁ SABE COMO FUNCIONA
          </span>
          <h2 className="text-5xl font-black text-black mb-6">SUA AGENDA PODE TRABALHAR MELHOR</h2>
          <p className="text-2xl text-black/80 mb-8">
            Uma vitrine para apresentar seu negócio, um painel para operar e uma agenda que pensa antes de confirmar.
          </p>
          <Link
            to="/cadastro"
            className="inline-flex items-center gap-3 px-12 py-6 bg-black text-primary rounded-button font-black text-xl hover:shadow-2xl transition-all"
          >
            TESTAR GRÁTIS POR 30 DIAS
            <ZapIcon className="w-6 h-6" />
          </Link>
          <p className="text-black/60 text-sm mt-6">
            Comece pelo teste e veja a experiência funcionando na sua rotina.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="flex flex-col justify-start">
              <Link to="/" className="inline-block hover:opacity-75 transition-opacity">
                <img src="/Comvaga Logo.png" alt="Comvaga" className="h-16 w-auto object-contain" />
              </Link>
              <p className="text-gray-600 text-xs mt-3 uppercase leading-relaxed">
                Sua agenda,
                <br />
                matematicamente perfeita.
              </p>
            </div>

            <div>
              <h3 className="text-white font-normal mb-4">PARA VOCÊ</h3>
              <ul className="space-y-2">
                {isLogged ? (
                  <>
                    <li>
                      <Link to={loggedAreaLink} className="text-gray-500 hover:text-primary transition-colors text-sm">
                        {loggedAreaLabel}
                      </Link>
                    </li>
                    <li>
                      <button type="button" onClick={handleLogoutClick} className="text-gray-500 hover:text-primary transition-colors text-sm">
                        SAIR
                      </button>
                    </li>
                  </>
                ) : (
                  <>
                    <li><Link to="/login" className="text-gray-500 hover:text-primary transition-colors text-sm">LOGIN</Link></li>
                    <li><Link to="/cadastro" className="text-gray-500 hover:text-primary transition-colors text-sm">CADASTRAR GRÁTIS</Link></li>
                    <li><Link to="/login/parceiro" className="text-gray-500 hover:text-primary transition-colors text-sm">LOGIN PARCEIRO</Link></li>
                    <li><Link to="/cadastro/parceiro" className="text-gray-500 hover:text-primary transition-colors text-sm">CADASTRO PARCEIRO</Link></li>
                  </>
                )}
                <li>
                  <a href={supportHref} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-primary transition-colors text-sm">
                    SUPORTE
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-normal mb-4">EMPRESA</h3>
              <ul className="space-y-2">
                <li><Link to="/sobre" className="text-gray-400 hover:text-primary transition-colors text-sm">SOBRE</Link></li>
                <li><a href="#" className="text-gray-400 hover:text-primary transition-colors text-sm">BLOG</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-normal mb-4">LEGAL</h3>
              <ul className="space-y-2">
                <li><Link to="/privacidade" className="text-gray-500 hover:text-primary transition-colors text-sm">PRIVACIDADE</Link></li>
                <li><Link to="/termos" className="text-gray-500 hover:text-primary transition-colors text-sm">TERMOS</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6">
            <p className="text-gray-600 text-sm">© 2026 COMVAGA. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
