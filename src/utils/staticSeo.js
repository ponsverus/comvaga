import { PUBLIC_ORIGIN } from './seoMetadata.js';
import { BLOG_POSTS } from '../data/blogPosts/index.js';
import { buildBlogMetadata } from './blogSeo.js';

const staticPages = {
  '/': {
    metaTitle: 'Comvaga | Agenda inteligente e agendamento online',
    metaDescription: 'Organize agendas, profissionais e clientes com a Comvaga. Apresente seu negócio em uma vitrine pública e receba agendamentos online.',
  },
  '/sobre': {
    metaTitle: 'Sobre a Comvaga | Plataforma de agendamento online',
    metaDescription: 'Apresentamos a Comvaga, uma plataforma que reúne vitrine pública, agendamento online e controle de profissionais para negócios de atendimento por horário.',
  },
  '/termos': {
    metaTitle: 'Termos de Uso | Comvaga',
    metaDescription: 'Consulte os Termos de Uso da Comvaga: responsabilidades de clientes, negócios e profissionais, agendamentos, planos e uso da plataforma.',
  },
  '/privacidade': {
    metaTitle: 'Política de Privacidade | Comvaga',
    metaDescription: 'Saiba como a Comvaga coleta, utiliza e protege dados pessoais. Veja como funcionam o compartilhamento, o armazenamento e os seus direitos.',
  },
  '/blog': {
    metaTitle: 'Blog Comvaga | Agendamento online para organizar sua agenda',
    metaDescription: 'Guias rápidos da Comvaga para quem vive de agenda. Veja como organizar horários, equipe e clientes, escolher o sistema certo e aproveitar melhor cada atendimento.',
  },
};

const pages = Object.fromEntries(
  Object.entries(staticPages).map(([path, metadata]) => [path, {
    title: metadata.metaTitle,
    description: metadata.metaDescription,
  }]),
);

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
