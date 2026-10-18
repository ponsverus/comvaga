import { useEffect, useState } from 'react';

import FullScreenMessage from './ui/FullScreenMessageView';
import { getFeedbackState, subscribeFeedback } from './feedbackStore';
import { useFeedback } from './useFeedback';

export default function FeedbackProvider({ children }) {
  const [st, setSt] = useState(() => getFeedbackState());
  const { close, next, previous } = useFeedback();

  useEffect(() => {
    return subscribeFeedback(setSt);
  }, []);

  return (
    <>
      {children}
      <FullScreenMessage
        open={st.open}
        payload={st.payload}
        hasNext={st.hasNext}
        hasPrevious={st.hasPrevious}
        isPaged={st.isPaged}
        onClose={close}
        onNext={next}
        onPrevious={previous}
      />
    </>
  );
}
