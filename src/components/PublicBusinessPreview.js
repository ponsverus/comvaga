import { createElement as h } from 'react';
import { DEFAULT_SEO_IMAGE } from '../utils/businessSeoMetadata.js';

const HIGHLIGHT_LABELS = {
  servicos: 'Trabalhos em destaque', consultas: 'Consultas em destaque', aulas: 'Aulas em destaque',
};

export default function PublicBusinessPreview({ business }) {
  const light = business.tema === 'light';
  const phone = String(business.telefone || '').replace(/[^\d+]/g, '');
  return h('main', {
    className: `min-h-screen bg-vbg text-vtext${light ? ' vitrine-light' : ''}`,
    'data-public-business-preview': business.slug,
  },
  h('header', { className: 'border-b border-vborder bg-vcard px-4 py-4 sm:px-6' },
    h('div', { className: 'mx-auto max-w-7xl' },
      h('a', { href: '/', className: 'text-sm uppercase text-vprimary' }, 'Comvaga'))),
  h('section', { className: 'mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16' },
    h('div', { className: 'flex flex-col items-start gap-6 sm:flex-row' },
      business.seo_image && business.seo_image !== DEFAULT_SEO_IMAGE
        ? h('img', { src: business.seo_image, alt: `Logo de ${business.nome}`, width: 96, height: 96,
          className: 'h-24 w-24 shrink-0 rounded-full object-cover' })
        : h('div', { className: 'flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-vprimary text-3xl text-vprimary-text', 'aria-hidden': true },
          Array.from(business.nome || 'Comvaga')[0]),
      h('div', { className: 'min-w-0 flex-1' },
        h('h1', { className: 'break-words text-3xl font-normal sm:text-4xl' }, business.nome),
        business.tipo_negocio && h('p', { className: 'mt-2 text-sm uppercase text-vmuted' }, business.tipo_negocio),
        business.descricao && h('p', { className: 'mt-4 whitespace-pre-line break-words text-base text-vsub sm:text-lg' }, business.descricao),
        business.endereco && h('p', { className: 'mt-4 break-words text-sm text-vsub' }, business.endereco),
        !business.endereco && business.endereco_cidade && h('p', { className: 'mt-4 text-sm text-vsub' },
          [business.endereco_cidade, business.endereco_estado].filter(Boolean).join(' - ')),
        phone && h('a', { href: `tel:${phone}`, className: 'mt-4 inline-block text-sm text-vprimary' }, business.telefone)))),
  business.seo_services.length > 0 && h('section', { className: 'border-t border-vborder bg-vcard2 px-4 py-8 sm:px-6' },
    h('div', { className: 'mx-auto max-w-7xl' },
      h('h2', { className: 'mb-4 text-2xl font-normal' }, HIGHLIGHT_LABELS[business.business_group] || HIGHLIGHT_LABELS.servicos),
      h('ul', { className: 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3' },
        ...business.seo_services.map(({ nome }) => h('li', {
          key: nome, className: 'break-words border-b border-vborder py-3 text-vsub',
        }, nome))))));
}
