import { Link } from 'react-router-dom';
import AppFooter from '../components/AppFooter';
import { BLOG_POSTS } from '../data/blogPosts/index.js';
import { useStaticSeo } from '../hooks/useStaticSeo.js';

export default function Blog() {
  useStaticSeo('/blog');

  return (
    <div data-public-blog-preview className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-900 bg-black px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img src="/Comvaga Logo.png" alt="Comvaga" className="h-12 w-auto" />
            <span className="hidden text-xl font-black sm:inline">COMVAGA</span>
          </Link>
          <Link to="/cadastro" className="rounded-full bg-primary px-5 py-2.5 text-xs font-black uppercase text-black transition hover:shadow-lg hover:shadow-primary/30">Testar grátis</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-16">
        <div className="mb-16 max-w-3xl sm:mb-20">
          <p className="mb-4 text-xs font-bold uppercase text-primary">Conteúdos Comvaga</p>
          <h1 className="mb-5 text-5xl font-normal leading-tight sm:text-7xl">Ideias para fazer sua agenda trabalhar melhor</h1>
          <p className="text-lg leading-relaxed text-gray-400">Guias rápidos para organizar atendimentos, profissionais, clientes e oportunidades de negócio.</p>
        </div>

        <section aria-label="Posts do blog" className="grid gap-x-12 gap-y-16 md:grid-cols-2">
          {BLOG_POSTS.map((post) => (
            <article key={post.slug} className="flex flex-col">
              {post.coverImage && (
                <img
                  src={post.coverImage}
                  alt={post.coverAlt || ''}
                  loading="lazy"
                  decoding="async"
                  className="mx-auto mb-6 block h-auto w-full rounded-[3px]"
                />
              )}
              <p className="mb-3 text-xs font-bold uppercase text-primary">{post.category}</p>
              <h2 className="mb-4 text-2xl font-normal leading-tight">{post.title}</h2>
              <p className="mb-7 flex-1 leading-relaxed text-gray-400">{post.description}</p>
              <Link to={`/blog/${post.slug}`} className="mt-auto inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-black uppercase text-black transition hover:shadow-lg hover:shadow-primary/30">Ler artigo</Link>
            </article>
          ))}
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
