import { useEffect, useId, useRef, useState } from 'react';
import DepoimentosPaginados from '../components/DepoimentosPaginados';

function ReviewStar({ active, onClick, label, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 w-8 items-center justify-center border-0 bg-transparent p-0 transition-transform hover:scale-105 focus:outline-none disabled:cursor-not-allowed disabled:hover:scale-100"
      aria-label={label}
    >
      <span
        aria-hidden="true"
        className={`text-[26px] leading-none transition-colors ${active ? 'text-primary' : 'text-vmuted'}`}
      >
        {'\u2605'}
      </span>
    </button>
  );
}

export default function VitrineDepoimentosSection({
  isProfessional,
  depoimentos,
  rating,
  nomeNegocioLabel,
  isLight,
  reviewRef,
  reviewState,
  reviewActions,
  pagination,
}) {
  const [commentOpen, setCommentOpen] = useState(() => Boolean(reviewState?.texto));
  const commentInputRef = useRef(null);
  const commentInputId = useId();

  useEffect(() => {
    if (commentOpen) commentInputRef.current?.focus();
  }, [commentOpen]);

  const labelClass = isLight ? 'text-vmuted' : 'text-gray-500';
  const inputClass = isLight
    ? 'text-vtext placeholder:text-vmuted focus:text-vtext'
    : 'text-white placeholder:text-gray-600 focus:text-white';
  const buttonClass = isLight
    ? 'border-yellow-600/60 bg-vprimary/15 text-vprimary hover:bg-vprimary/25'
    : 'border-primary/50 bg-primary/20 text-primary hover:bg-primary/30 hover:border-primary';
  const commentButtonClass = isLight
    ? 'border-yellow-600/60 text-yellow-800 hover:bg-yellow-500/10'
    : 'border-primary/50 text-primary hover:border-primary hover:bg-primary/10';
  const disabled = !!isProfessional || !!reviewState?.loading;
  const selectedNote = Number(reviewState?.nota);
  const sendDisabled = disabled || !Number.isInteger(selectedNote) || selectedNote < 1 || selectedNote > 5;
  const nomeDestino = String(nomeNegocioLabel || '').trim();
  const sendLabel = `ENVIAR${nomeDestino ? ` PARA ${nomeDestino}` : ''}`;

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-vcard2">
      <div className="max-w-7xl mx-auto">
        {rating && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg leading-none text-primary" aria-hidden="true">★</span>
            <span className={`text-xl font-normal ${isLight ? 'text-vtext' : 'text-primary'}`}>
              <span className="sr-only">Nota média da Comvaga: </span>{rating.value.toFixed(1)}
              <span className="sr-only"> de 5</span>
            </span>
          </div>
        )}
        <div ref={reviewRef} className="mb-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
            <div className="flex shrink-0 items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <ReviewStar
                  key={n}
                  active={Number(reviewState?.nota || 0) >= n}
                  onClick={() => reviewActions?.setNota?.(n)}
                  disabled={disabled}
                  label={`${n} estrela${n > 1 ? 's' : ''}`}
                />
              ))}
            </div>

            <div className="order-3 flex w-full items-stretch gap-2 sm:order-2 sm:ml-auto sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setCommentOpen(true);
                  commentInputRef.current?.focus();
                }}
                disabled={disabled}
                aria-controls={commentOpen ? commentInputId : undefined}
                aria-expanded={commentOpen}
                className={`shrink-0 rounded-button border bg-transparent px-4 py-2 text-sm font-normal uppercase transition-colors disabled:opacity-60 ${commentButtonClass}`}
              >
                COMENTAR
              </button>
              <button
                type="button"
                onClick={reviewActions?.onEnviar}
                disabled={sendDisabled}
                className={`min-w-0 flex-1 rounded-button border px-4 py-2 text-sm font-normal uppercase transition-colors disabled:opacity-60 sm:flex-none sm:bg-transparent ${buttonClass}`}
              >
                {reviewState?.loading ? 'ENVIANDO...' : sendLabel}
              </button>
            </div>
            {commentOpen && (
              <div className="order-2 flex min-w-0 items-center gap-2 sm:order-3 sm:w-full">
                <label htmlFor={commentInputId} className={`shrink-0 text-sm uppercase ${labelClass}`}>
                  Comentário:
                </label>
                <input
                  id={commentInputId}
                  ref={commentInputRef}
                  type="text"
                  value={reviewState?.texto || ''}
                  onChange={(event) => reviewActions?.setTexto?.(event.target.value)}
                  disabled={disabled}
                  className={`min-w-0 flex-1 bg-transparent px-0 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}
                  placeholder="ESCREVA AQUI"
                />
              </div>
            )}
          </div>
        </div>

        <DepoimentosPaginados
          depoimentos={depoimentos}
          nomeNegocioLabel={nomeNegocioLabel}
          isLight={isLight}
          hasMore={!!pagination?.hasMore}
          loadingMore={!!pagination?.loadingMore}
          onLoadMore={pagination?.onLoadMore}
          onLoadMoreError={pagination?.onLoadMoreError}
        />
      </div>
    </section>
  );
}
