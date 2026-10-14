import { PUBLIC_ORIGIN } from './seoMetadata.js';
import { COMVAGA_ORGANIZATION } from './comvagaOrganization.js';

export const BLOG_SCHEMA_ID = 'comvaga-blog-schema';

export function buildBlogMetadata(post) {
  if (!post?.slug || !post?.title) return null;

  return {
    title: `${post.title} | Comvaga`,
    description: post.description,
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
