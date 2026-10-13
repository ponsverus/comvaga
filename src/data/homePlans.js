export const HOME_PLANS = [
  {
    code: 'essencial',
    name: 'Essencial',
    capacity: '1 profissional',
    priceCents: 6999,
    oldPriceCents: null,
    badge: null,
  },
  {
    code: 'profissional',
    name: 'Profissional',
    capacity: 'Até 3 profissionais',
    priceCents: 6999,
    oldPriceCents: 9999,
    badge: 'OFERTA',
  },
  {
    code: 'premium',
    name: 'Premium',
    capacity: 'Até 9 profissionais',
    priceCents: 12999,
    oldPriceCents: null,
    badge: null,
  },
];

export function formatHomePlanPrice(priceCents) {
  return `R$ ${(priceCents / 100).toFixed(2).replace('.', ',')}`;
}
