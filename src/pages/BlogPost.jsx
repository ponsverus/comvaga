import { Link } from 'react-router-dom';
import AppFooter from '../components/AppFooter';
import { BLOG_POSTS } from '../data/blogPosts';
import { useStaticSeo } from '../hooks/useStaticSeo.js';

export default function Blog() {
  useStaticSeo('/blog');

  return (
    <div data-public-blog-preview className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-900 bg-black px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img src="/Comvaga Logo.png" alt="Comvaga" className="h-12 w-auto" />
            <span className="hidden text-xl font-black tracking-wide sm:inline">COMVAGA</span>
          </Link>
          <Link to="/cadastro" className="rounded-full bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-wide text-black transition hover:shadow-lg hover:shadow-primary/30">Testar grátis</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
        <div className="mb-12 max-w-3xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-primary">Conteúdos Comvaga</p>
          <h1 className="mb-5 text-4xl font-black leading-tight sm:text-6xl">Ideias para fazer sua agenda trabalhar melhor</h1>
          <p className="text-lg leading-relaxed text-gray-400">Guias rápidos para organizar atendimentos, profissionais, clientes e oportunidades de negócio.</p>
        </div>

        <section aria-label="Posts do blog" className="grid gap-6 md:grid-cols-2">
          {BLOG_POSTS.map((post) => (
            <article key={post.slug} className="flex flex-col rounded-2xl border border-white/10 bg-dark-100 p-7 transition hover:-translate-y-1 hover:border-primary/40">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">{post.category}</p>
              <h2 className="mb-4 text-2xl font-black leading-tight">{post.title}</h2>
              <p className="mb-7 flex-1 leading-relaxed text-gray-400">{post.description}</p>
              <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-5 text-xs text-gray-500">
                <span>{post.readTime}</span>
                <Link to={`/blog/${post.slug}`} className="font-bold uppercase tracking-wide text-primary hover:text-white">Ler artigo →</Link>
              </div>
            </article>
          ))}
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
