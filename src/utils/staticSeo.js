import { PUBLIC_ORIGIN } from './businessSeoMetadata.js';

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
};

export const STATIC_SEO = Object.freeze(Object.fromEntries(
  Object.entries(pages).map(([path, metadata]) => [path, Object.freeze({
    ...metadata,
    canonical: `${PUBLIC_ORIGIN}${path}`,
    image: `${PUBLIC_ORIGIN}/Comvaga%20Logo.png`,
    imageAlt: 'Logo da Comvaga',
  })]),
));
