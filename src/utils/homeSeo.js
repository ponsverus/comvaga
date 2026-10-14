import { PUBLIC_ORIGIN } from './seoMetadata.js';
import { HOME_PLANS } from '../data/homePlans.js';

export const HOME_SCHEMA_ID = 'comvaga-home-schema';

export function buildHomeStructuredData(metadata = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${PUBLIC_ORIGIN}/#software`,
    name: 'Comvaga',
    url: PUBLIC_ORIGIN,
    description: metadata.description || 'Plataforma inteligente de agendamento online.',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: HOME_PLANS.map((plan) => ({
      '@type': 'Offer',
      name: `Plano ${plan.name} (mensal)`,
      price: (plan.priceCents / 100).toFixed(2),
      priceCurrency: 'BRL',
      url: `${PUBLIC_ORIGIN}/cadastro/profissional?plano=${plan.code}`,
    })),
    publisher: {
      '@type': 'Organization',
      name: 'Comvaga',
      url: PUBLIC_ORIGIN,
    },
  };
}
