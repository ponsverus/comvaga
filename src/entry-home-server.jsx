import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import HomePublicPreview from './components/HomePublicPreview.jsx';

export function renderHome() {
  return renderToString(
    <MemoryRouter initialEntries={['/']}>
      <HomePublicPreview />
    </MemoryRouter>
  );
}
