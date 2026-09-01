import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const ENTREGAS_PER_PAGE = 6;

function ProfissionalEntregasBlock({
  profissional,
  lista,
  pageState,
  onLoadPage,
  counterSingular,
  counterPlural,
  emptyListMsg,
  checarPermissao,
  deleteEntrega,
  toggleStatusEntrega,
  setEditingEntregaId,
  setFormEntrega,
  setShowNovaEntrega,
}) {
  const [page, setPage] = useState(0);
  const totalCount = Number.isFinite(Number(pageState?.totalCount)) ? Number(pageState.totalCount) : lista.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / ENTREGAS_PER_PAGE));
  const currentPage = Math.min(page, pageCount - 1);
  const loadingPage = pageState?.loadingPage ?? null;

  useEffect(() => {
    setPage((prev) => Math.min(prev, pageCount - 1));
  }, [pageCount]);

  useEffect(() => {
    setPage(0);
  }, [profissional.id, pageState?.version]);

  const visibleEntregas = useMemo(() => {
    const pages = pageState?.pages || {};
    if (Object.prototype.hasOwnProperty.call(pages, currentPage)) return pages[currentPage] || [];
    const start = currentPage * ENTREGAS_PER_PAGE;
    return lista.slice(start, start + ENTREGAS_PER_PAGE);
  }, [currentPage, lista, pageState?.pages]);

  const goToPage = async (targetPage) => {
    const nextPage = Math.max(0, Math.min(targetPage, pageCount - 1));
    if (nextPage === currentPage || loadingPage !== null) return;
    const pages = pageState?.pages || {};
    if (!Object.prototype.hasOwnProperty.call(pages, nextPage) && typeof onLoadPage === 'function') {
      try {
        await onLoadPage(profissional.id, nextPage);
      } catch {
        return;
      }
    }
    setPage(nextPage);
  };
  const goPrev = () => goToPage(currentPage - 1);
  const goNext = () => goToPage(currentPage + 1);

  const touchStartRef = useRef(null);

  const handleTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event) => {
    const start = touchStartRef.current;
    const touch = event.changedTouches?.[0];
    touchStartRef.current = null;
    if (!start || !touch || pageCount <= 1) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  return (
    <div className="bg-dark-200 border border-gray-800 rounded-custom p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="font-normal text-lg uppercase">{profissional.nome}</div>
        <div className="text-xs text-gray-500">{totalCount} {totalCount === 1 ? counterSingular : counterPlural}</div>
      </div>

      {totalCount ? (
        <div>
          <div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
              {visibleEntregas.map(s => {
                const preco = Number(s.preco ?? 0);
                const promo = s.preco_promocional == null ? null : Number(s.preco_promocional);
                const isInativo = s.ativo === false;
                return (
                  <div key={s.id} className={`relative bg-dark-100 border rounded-custom p-5 ${isInativo ? 'border-gray-700' : 'border-gray-800'}`}>
                    <div className="flex justify-between items-start mb-3">
                      {promo != null && promo > 0 && promo < preco ? (<div className="text-xl font-normal text-green-400">R$ {promo.toFixed(2)}</div>) : (<div className="text-xl font-normal text-primary">R$ {preco.toFixed(2)}</div>)}
                      <span className="inline-flex items-center rounded-full border border-gray-700 bg-transparent px-3 py-1 text-xs text-gray-500">{s.duracao_minutos} MIN</span>
                    </div>
                    <h3 className="flex items-center gap-2 text-sm font-normal text-white mb-0.5">
                      <span>{s.nome}</span>
                      {isInativo && <span className="w-2.5 h-2.5 rounded-full bg-gray-500 shrink-0" />}
                    </h3>
                    <p className="text-xs text-gray-500 mb-4 uppercase">PROF: {profissional.nome}</p>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button onClick={() => toggleStatusEntrega(s)} className={`flex-1 py-2 rounded-button text-sm border font-normal uppercase ${isInativo ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'}`}>
                          {isInativo ? 'ATIVAR' : 'INATIVAR'}
                        </button>
                        <button onClick={() => deleteEntrega(s)} className="flex-1 py-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-button text-sm font-normal uppercase">EXCLUIR</button>
                      </div>
                      <button onClick={async () => {
                          if (!await checarPermissao(s.profissional_id)) return;
                          setEditingEntregaId(s.id);
                          setFormEntrega({ nome: s.nome || '', duracao_minutos: String(s.duracao_minutos ?? ''), preco: String(s.preco ?? ''), preco_promocional: String(s.preco_promocional ?? ''), profissional_id: s.profissional_id || '' });
                          setShowNovaEntrega(true);
                        }} className="w-full py-2 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-button text-sm font-normal uppercase">EDITAR</button>
                    </div>
                  </div>
                );
              })}
            </div>

          {pageCount > 1 ? (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                type="button"
                onClick={goPrev}
                disabled={currentPage === 0 || loadingPage !== null}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-700 text-gray-300 transition-colors hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: pageCount }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => goToPage(index)}
                  className={['rounded-full transition-all duration-300', index === currentPage ? 'w-4 h-2 bg-primary' : 'w-2 h-2 bg-gray-600 hover:bg-gray-400'].join(' ')}
                  aria-label={`Ir para pagina ${index + 1}`}
                />
              ))}

              <button
                type="button"
                onClick={goNext}
                disabled={currentPage === pageCount - 1 || loadingPage !== null}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-700 text-gray-300 transition-colors hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      ) : <p className="text-gray-500">{emptyListMsg}</p>}
    </div>
  );
}

export default function EntregasSection({
  sectionTitle,
  parceiroProfissional,
  setShowNovaEntrega,
  setEditingEntregaId,
  setFormEntrega,
  btnAddLabel,
  profissionais,
  entregasPorProf,
  entregaPagesByProf = {},
  loadEntregasPage,
  counterSingular,
  counterPlural,
  emptyListMsg,
  checarPermissao,
  deleteEntrega,
  toggleStatusEntrega,
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-normal">{sectionTitle}</h2>
        <button
          onClick={() => { const profId = parceiroProfissional ? parceiroProfissional.id : ''; setShowNovaEntrega(true); setEditingEntregaId(null); setFormEntrega({ nome: '', duracao_minutos: '', preco: '', preco_promocional: '', profissional_id: profId }); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-button font-normal uppercase border bg-gradient-to-r from-primary to-yellow-600 text-black border-transparent">
          <Plus className="w-5 h-5" />{btnAddLabel}
        </button>
      </div>
      {profissionais.length === 0 ? <div className="text-gray-500">:(</div> : (
        <div className="space-y-4">
          {profissionais.map(p => {
            const lista = (entregasPorProf.get(p.id) || []).slice().sort((a, b) => {
              if (a.ativo !== b.ativo) return a.ativo === false ? 1 : -1;
              return Number(b.preco || 0) - Number(a.preco || 0);
            });
            const pageState = entregaPagesByProf?.[p.id] || { pages: { 0: lista }, totalCount: lista.length, loadingPage: null, version: 0 };
            return (
              <ProfissionalEntregasBlock
                key={p.id}
                profissional={p}
                lista={lista}
                pageState={pageState}
                onLoadPage={loadEntregasPage}
                counterSingular={counterSingular}
                counterPlural={counterPlural}
                emptyListMsg={emptyListMsg}
                checarPermissao={checarPermissao}
                deleteEntrega={deleteEntrega}
                toggleStatusEntrega={toggleStatusEntrega}
                setEditingEntregaId={setEditingEntregaId}
                setFormEntrega={setFormEntrega}
                setShowNovaEntrega={setShowNovaEntrega}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
