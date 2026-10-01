import { useEffect, useState } from 'react';

import FullScreenMessage from './ui/FullScreenMessage';
import { getFeedbackState, subscribeFeedback } from './feedbackStore';
import { useFeedback } from './useFeedback';

export default function FeedbackProvider({ children }) {
  const [st, setSt] = useState(() => getFeedbackState());
  const { close } = useFeedback();

  useEffect(() => {
    return subscribeFeedback(setSt);
  }, []);

  return (
    <>
      {children}
      <FullScreenMessage open={st.open} payload={st.payload} onClose={close} />
    </>
  );
}
