import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import AppFooter from '../components/AppFooter';
import { getBlogPost } from '../data/blogPosts';
import { applyBusinessMetadata, PUBLIC_ORIGIN } from '../utils/businessSeoMetadata.js';

function useBlogPostSeo(post) {
  useEffect(() => {
    if (!post) return undefined;

    const restore = applyBusinessMetadata({
      title: `${post.title} | Comvaga`,
      description: post.description,
      canonical: `${PUBLIC_ORIGIN}/blog/${post.slug}`,
      image: `${PUBLIC_ORIGIN}/og-default.png`,
      imageAlt: 'Comvaga - plataforma de agendamento online',
    });

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.description,
      datePublished: post.publishedAt,
      dateModified: post.publishedAt,
      mainEntityOfPage: `${PUBLIC_ORIGIN}/blog/${post.slug}`,
      author: { '@type': 'Organization', name: 'Comvaga', url: PUBLIC_ORIGIN },
      publisher: { '@type': 'Organization', name: 'Comvaga', url: PUBLIC_ORIGIN },
    });
    document.head.appendChild(script);

    return () => {
      restore();
      script.remove();
    };
  }, [post]);
}

function ComparisonTable({ rows }) {
  const [head, ...body] = rows;

  return (
    <div className="my-8 overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-primary text-black">
          <tr>{head.map((cell) => <th key={cell} className="px-4 py-3 font-black">{cell}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((row) => (
            <tr key={row[0]} className="border-t border-white/10 bg-dark-100 even:bg-dark-200">
              <th className="px-4 py-3 font-bold text-white">{row[0]}</th>
              <td className="px-4 py-3 text-gray-400">{row[1]}</td>
              <td className="px-4 py-3 font-bold text-primary">{row[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BlogPost() {
  const { slug } = useParams();
  const post = getBlogPost(slug);
  useBlogPostSeo(post);

  if (!post) return <Navigate to="/blog" replace />;

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-900 bg-black px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img src="/Comvaga Logo.png" alt="Comvaga" className="h-12 w-auto" />
            <span className="hidden text-xl font-black tracking-wide sm:inline">COMVAGA</span>
          </Link>
          <Link to="/cadastro" className="rounded-full bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-wide text-black transition hover:shadow-lg hover:shadow-primary/30">Testar grátis</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-8 sm:py-24">
        <Link to="/blog" className="text-xs font-bold uppercase tracking-[0.2em] text-primary hover:text-white">← Voltar para o blog</Link>
        <article className="mt-8">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-primary">{post.category} · {post.readTime}</p>
          <h1 className="mb-7 text-4xl font-black leading-tight sm:text-6xl">{post.title}</h1>
          <p className="mb-12 border-l-2 border-primary pl-5 text-xl leading-relaxed text-gray-300">{post.intro}</p>

          {post.sections.map((section) => (
            <section key={section.heading} className="mb-12">
              <h2 className="mb-4 text-2xl font-black leading-tight text-white sm:text-3xl">{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mb-4 leading-relaxed text-gray-400">{paragraph}</p>)}
              {section.bullets && <ul className="my-6 space-y-3 text-gray-300">{section.bullets.map((item) => <li key={item} className="flex gap-3"><span className="text-primary">✓</span><span>{item}</span></li>)}</ul>}
              {section.comparison && <ComparisonTable rows={section.comparison} />}
            </section>
          ))}

          <section className="mb-12 rounded-2xl border border-primary/30 bg-primary/10 p-7 sm:p-10">
            <h2 className="mb-3 text-2xl font-black">Veja uma plataforma feita para a rotina real</h2>
            <p className="mb-6 leading-relaxed text-gray-300">Conheça a home da Comvaga, encontre uma vitrine pública e veja como a plataforma organiza o atendimento.</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/" className="rounded-full bg-primary px-5 py-3 text-sm font-black uppercase text-black hover:shadow-lg hover:shadow-primary/30">Conhecer a Comvaga</Link>
              <Link to="/v/vikings" className="rounded-full border border-white/20 px-5 py-3 text-sm font-bold uppercase text-white hover:border-primary hover:text-primary">Ver vitrine exemplo</Link>
              <Link to="/privacidade" className="rounded-full border border-white/20 px-5 py-3 text-sm font-bold uppercase text-white hover:border-primary hover:text-primary">Política de privacidade</Link>
            </div>
          </section>
        </article>
      </main>

      <AppFooter />
    </div>
  );
}
