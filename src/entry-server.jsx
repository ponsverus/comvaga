import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import HomePublicPreview from './components/HomePublicPreview.jsx';
import BlogPublicPreview from './components/BlogPublicPreview.jsx';

export function renderHome(appReviews) {
  return renderToString(
    <MemoryRouter initialEntries={['/']}>
      <HomePublicPreview appReviews={appReviews} />
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
