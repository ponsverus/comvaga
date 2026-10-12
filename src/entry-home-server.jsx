import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import HomePublicPreview from './components/HomePublicPreview.jsx';
import BlogRoutes from './components/BlogRoutes.jsx';

export function renderHome() {
  return renderToString(
    <MemoryRouter initialEntries={['/']}>
      <HomePublicPreview />
    </MemoryRouter>
  );
}

export function renderBlog(path) {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <BlogRoutes />
    </MemoryRouter>
  );
}
