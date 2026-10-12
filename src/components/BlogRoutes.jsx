import { useRoutes } from 'react-router-dom';
import Blog from '../pages/Blog';
import BlogPost from '../pages/BlogPost';

export default function BlogRoutes({ nested = false }) {
  return useRoutes(nested ? [
    { index: true, element: <Blog /> },
    { path: ':slug', element: <BlogPost /> },
  ] : [
    { path: '/blog', element: <Blog /> },
    { path: '/blog/:slug', element: <BlogPost /> },
  ]);
}
