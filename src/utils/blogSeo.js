import { PUBLIC_ORIGIN } from './seoMetadata.js';
import { COMVAGA_ORGANIZATION } from './comvagaOrganization.js';
import { BLOG_POSTS } from '../data/blogPosts/index.js';

export const BLOG_SCHEMA_ID = 'comvaga-blog-schema';
export const BLOG_INDEX_SCHEMA_ID = 'comvaga-blog-index-schema';

const BLOG_INDEX_NAME = 'Ideias para fazer sua agenda trabalhar melhor';
const BLOG_INDEX_DESCRIPTION = 'Guias da Comvaga sobre agendamento online, organização de horários, profissionais, clientes e atendimento por hora marcada.';

export function buildBlogMetadata(post) {
  if (!post?.slug || !post?.title) return null;

  return {
    title: post.metaTitle,
    description: post.metaDescription,
    canonical: `${PUBLIC_ORIGIN}/blog/${post.slug}`,
    image: `${PUBLIC_ORIGIN}/og-default.png`,
    imageAlt: 'Comvaga - plataforma de agendamento online',
    type: 'article',
    publishedAt: post.publishedAt,
  };
}

export function buildBlogStructuredData(post) {
  const metadata = buildBlogMetadata(post);
  if (!metadata) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    mainEntityOfPage: metadata.canonical,
    author: COMVAGA_ORGANIZATION,
    publisher: COMVAGA_ORGANIZATION,
  };
}

export function buildBlogIndexStructuredData(posts = BLOG_POSTS) {
  const blogPosts = (Array.isArray(posts) ? posts : []).filter((post) =>
    typeof post?.slug === 'string' && post.slug && typeof post.title === 'string' && post.title,
  );

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${PUBLIC_ORIGIN}/blog#webpage`,
    url: `${PUBLIC_ORIGIN}/blog`,
    name: BLOG_INDEX_NAME,
    description: BLOG_INDEX_DESCRIPTION,
    inLanguage: 'pt-BR',
    publisher: COMVAGA_ORGANIZATION,
    mainEntity: {
      '@type': 'ItemList',
      name: 'Artigos do blog da Comvaga',
      numberOfItems: blogPosts.length,
      itemListElement: blogPosts.map((post, index) => {
        const url = `${PUBLIC_ORIGIN}/blog/${post.slug}`;
        const item = {
          '@type': 'WebPage',
          name: post.title,
          url,
        };
        if (typeof post.description === 'string' && post.description.trim()) {
          item.description = post.description.trim();
        }
        return {
          '@type': 'ListItem',
          position: index + 1,
          item,
        };
      }),
    },
  };
}
