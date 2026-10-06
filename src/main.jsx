  import './instrument';
  import ReactDOM from 'react-dom/client';
  import * as Sentry from '@sentry/react';
  import App from './App.jsx';
  import { readPublicBusinessSnapshot } from './utils/publicBusinessPage.js';
  import './index.css';

  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error('Root element not found');
  }

  const initialBusiness = readPublicBusinessSnapshot();
  const rootOptions = {
    onUncaughtError: Sentry.reactErrorHandler(),
    onCaughtError: Sentry.reactErrorHandler(),
    onRecoverableError: Sentry.reactErrorHandler(),
  };
  const app = <App initialBusiness={initialBusiness} />;
  if (initialBusiness && rootElement.querySelector('[data-public-business-preview]')) {
    ReactDOM.hydrateRoot(rootElement, app, rootOptions);
  } else {
    ReactDOM.createRoot(rootElement, rootOptions).render(app);
  }
