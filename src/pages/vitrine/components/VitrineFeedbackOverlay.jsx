import { useFeedback, useFeedbackState } from '../../../feedback/useFeedback';
import { AlertModal, ConfirmModal } from './VitrineOverlays';

export default function VitrineFeedbackOverlay({ isLight }) {
  const state = useFeedbackState();
  const { close, next, previous } = useFeedback();
  const payload = state.open && state.payload?.presentation === 'vitrine' ? state.payload : null;

  if (!payload) return null;

  const dismissAlert = () => {
    if (state.hasNext) next();
    else close(true);
  };

  return (
    <div className={isLight ? 'vitrine-light' : undefined}>
      {payload.type === 'confirm' ? (
        <ConfirmModal
          open
          onCancel={() => close(false)}
          onConfirm={() => close(true)}
          title={payload.title}
          body={payload.body}
          confirmText={payload.confirmText}
          cancelText={payload.cancelText}
          isLight={isLight}
        />
      ) : (
        <AlertModal
          open
          onClose={dismissAlert}
          title={payload.title}
          body={payload.body}
          buttonText={payload.buttonText}
          isLight={isLight}
          isPaged={state.isPaged}
          hasNext={state.hasNext}
          hasPrevious={state.hasPrevious}
          onNext={next}
          onPrevious={previous}
        />
      )}
    </div>
  );
}
