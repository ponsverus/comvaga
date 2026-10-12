import { PUBLIC_ORIGIN } from './businessSeoMetadata.js';
import { BLOG_POSTS } from '../data/blogPosts.js';
import { buildBlogMetadata } from './blogSeo.js';

const pages = {
  '/': {
    title: 'Comvaga | Agenda inteligente e agendamento online',
    description: 'Organize agendas, profissionais e clientes com a Comvaga. Apresente seu negócio em uma vitrine pública e receba agendamentos online.',
  },
  '/sobre': {
    title: 'Sobre a Comvaga | Plataforma de agendamento online',
    description: 'Apresentamos a Comvaga, uma plataforma que reúne vitrine pública, agendamento online e controle de profissionais para negócios de atendimento por horário.',
  },
  '/termos': {
    title: 'Termos de Uso | Comvaga',
    description: 'Consulte os Termos de Uso da Comvaga: responsabilidades de clientes, negócios e profissionais, agendamentos, planos e uso da plataforma.',
  },
  '/privacidade': {
    title: 'Política de Privacidade | Comvaga',
    description: 'Saiba como a Comvaga coleta, utiliza e protege dados pessoais. Veja como funcionam o compartilhamento, o armazenamento e os seus direitos.',
  },
  '/blog': {
    title: 'Blog Comvaga | Agendamento online e controle de negócios',
    description: 'Guias rápidos sobre agendamento online, gerenciamento de profissionais, clientes e rotina de horários.',
  },
};

for (const post of BLOG_POSTS) {
  pages[`/blog/${post.slug}`] = buildBlogMetadata(post);
}

export const STATIC_SEO = Object.freeze(Object.fromEntries(
  Object.entries(pages).map(([path, metadata]) => [path, Object.freeze({
    ...metadata,
    canonical: metadata.canonical || `${PUBLIC_ORIGIN}${path}`,
    image: metadata.image || `${PUBLIC_ORIGIN}/Comvaga%20Logo.png`,
    imageAlt: metadata.imageAlt || 'Logo da Comvaga',
  })]),
));
