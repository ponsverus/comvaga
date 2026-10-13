import { PUBLIC_ORIGIN } from './seoMetadata.js';

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
    publisher: {
      '@type': 'Organization',
      name: 'Comvaga',
      url: PUBLIC_ORIGIN,
    },
  };
}
