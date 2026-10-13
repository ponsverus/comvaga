import sistemaDeAgendamentoOnline from './sistema-de-agendamento-online.js';

export const BLOG_POSTS = [sistemaDeAgendamentoOnline];

export function getBlogPost(slug) {
  return BLOG_POSTS.find((post) => post.slug === slug) || null;
}
