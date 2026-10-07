import { createElement as h } from 'react';
import { DEFAULT_SEO_IMAGE } from '../utils/businessSeoMetadata.js';
import { ptBR } from '../feedback/messages/ptBR.js';
import VitrineTopSection from '../pages/vitrine/sections/VitrineTopSection.js';
import VitrineProfessionalsSection from '../pages/vitrine/sections/VitrineProfessionalsSection.js';
import {
  buildVitrineProfessionalCard, getVitrineTopStyles, resolveInstagram, resolveFacebook,
} from '../pages/vitrine/hooks/useVitrinePresentation.js';

export default function PublicBusinessPreview({ business }) {
  const isLight = business.tema === 'light';
  const styles = getVitrineTopStyles({ isLight });
  const cards = (business.preview_professionals || []).map((prof) => buildVitrineProfessionalCard(prof, {
    todayDow: business.preview_today_dow,
    avatarUrl: prof.avatar_url,
    totalEntregas: prof.total_entregas,
    depInfo: prof.rating == null ? null : { media: Number(prof.rating).toFixed(1) },
  }));
  return h('div', {
    className: `min-h-screen bg-vbg text-vtext${isLight ? ' vitrine-light' : ''}`,
    'data-public-business-preview': business.slug,
  },
  h(VitrineTopSection, {
    header: {
      backClass: styles.headerVoltar, depoimentoBtn: styles.depoimentoBtn, favoritoBtn: styles.favoritoBtn,
      heroBg: styles.heroBg, loading: true,
    },
    business: {
      negocio: business,
      logoUrl: business.seo_image !== DEFAULT_SEO_IMAGE ? business.seo_image : null,
      mediaDepoimentos: Number(business.preview_rating || 0).toFixed(1),
      mediaColor: styles.mediaColor, addrClass: styles.addrClass, telClass: styles.telClass,
      socialIconCl: styles.socialIconCl,
      instagramUrl: resolveInstagram(business.instagram), facebookUrl: resolveFacebook(business.facebook),
    },
    actions: {
      onBack: () => globalThis.history?.back(),
      sanitizeTel: (phone) => String(phone || '').replace(/[^\d+]/g, ''),
    },
  }),
  h(VitrineProfessionalsSection, {
    cards,
    counterSingular: ptBR.vitrine.business.counter_singular[business.business_group] || '',
    counterPlural: ptBR.vitrine.business.counter_plural[business.business_group] || '',
  }));
}
