import { getSupportHref } from '../support';
import VitrineDepoimentosSection from '../pages/vitrine/sections/VitrineDepoimentosSection.jsx';
import HomeHeader from './home/HomeHeader.jsx';
import HomeHeroSection from './home/HomeHeroSection.jsx';
import HomeHowItWorksSection from './home/HomeHowItWorksSection.jsx';
import HomeBenefitsSection from './home/HomeBenefitsSection.jsx';
import HomeVitrineShowcaseSection from './home/HomeVitrineShowcaseSection.jsx';
import HomePlansSection from './home/HomePlansSection.jsx';
import HomeFinalCtaSection from './home/HomeFinalCtaSection.jsx';
import HomeFooter from './home/HomeFooter.jsx';

export default function HomePublicContent({
  SearchBoxComponent,
  searchOpen,
  setSearchOpen,
  searchTerm,
  setSearchTerm,
  resultadosBusca,
  setResultadosBusca,
  buscando,
  searchFailed,
  plansSectionRef,
  isLogged,
  loggedAreaLink,
  loggedAreaLabel,
  showProfessionalAccountLink,
  supportHref = getSupportHref(),
  handleLogoutClick,
  appReviews,
}) {
  return (
    <div className="min-h-screen bg-black text-white relative">
      <HomeHeader
        SearchBoxComponent={SearchBoxComponent}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        resultadosBusca={resultadosBusca}
        setResultadosBusca={setResultadosBusca}
        buscando={buscando}
        searchFailed={searchFailed}
      />
      <HomeHeroSection />
      <HomeHowItWorksSection />
      <HomeBenefitsSection />
      <HomeVitrineShowcaseSection />
      <HomePlansSection plansSectionRef={plansSectionRef} />
      <HomeFinalCtaSection />
      <VitrineDepoimentosSection
        isProfessional={false}
        title="Depoimentos sobre a Comvaga"
        depoimentos={appReviews?.items || []}
        rating={appReviews?.rating}
        nomeNegocioLabel="COMVAGA"
        isLight={false}
        reviewState={appReviews?.form}
        reviewActions={appReviews?.actions}
        pagination={appReviews?.pagination}
      />
      <HomeFooter
        isLogged={isLogged}
        loggedAreaLink={loggedAreaLink}
        loggedAreaLabel={loggedAreaLabel}
        showProfessionalAccountLink={showProfessionalAccountLink}
        supportHref={supportHref}
        handleLogoutClick={handleLogoutClick}
      />
    </div>
  );
}
