import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarIcon, CheckIcon, SelectIcon, TimeIcon } from '../../../components/icons';

const ENTREGAS_POR_PAGINA = 6;

function EntregaButtons({
  entrega,
  profissional,
  selecaoProfId,
  servicosSelecionados,
  isProfessional,
  onAgendarAgora,
  onToggleSelecao,
  isLight,
}) {
  const isSelecionado = servicosSelecionados.some((item) => item.id === entrega.id);
  const modoSelecaoOn = servicosSelecionados.length > 0;
  const outroProfSel = modoSelecaoOn && selecaoProfId !== null && selecaoProfId !== profissional.id;
  const agendarDesabilitado = !!isProfessional || modoSelecaoOn;
  const selecionarDesabilitado = !!isProfessional || outroProfSel;

  let selecionarClass;
  if (isProfessional || outroProfSel) {
    selecionarClass = 'bg-vcard2 border-vborder text-vmuted cursor-not-allowed opacity-30';
  } else if (isSelecionado) {
    selecionarClass = isLight ? 'bg-vprimary/10 border-vprimary text-vtext' : 'bg-primary/15 border-primary text-primary';
  } else if (modoSelecaoOn) {
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
        onClick={() => !agendarDesabilitado && onAgendarAgora(profissional, [entrega])}
        disabled={agendarDesabilitado}
        className={`flex-1 py-2.5 rounded-button text-sm font-normal uppercase transition-all flex items-center justify-center gap-1.5 ${agendarClass}`}
      >
        <CalendarIcon
          className={[
            'w-3.5 h-3.5',
            agendarDesabilitado ? 'opacity-40' : 'opacity-90',
          ].join(' ')}
        />
        Agendar
      </button>
      <button
        type="button"
        onClick={() => !selecionarDesabilitado && onToggleSelecao(profissional, entrega)}
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
  selecaoProfId,
  servicosSelecionados,
  isProfessional,
  onAgendarAgora,
  onToggleSelecao,
  isLight,
}) {
  const preco = Number(entrega.preco ?? 0);
  const promo = Number(entrega.preco_promocional ?? 0);
  const temPromo = Number.isFinite(promo) && promo > 0 && promo < preco;
  const precoFinal = Number(entrega.preco_final ?? 0);

  return (
    <div className="bg-vcard2 border border-vborder rounded-custom p-4">
      {temPromo ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="font-normal text-sm leading-tight">{entrega.nome}</div>
            <span
              className="inline-block px-1.5 py-0.5 rounded-button text-[9px] font-normal uppercase shrink-0"
              style={{ background: 'var(--voferta-bg)', border: '1px solid var(--voferta-border)', color: 'var(--voferta-text)' }}
            >
              OFERTA
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 mt-2">
            <div className="flex items-center gap-1 text-xs text-vmuted font-normal">
              <TimeIcon className="w-3 h-3 shrink-0" />
              {entrega.duracao_minutos} MIN
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-normal text-base" style={{ color: 'var(--vpromo-text)' }}>R$ {precoFinal.toFixed(2)}</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="font-normal text-sm leading-tight">{entrega.nome}</div>
            <div className="text-vprimary font-normal text-base shrink-0">R$ {precoFinal.toFixed(2)}</div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-vmuted font-normal">
            <TimeIcon className="w-3 h-3 shrink-0" />
            {entrega.duracao_minutos} MIN
          </div>
        </>
      )}
      <EntregaButtons
        entrega={entrega}
        profissional={profissional}
        selecaoProfId={selecaoProfId}
        servicosSelecionados={servicosSelecionados}
        isProfessional={isProfessional}
        onAgendarAgora={onAgendarAgora}
        onToggleSelecao={onToggleSelecao}
        isLight={isLight}
      />
    </div>
  );
}

export default function EntregasCarousel({
  lista,
  pages = null,
  totalCount = null,
  loadingPage = null,
  version = 0,
  onLoadPage,
  profissional,
  selecaoProfId,
  servicosSelecionados,
  isProfessional,
  onAgendarAgora,
  onToggleSelecao,
  emptyMsg,
  isLight,
}) {
  const [pagina, setPagina] = useState(0);
  const [animDir, setAnimDir] = useState(null);
  const [exibindo, setExibindo] = useState(0);
  const [animando, setAnimando] = useState(false);
  const [loadingTargetPage, setLoadingTargetPage] = useState(null);
  const touchStartX = useRef(null);
  const animationTimeoutRef = useRef(null);
  const totalItens = Number.isFinite(Number(totalCount)) ? Number(totalCount) : lista.length;
  const totalPaginas = Math.ceil(totalItens / ENTREGAS_POR_PAGINA);
  const getPageItems = (pageIndex) => {
    if (pages && Object.prototype.hasOwnProperty.call(pages, pageIndex)) return pages[pageIndex] || [];
    return lista.slice(
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
    } catch {
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
  const translateSaindo = animDir === 'left' ? '-100%' : animDir === 'right' ? '100%' : '0%';
  const translateEntrando = animDir === 'left' ? '100%' : animDir === 'right' ? '-100%' : '0%';
  const dotInactive = isLight ? 'bg-vborder hover:bg-vsub/40' : 'bg-gray-700 hover:bg-gray-500';
  const navBtnCl = isLight ? 'hover:bg-vcard2 text-vmuted hover:text-vtext' : 'hover:bg-vcard2 text-vsub hover:text-vtext';

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div style={{ overflow: 'hidden', position: 'relative' }}>
        {animando && (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              transform: `translateX(${translateSaindo})`,
              transition: 'transform 320ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {itensAntigos.map((item) => (
              <EntregaCard
                key={item.id}
                entrega={item}
                profissional={profissional}
                selecaoProfId={selecaoProfId}
                servicosSelecionados={servicosSelecionados}
                isProfessional={isProfessional}
                onAgendarAgora={onAgendarAgora}
                onToggleSelecao={onToggleSelecao}
                isLight={isLight}
              />
            ))}
          </div>
        )}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          style={{
            transform: animando ? `translateX(${translateEntrando})` : 'translateX(0%)',
            transition: animando ? 'transform 320ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          }}
        >
          {(animando ? itensNovos : itensMostrados).map((item) => (
            <EntregaCard
              key={item.id}
              entrega={item}
              profissional={profissional}
              selecaoProfId={selecaoProfId}
              servicosSelecionados={servicosSelecionados}
              isProfessional={isProfessional}
              onAgendarAgora={onAgendarAgora}
              onToggleSelecao={onToggleSelecao}
              isLight={isLight}
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
