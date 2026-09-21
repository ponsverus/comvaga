import { ArrowLeft, Phone } from 'lucide-react';
import { CheckedIcon, ProfessionalIcon, LocationIcon } from '../../../components/icons';
import { formatPhoneForDisplay } from '../../../utils/phone';

function FacebookIcon({ className = '', size = 16 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon({ className = '', size = 16 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
      <path d="M16.5 7.5h.01" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function HeartIcon({ filled = false, className = '', size = 20 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function StarChar({ size = 18, className = '' }) {
  const sizeClass = size === 15 ? 'text-[15px]' : size === 16 ? 'text-base' : 'text-lg';
  return <span className={`${className || 'text-primary'} ${sizeClass} leading-none`} aria-hidden="true">★</span>;
}

export default function VitrineTopSection({ header, business, actions }) {
  return (
    <>
      <div className="bg-primary overflow-hidden relative h-10 flex items-center">
        <div className="announcement-bar-marquee flex whitespace-nowrap">
          <div className="flex animate-marquee-sync">
            <div className="flex items-center shrink-0">
              {[...Array(20)].map((_, i) => (
                <div key={`a-${i}`} className="flex items-center">
                  <span className="text-black font-normal text-sm uppercase mx-4">COMVAGA</span>
                  <span className="text-black text-sm">•</span>
                </div>
              ))}
            </div>
            <div className="flex items-center shrink-0" aria-hidden="true">
              {[...Array(20)].map((_, i) => (
                <div key={`b-${i}`} className="flex items-center">
                  <span className="text-black font-normal text-sm uppercase mx-4">COMVAGA</span>
                  <span className="text-black text-sm">•</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <header className="bg-vcard border-b border-vborder sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button type="button" onClick={actions.onBack} className={`flex items-center gap-2 transition-colors uppercase ${header.backClass}`}>
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Voltar</span>
            </button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={actions.onAbrirDepoimento} disabled={!!header.isProfessional} className={`flex items-center gap-2 h-9 px-5 rounded-button transition-all border uppercase focus:outline-none focus:ring-0 ${header.depoimentoBtn}`}>
                <StarChar size={18} className="text-primary" />
                <span className="hidden sm:inline">Depoimento</span>
              </button>
              <button type="button" onClick={actions.onToggleFavorito} disabled={!!header.isProfessional || !!header.favoritoLoading} className={`h-9 flex items-center gap-2 px-5 rounded-button transition-all uppercase border focus:outline-none focus:ring-0 disabled:opacity-60 ${header.favoritoBtn}`}>
                <HeartIcon filled={header.isFavorito} size={20} className={header.isFavorito ? 'text-red-500' : ''} />
                <span className="hidden sm:inline">{header.isProfessional ? 'Somente Cliente' : header.favoritoLoading ? 'Salvando' : (header.isFavorito ? 'Favoritado' : 'Favoritar')}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className={`relative py-12 sm:py-16 px-4 sm:px-6 lg:px-8 ${header.heroBg}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {business.logoUrl ? (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border border-vborder bg-vcard">
                <img src={business.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-vprimary rounded-full flex items-center justify-center text-vprimary-text">
                <ProfessionalIcon className="w-12 h-12 sm:w-14 sm:h-14" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-normal">{business.negocio.nome}</h1>
                <CheckedIcon title="Negócio verificado" className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 text-vprimary" />
              </div>
              <p className="text-base sm:text-lg text-vsub mb-4 font-normal">{business.negocio.descricao}</p>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-2">
                  <StarChar size={18} className="text-primary" />
                  <span className={`text-xl font-normal ${business.mediaColor}`}>{business.mediaDepoimentos}</span>
                </div>
                {business.negocio.endereco && (
                  <div className={`flex items-center gap-2 text-sm ${business.addrClass}`}>
                    <LocationIcon className="w-4 h-4 opacity-80" />
                    <span className="font-normal">{business.negocio.endereco}</span>
                  </div>
                )}
                {business.negocio.telefone && (
                  <a href={`tel:${actions.sanitizeTel(business.negocio.telefone) || business.negocio.telefone}`} className={`flex items-center gap-2 text-sm font-normal transition-colors ${business.telClass}`}>
                    <Phone className="w-4 h-4" strokeWidth={1.5} />
                    {formatPhoneForDisplay(business.negocio.telefone)}
                  </a>
                )}
                {(business.instagramUrl || business.facebookUrl) && (
                  <div className="flex items-center gap-2">
                    {business.instagramUrl && (
                      <a href={business.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram" className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all ${business.socialIconCl}`}>
                        <InstagramIcon className="w-[18px] h-[18px]" size={18} />
                      </a>
                    )}
                    {business.facebookUrl && (
                      <a href={business.facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook" className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all ${business.socialIconCl}`}>
                        <FacebookIcon size={18} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
