import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarIcon, CheckIcon, SelectIcon } from '../../../components/icons';

const ENTREGAS_POR_PAGINA = 6;

function EntregaButtons({
  entrega,
  profissional,
  profissionalSelecionadoId,
  entregasSelecionadas = [],
  isProfessional,
  onAgendarAgora,
  onAgendarClick,
  onAlternarEntregaSelecionada,
  isLight,
  animarPromocao,
}) {
  const selecionadas = Array.isArray(entregasSelecionadas) ? entregasSelecionadas : [];
  const isSelecionado = selecionadas.some((item) => item.id === entrega.id);
  const temEntregasSelecionadas = selecionadas.length > 0;
  const outroProfSel = temEntregasSelecionadas && profissionalSelecionadoId !== null && profissionalSelecionadoId !== profissional.id;
  const agendarDesabilitado = !!isProfessional || temEntregasSelecionadas;
  const selecionarDesabilitado = !!isProfessional || outroProfSel;

  let selecionarClass;
  if (isProfessional || outroProfSel) {
    selecionarClass = 'bg-vcard2 border-vborder text-vmuted cursor-not-allowed opacity-30';
  } else if (isSelecionado) {
    selecionarClass = isLight ? 'bg-vprimary/10 border-vprimary text-vtext' : 'bg-primary/15 border-primary text-primary';
  } else if (temEntregasSelecionadas) {
    selecionarClass = isLight
      ? 'bg-vcard border-vborder text-vsub hover:border-vprimary hover:text-vtext'
      : 'bg-vcard2 border-vborder text-white hover:border-primary hover:text-primary';
  } else {
    selecionarClass = isLight
      ? 'bg-vcard border-vborder text-vsub hover:border-vprimary hover:text-vtext'
      : 'bg-vcard2 border-vborder text-vsub hover:border-primary hover:text-primary';
  }

  const agendarClass = agendarDesabilitado
    ? 'bg-vcard2 border border-vborder text-vmuted cursor-not-allowed opacity-40'
    : isLight
      ? 'bg-vprimary text-vprimary-text hover:opacity-90'
      : 'bg-gradient-to-r from-primary to-yellow-600 text-black hover:opacity-90';

  return (
    <div className="flex gap-2 mt-3">
      <button
        type="button"
        onClick={() => {
          if (agendarDesabilitado) return;
          onAgendarClick?.(entrega.id);
          onAgendarAgora(profissional, [entrega]);
        }}
        disabled={agendarDesabilitado}
        aria-label={`Agendar ${entrega.nome}`}
        className={`flex-1 py-2.5 rounded-button text-sm font-normal uppercase transition-all flex items-center justify-center gap-1.5 ${agendarClass} ${animarPromocao ? 'promo-booking-cta' : ''}`}
      >
        <CalendarIcon
          className={[
            'w-3.5 h-3.5',
            agendarDesabilitado ? 'opacity-40' : 'opacity-90',
          ].join(' ')}
        />
        {animarPromocao ? (
          <span className="promo-booking-label" aria-hidden="true">
            <span className="promo-booking-standard">Agendar</span>
            <span className="promo-booking-drop">Baixou</span>
          </span>
        ) : 'Agendar'}
      </button>
      <button
        type="button"
        onClick={() => !selecionarDesabilitado && onAlternarEntregaSelecionada(profissional, entrega)}
        disabled={selecionarDesabilitado}
        className={`flex-1 py-2.5 rounded-button text-sm font-normal uppercase transition-all flex items-center justify-center gap-1.5 border ${selecionarClass}`}
      >
        {isSelecionado ? (
          <>
            <CheckIcon className="w-3.5 h-3.5" />
            Selecionado
          </>
        ) : (
          <>
            <SelectIcon
              className={[
                'w-3.5 h-3.5',
                selecionarDesabilitado ? 'opacity-40' : 'opacity-80',
              ].join(' ')}
            />
            Selecionar
          </>
        )}
      </button>
    </div>
  );
}

function EntregaCard({
  entrega,
  profissional,
  profissionalSelecionadoId,
  entregasSelecionadas = [],
  isProfessional,
  onAgendarAgora,
  onAgendarClick,
  onAlternarEntregaSelecionada,
  isLight,
  promocaoEncerrada,
}) {
  const cardRef = useRef(null);
  const [visivel, setVisivel] = useState(false);
  const selecionadas = Array.isArray(entregasSelecionadas) ? entregasSelecionadas : [];
  const valor = Number(entrega.valor ?? 0);
  const promo = Number(entrega.valor_promocional ?? 0);
  const temPromo = Number.isFinite(promo) && promo > 0 && promo < valor;
  const valorFinal = Number(entrega.valor_final ?? 0);
  const animarPromocao = temPromo && visivel && !promocaoEncerrada && !isProfessional && selecionadas.length === 0;

  useEffect(() => {
    const node = cardRef.current;
    if (!temPromo || promocaoEncerrada || !node || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      setVisivel(entry.intersectionRatio >= 0.6);
    }, { threshold: 0.6 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [temPromo, promocaoEncerrada]);

  return (
    <div ref={cardRef} className="bg-vcard2 border border-vborder rounded-custom p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center rounded-full border border-vborder bg-transparent px-3 py-1 text-xs text-vmuted font-normal shrink-0">
          {entrega.tempo_minutos} MIN
        </span>
        {temPromo ? (
          <div className="font-normal text-base text-vpromo shrink-0">R$ {valorFinal.toFixed(2)}</div>
        ) : (
          <div className="text-vprimary font-normal text-base shrink-0">R$ {valorFinal.toFixed(2)}</div>
        )}
      </div>
      <div className="font-normal text-sm leading-tight mt-4">{entrega.nome}</div>
      <EntregaButtons
        entrega={entrega}
        profissional={profissional}
        profissionalSelecionadoId={profissionalSelecionadoId}
        entregasSelecionadas={selecionadas}
        isProfessional={isProfessional}
        onAgendarAgora={onAgendarAgora}
        onAgendarClick={temPromo ? onAgendarClick : undefined}
        onAlternarEntregaSelecionada={onAlternarEntregaSelecionada}
        isLight={isLight}
        animarPromocao={animarPromocao}
      />
    </div>
  );
}

export default function EntregasCarousel({
  lista = [],
  pages = null,
  totalCount = null,
  loadingPage = null,
  version = 0,
  onLoadPage,
  onLoadPageError,
  profissional,
  profissionalSelecionadoId,
  entregasSelecionadas = [],
  isProfessional,
  onAgendarAgora,
  onAlternarEntregaSelecionada,
  emptyMsg,
  isLight,
}) {
  const [pagina, setPagina] = useState(0);
  const [animDir, setAnimDir] = useState(null);
  const [exibindo, setExibindo] = useState(0);
  const [animando, setAnimando] = useState(false);
  const [loadingTargetPage, setLoadingTargetPage] = useState(null);
  const [promocoesEncerradas, setPromocoesEncerradas] = useState(() => new Set());
  const touchStartX = useRef(null);
  const animationTimeoutRef = useRef(null);
  const listaSegura = Array.isArray(lista) ? lista : [];
  const selecionadas = Array.isArray(entregasSelecionadas) ? entregasSelecionadas : [];
  const encerrarPromocao = (id) => {
    setPromocoesEncerradas((anteriores) => {
      if (anteriores.has(id)) return anteriores;
      const atualizadas = new Set(anteriores);
      atualizadas.add(id);
      return atualizadas;
    });
  };
  const totalItens = Number.isFinite(Number(totalCount)) ? Number(totalCount) : listaSegura.length;
  const totalPaginas = Math.ceil(totalItens / ENTREGAS_POR_PAGINA);
  const getPageItems = (pageIndex) => {
    if (pages && Object.prototype.hasOwnProperty.call(pages, pageIndex)) return pages[pageIndex] || [];
    return listaSegura.slice(
      pageIndex * ENTREGAS_POR_PAGINA,
      pageIndex * ENTREGAS_POR_PAGINA + ENTREGAS_POR_PAGINA
    );
  };

  useEffect(() => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    setPagina(0);
    setExibindo(0);
    setAnimDir(null);
    setAnimando(false);
    setLoadingTargetPage(null);
  }, [profissional.id, version]);

  useEffect(() => {
    const ultimaPagina = Math.max(totalPaginas - 1, 0);
    if (pagina <= ultimaPagina && exibindo <= ultimaPagina) return;
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    setPagina((prev) => Math.min(prev, ultimaPagina));
    setExibindo((prev) => Math.min(prev, ultimaPagina));
    setAnimDir(null);
    setAnimando(false);
  }, [exibindo, pagina, totalPaginas]);

  useEffect(() => () => {
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
  }, []);

  const ensurePage = async (idx) => {
    if (!pages || Object.prototype.hasOwnProperty.call(pages, idx) || typeof onLoadPage !== 'function') return true;
    try {
      setLoadingTargetPage(idx);
      await onLoadPage(profissional.id, idx);
      return true;
    } catch (error) {
      if (typeof onLoadPageError === 'function') onLoadPageError({ error, profissional, page: idx });
      return false;
    } finally {
      setLoadingTargetPage(null);
    }
  };

  const irPara = async (idx) => {
    const alvo = Math.max(0, Math.min(idx, totalPaginas - 1));
    if (alvo === pagina || animando || loadingTargetPage !== null || loadingPage !== null) return;
    const loaded = await ensurePage(alvo);
    if (!loaded) return;
    const dir = alvo > pagina ? 'left' : 'right';
    setAnimDir(dir);
    setAnimando(true);
    setPagina(alvo);
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    animationTimeoutRef.current = setTimeout(() => {
      setExibindo(alvo);
      setAnimDir(null);
      setAnimando(false);
      animationTimeoutRef.current = null;
    }, 320);
  };

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) irPara(pagina + (diff > 0 ? 1 : -1));
    touchStartX.current = null;
  };

  if (!totalItens) return <p className="text-vmuted font-normal">{emptyMsg}</p>;

  const paginaAnterior = exibindo;
  const paginaAlvo = pagina;
  const itensAntigos = getPageItems(paginaAnterior);
  const itensNovos = getPageItems(paginaAlvo);
  const itensMostrados = animando ? itensAntigos : itensNovos;
  const slideOutClass = animDir === 'left' ? '-translate-x-full' : animDir === 'right' ? 'translate-x-full' : 'translate-x-0';
  const slideInClass = animando
    ? animDir === 'left'
      ? 'translate-x-full'
      : animDir === 'right'
        ? '-translate-x-full'
        : 'translate-x-0'
    : 'translate-x-0';
  const slideTransitionClass = animando ? 'carousel-slide-transition' : 'carousel-slide-no-transition';
  const dotInactive = isLight ? 'bg-vborder hover:bg-vsub/40' : 'bg-gray-700 hover:bg-gray-500';
  const navBtnCl = isLight ? 'hover:bg-vcard2 text-vmuted hover:text-vtext' : 'hover:bg-vcard2 text-vsub hover:text-vtext';

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="relative overflow-hidden">
        {animando && (
          <div
            className={`absolute inset-x-0 top-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${slideOutClass} carousel-slide-transition`}
          >
            {itensAntigos.map((item) => (
              <EntregaCard
                key={item.id}
                entrega={item}
                profissional={profissional}
                profissionalSelecionadoId={profissionalSelecionadoId}
                entregasSelecionadas={selecionadas}
                isProfessional={isProfessional}
                onAgendarAgora={onAgendarAgora}
                onAgendarClick={encerrarPromocao}
                onAlternarEntregaSelecionada={onAlternarEntregaSelecionada}
                isLight={isLight}
                promocaoEncerrada={promocoesEncerradas.has(item.id)}
              />
            ))}
          </div>
        )}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${slideInClass} ${slideTransitionClass}`}
        >
          {(animando ? itensNovos : itensMostrados).map((item) => (
            <EntregaCard
              key={item.id}
              entrega={item}
              profissional={profissional}
              profissionalSelecionadoId={profissionalSelecionadoId}
              entregasSelecionadas={selecionadas}
              isProfessional={isProfessional}
              onAgendarAgora={onAgendarAgora}
              onAgendarClick={encerrarPromocao}
              onAlternarEntregaSelecionada={onAlternarEntregaSelecionada}
              isLight={isLight}
              promocaoEncerrada={promocoesEncerradas.has(item.id)}
            />
          ))}
        </div>
      </div>
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button type="button" onClick={() => irPara(pagina - 1)} disabled={pagina === 0 || loadingTargetPage !== null || loadingPage !== null} className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-vborder transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${navBtnCl}`}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPaginas }).map((_, i) => (
            <button
              type="button"
              key={i}
              onClick={() => irPara(i)}
              className={['rounded-full transition-all duration-300', i === pagina ? 'w-4 h-2 bg-vprimary' : `w-2 h-2 ${dotInactive}`].join(' ')}
              aria-label={`Página ${i + 1}`}
            />
          ))}
          <button type="button" onClick={() => irPara(pagina + 1)} disabled={pagina === totalPaginas - 1 || loadingTargetPage !== null || loadingPage !== null} className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-vborder transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${navBtnCl}`}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
