import sistemaDeAgendamentoOnline from './sistema-de-agendamento-online.js';
import agendaOnlineParaBarbearia from './agenda-online-para-barbearia.js';

export const BLOG_POSTS = [sistemaDeAgendamentoOnline, agendaOnlineParaBarbearia];

export function getBlogPost(slug) {
  return BLOG_POSTS.find((post) => post.slug === slug) || null;
}
