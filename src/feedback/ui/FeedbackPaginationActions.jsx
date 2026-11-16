export default function FeedbackPaginationActions({
  hasPrevious = false,
  hasNext = false,
  onPrevious,
  onNext,
  onFinish,
  primaryButtonRef,
  containerClassName = 'flex gap-3',
  previousButtonClassName = '',
  primaryButtonClassName = '',
}) {
  return (
    <div className={containerClassName}>
      {hasPrevious ? (
        <button
          type="button"
          onClick={onPrevious}
          className={previousButtonClassName}
        >
          ANTERIOR
        </button>
      ) : null}
      <button
        ref={primaryButtonRef}
        type="button"
        onClick={hasNext ? onNext : onFinish}
        className={primaryButtonClassName}
      >
        {hasNext ? 'PRÓXIMA' : 'OK'}
      </button>
    </div>
  );
}
