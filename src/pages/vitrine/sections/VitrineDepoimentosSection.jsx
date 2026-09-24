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
        className={`text-[26px] leading-none transition-opacity ${active ? 'text-primary opacity-100' : 'text-primary opacity-25'}`}
      >
        {'\u2605'}
      </span>
    </button>
  );
}

export default function VitrineDepoimentosSection({
  isProfessional,
  depoimentos,
  nomeNegocioLabel,
  isLight,
  reviewRef,
  reviewState,
  reviewActions,
  pagination,
}) {
  const labelClass = isLight ? 'text-vmuted' : 'text-gray-500';
  const inputClass = isLight
    ? 'text-vtext placeholder:text-vmuted focus:text-vtext'
    : 'text-white placeholder:text-gray-600 focus:text-white';
  const buttonClass = isLight
    ? 'border-vprimary/60 bg-vprimary/15 text-vprimary hover:bg-vprimary/25'
    : 'border-primary/50 bg-primary/20 text-primary hover:bg-primary/30 hover:border-primary';
  const disabled = !!isProfessional || !!reviewState?.loading;
  const nomeDestino = String(nomeNegocioLabel || '').trim();
  const sendLabel = `ENVIAR${nomeDestino ? ` PARA ${nomeDestino}` : ''}`;

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-vcard2">
      <div className="max-w-7xl mx-auto">
        <div ref={reviewRef} className="mb-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
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

            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className={`shrink-0 text-sm uppercase ${labelClass}`}>Comentário:</span>
              <input
                type="text"
                value={reviewState?.texto || ''}
                onChange={(event) => reviewActions?.setTexto?.(event.target.value)}
                disabled={disabled}
                className={`min-w-0 flex-1 bg-transparent px-0 py-2 text-sm uppercase outline-none disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}
                placeholder="OPCIONAL"
              />
            </div>

            <button
              type="button"
              onClick={reviewActions?.onEnviar}
              disabled={disabled}
              className={`w-full shrink-0 rounded-button border px-4 py-2 text-sm font-normal uppercase transition-colors disabled:opacity-60 sm:w-auto sm:bg-transparent sm:px-4 sm:text-sm ${buttonClass}`}
            >
              {reviewState?.loading ? 'ENVIANDO...' : sendLabel}
            </button>
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
