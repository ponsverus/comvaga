import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import HomePublicPreview from './components/HomePublicPreview.jsx';
import BlogPublicPreview from './components/BlogPublicPreview.jsx';

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
      <BlogPublicPreview />
    </MemoryRouter>
  );
}
