import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
          <h3 className="mb-3 text-xl font-normal leading-tight text-white">{row[0]}</h3>
          <p className="text-sm font-normal text-red-400 md:text-base">{head[1]}</p>
          <p className="mb-3 text-sm leading-relaxed text-gray-400 md:text-base">{row[1]}</p>
          <p className="text-sm font-normal text-primary md:text-base">Comvaga</p>
          <p className="leading-relaxed text-primary md:text-lg">{row[2]}</p>
        </li>
      ))}
    </ol>
  );
}

export default function BlogPost() {
  const { slug } = useParams();
  const post = getBlogPost(slug);
  const hasCoverImage = Boolean(post?.coverImage && post.coverImage !== '/');
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
              {section.paragraphs?.map((paragraph, index) => {
                const link = paragraph?.link;
                return (
                  <p key={typeof paragraph === 'string' ? `${index}-${paragraph}` : `${index}-${link?.to}`} className="mb-4 leading-relaxed text-gray-400">
                    {typeof paragraph === 'string' ? paragraph : (
                      <>
                        {paragraph.before}
                        <Link to={link.to} className="font-normal italic text-primary underline decoration-primary underline-offset-4 hover:text-yellow-300">
                          {link.text}
                        </Link>
                        {paragraph.after}
                      </>
                    )}
                  </p>
                );
              })}
              {section.bullets && <ul className="my-6 space-y-3 text-gray-300">{section.bullets.map((item) => <li key={item} className="flex gap-3"><CheckIcon className="mt-1 h-4 w-4 shrink-0 text-primary" /><span>{item}</span></li>)}</ul>}
              {section.comparison && <ComparisonTimeline rows={section.comparison} />}
            </section>
          ))}
        </article>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/cadastro"
            className="inline-flex items-center justify-center rounded-button bg-primary px-6 py-3 text-sm font-normal uppercase text-black transition-colors hover:bg-primary/90"
          >
            Testar agora
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-button border border-white/15 px-6 py-3 text-sm font-normal uppercase text-white transition-colors hover:border-primary hover:text-primary"
          >
            Voltar para home
          </Link>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
