import { PUBLIC_ORIGIN } from './seoMetadata.js';
import { HOME_PLANS } from '../data/homePlans.js';
import { COMVAGA_ORGANIZATION } from './comvagaOrganization.js';

export const HOME_SCHEMA_ID = 'comvaga-home-schema';
const HOME_APPLICATION_NAME = 'Comvaga';
const HOME_APPLICATION_DESCRIPTION = 'Plataforma web de agendamento para negócios de atendimento por horário, com recursos para organizar profissionais, trabalhos, clientes e disponibilidade.';

export function buildHomeStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${PUBLIC_ORIGIN}/#software`,
    name: HOME_APPLICATION_NAME,
    url: PUBLIC_ORIGIN,
    description: HOME_APPLICATION_DESCRIPTION,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: HOME_PLANS.map((plan) => ({
      '@type': 'Offer',
      name: `Plano ${plan.name} (mensal)`,
      price: (plan.priceCents / 100).toFixed(2),
      priceCurrency: 'BRL',
      url: `${PUBLIC_ORIGIN}/cadastro/profissional?plano=${plan.code}`,
    })),
    publisher: COMVAGA_ORGANIZATION,
  };
}
