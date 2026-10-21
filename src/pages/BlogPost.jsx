import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import AppFooter from '../components/AppFooter';
import { CheckIcon } from '../components/icons';
import { getBlogPost } from '../data/blogPosts/index.js';
import { COMVAGA_ORGANIZATION } from '../utils/comvagaOrganization.js';
import { applyMetadata } from '../utils/seoMetadata.js';
import { applyStructuredData } from '../utils/structuredData.js';
import { BLOG_SCHEMA_ID, buildBlogMetadata, buildBlogStructuredData } from '../utils/blogSeo.js';

function useBlogPostSeo(post) {
  useEffect(() => {
    if (!post) return undefined;

    const restore = applyMetadata(buildBlogMetadata(post));
    const removeSchema = applyStructuredData(BLOG_SCHEMA_ID, buildBlogStructuredData(post));

    return () => {
      restore();
      removeSchema();
    };
  }, [post]);
}

function ComparisonTimeline({ rows }) {
  const [head, ...body] = rows;

  return (
    <ol className="relative my-8 space-y-8 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-primary/40">
      {body.map((row, index) => (
        <li key={row[0]} className="relative pl-12">
          <span
            aria-hidden="true"
            className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-normal text-black"
          >
            {index + 1}
          </span>
          <h3 className="mb-2 text-xl font-normal leading-tight text-white">{row[0]}</h3>
          <p className="text-sm leading-relaxed text-gray-400 md:text-base">
            <span className="text-gray-500">{head[1]}:</span> {row[1]}
          </p>
          <p className="mt-2 leading-relaxed text-primary md:text-lg">
            <span className="sr-only">{head[2]}: </span>
            {row[2]}
          </p>
        </li>
      ))}
    </ol>
  );
}

export default function BlogPost() {
  const { slug } = useParams();
  const post = getBlogPost(slug);
  const hasCoverImage = Boolean(post?.coverImage && post.coverImage !== '/');
  const [announcementPaused, setAnnouncementPaused] = useState(false);
  useBlogPostSeo(post);

  if (!post) return <Navigate to="/blog" replace />;

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

      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-8 sm:py-24">
        <Link to="/blog" className="group inline-flex items-center gap-2 text-gray-400 transition-colors hover:text-primary">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-normal">VOLTAR</span>
        </Link>
        <article className="mt-8">
          <div className={hasCoverImage ? 'mb-12 grid items-center gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]' : 'mb-8'}>
            {hasCoverImage && (
              <img
                src={post.coverImage}
                alt={post.coverAlt || ''}
                decoding="async"
                className="mx-auto h-48 w-48 rounded-full object-cover sm:h-56 sm:w-56 md:h-64 md:w-64"
              />
            )}
            <div>
              <p className="mb-4 text-xs font-normal uppercase text-primary">{post.category} · {post.readTime}</p>
              <h1 className="mb-3 text-4xl font-normal leading-tight sm:text-5xl lg:text-6xl">{post.title}</h1>
              <p className="text-sm uppercase italic text-gray-400">
                Por {COMVAGA_ORGANIZATION.name}
              </p>
            </div>
          </div>
          <p className="mb-12 border-l-2 border-primary pl-5 text-xl leading-relaxed text-gray-300">{post.intro}</p>

          {post.sections.map((section) => (
            <section key={section.heading} className="mb-12">
              <h2 className="mb-4 text-2xl font-normal leading-tight text-white sm:text-3xl">{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mb-4 leading-relaxed text-gray-400">{paragraph}</p>)}
              {section.bullets && <ul className="my-6 space-y-3 text-gray-300">{section.bullets.map((item) => <li key={item} className="flex gap-3"><CheckIcon className="mt-1 h-4 w-4 shrink-0 text-primary" /><span>{item}</span></li>)}</ul>}
              {section.comparison && <ComparisonTimeline rows={section.comparison} />}
            </section>
          ))}
        </article>
      </main>

      <nav aria-label="Conheça a Comvaga" className="blog-announcement flex h-12 w-full items-center bg-yellow-400 text-black">
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className={`announcement-bar-wrapper flex ${announcementPaused ? 'is-paused' : ''}`}>
            {[0, 1].map((copy) => (
              <div
                key={copy}
                className="announcement-bar-track flex min-w-max shrink-0 items-center gap-8 whitespace-nowrap px-4"
                aria-hidden={copy === 1}
              >
                {Array.from({ length: 4 }, (_, repeat) => (
                  <div key={repeat} className="flex shrink-0 items-center gap-8" aria-hidden={copy === 1 || repeat > 0}>
                    <Link to="/" tabIndex={copy === 1 || repeat > 0 ? -1 : undefined} className="py-3 text-sm font-normal uppercase hover:underline focus-visible:underline">Conhecer a Comvaga</Link>
                    <span aria-hidden="true">●</span>
                    <Link to="/v/vikings" tabIndex={copy === 1 || repeat > 0 ? -1 : undefined} className="py-3 text-sm font-normal uppercase hover:underline focus-visible:underline">Ver vitrine exemplo</Link>
                    <span aria-hidden="true">●</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAnnouncementPaused((paused) => !paused)}
          aria-label={announcementPaused ? 'Retomar animação da faixa' : 'Pausar animação da faixa'}
          className="flex h-12 w-12 shrink-0 items-center justify-center text-black/70 transition-colors hover:text-black focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-black motion-reduce:hidden"
        >
          {announcementPaused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
        </button>
      </nav>

      <AppFooter />
    </div>
  );
}
