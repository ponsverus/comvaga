import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import NotFound from './NotFound';
import BookingCalendar from '../components/BookingCalendar';
import AppFooter from '../components/AppFooter';
import { ptBR } from '../feedback/messages/ptBR';
import { useBusinessGroup } from '../businessTerms';
import { getPublicUrl } from './vitrine/api/vitrineApi';
import { isRateLimitError } from '../utils/errorUtils';
import { NOW_RPC_SEQUENCE } from '../utils/officialDate';
import { useVitrineBootstrap } from './vitrine/hooks/useVitrineBootstrap';
import { useVitrineBooking } from './vitrine/hooks/useVitrineBooking';
import { useVitrineInteractions } from './vitrine/hooks/useVitrineInteractions';
import { useVitrinePresentation, resolveInstagram, resolveFacebook } from './vitrine/hooks/useVitrinePresentation';
import BookingConfirmedModal from './vitrine/components/BookingConfirmedModal';
import VitrineDepoimentosSection from './vitrine/sections/VitrineDepoimentosSection';
import VitrineEntregasSection from './vitrine/sections/VitrineEntregasSection';
import VitrineGallerySection from './vitrine/sections/VitrineGallerySection';
import VitrineProfessionalsSection from './vitrine/sections/VitrineProfessionalsSection.js';
import VitrineTopSection from './vitrine/sections/VitrineTopSection.js';
import { applyMetadata, applyBusinessMetadataWithImage, buildBusinessMetadata, businessLogoUrl } from '../utils/seoMetadata.js';
import { applyBusinessStructuredData } from '../utils/businessSeo.js';
import PublicBusinessPreview from '../components/PublicBusinessPreview.js';
import BusinessGroupNotice from '../components/BusinessGroupNotice';
import { AlertModal, ConfirmModal, SelectionBar } from './vitrine/components/VitrineOverlays';
import {
  formatDateBR,
  getDowFromDateSP,
  getCalendarPlatformMode,
  gerarLinkGoogle,
  gerarArquivoICS,
  getPrecoFinalEntrega,
  sanitizeTel,
} from './vitrine/utils';

export default function Vitrine({ user, userType, professionalRole = null, onLogout, initialBusiness = null }) {
  const { slug } = useParams();
  const initial = initialBusiness?.slug === slug ? initialBusiness : null;
  const navigate = useNavigate();
  const location = useLocation();
  const vitrineMsgs = useMemo(() => ptBR?.vitrine || {}, []);
  const getMsg = useCallback((key, fallback) => vitrineMsgs?.[key] || fallback, [vitrineMsgs]);

  const {
    negocio,
    profissionais,
    entregas,
    entregaPagesByProf,
    depoimentos,
    depoimentosHasMore,
    depoimentosLoadingMore,
    galeriaItems,
    galeriaHasMore,
    galeriaLoadingMore,
    billingStatus,
    loading,
    error,
    serverNow,
    clockUnavailable,
    fetchNowFromDb,
    refreshDepoimentos,
    loadMoreDepoimentos,
    loadMoreGaleria,
    loadEntregasPage,
    loadVitrine,
  } = useVitrineBootstrap({
    slug,
    rpcSequence: NOW_RPC_SEQUENCE,
    getMsg,
    authUserId: user?.id || null,
    initialBusiness: initial,
  });

  const { group: businessGroup, status: businessGroupStatus, retry: retryBusinessGroup } =
    useBusinessGroup(negocio?.tipo_negocio, negocio?.business_group, negocio?.id);
  const bizV = vitrineMsgs?.business || {};
  const sectionTitle = bizV?.section_title?.[businessGroup] ?? '';
  const counterSingular = ptBR?.vitrine?.business?.counter_singular?.[businessGroup] ?? '';
  const counterPlural = ptBR?.vitrine?.business?.counter_plural?.[businessGroup] ?? '';
  const emptyListMsg = ptBR?.vitrine?.business?.empty_list?.[businessGroup] ?? ':(';
  const loadMoreErrorMsg = ptBR?.vitrine?.business?.load_more_error?.[businessGroup] ?? 'Erro ao carregar mais itens. Tente novamente.';

  const [nativeAlertOpen, setNativeAlertOpen] = useState(false);
  const [nativeAlertData, setNativeAlertData] = useState({ title: '', body: '', buttonText: 'OK' });
  const [nativeConfirmOpen, setNativeConfirmOpen] = useState(false);
  const [nativeConfirmData, setNativeConfirmData] = useState({ title: '', body: '', confirmText: 'CONFIRMAR', cancelText: 'CANCELAR' });
  const confirmResolverRef = useRef(null);

  const [depoimentoNota, setDepoimentoNota] = useState(0);
  const [depoimentoTexto, setDepoimentoTexto] = useState('');
  const reviewFormRef = useRef(null);

  const closeAlert = () => setNativeAlertOpen(false);

  const openAlert = ({ title, body, buttonText }) => {
    setNativeAlertData({
      title: title || getMsg('generic_title', 'Aviso'),
      body: body || '',
      buttonText: buttonText || 'OK',
    });
    setNativeAlertOpen(true);
  };

  const alertKey = (key, fallbackTitle, fallbackBody, fallbackBtn = 'OK') => {
    const m = vitrineMsgs?.[key];
    if (m && typeof m === 'object') {
      openAlert({
        title: m.title || fallbackTitle || getMsg('generic_title', 'Aviso'),
        body: m.body || fallbackBody || '',
        buttonText: m.buttonText || fallbackBtn || 'OK',
      });
      return;
    }
    openAlert({ title: fallbackTitle || getMsg('generic_title', 'Aviso'), body: fallbackBody || '', buttonText: fallbackBtn || 'OK' });
  };

  const handleEntregasPageError = () => {
    openAlert({
      title: 'Erro ao carregar',
      body: loadMoreErrorMsg,
      buttonText: 'OK',
    });
  };

  const handleDepoimentosLoadMoreError = () => {
    alertKey('depoimentos_load_more_error', 'Erro ao carregar', 'Erro ao carregar mais depoimentos. Tente novamente.', 'OK');
  };

  const confirmKey = (key, fallbackTitle, fallbackBody, fallbackConfirm = 'CONFIRMAR', fallbackCancel = 'CANCELAR') => (
    new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      const m = vitrineMsgs?.[key];
      setNativeConfirmData({
        title: (m && m.title) ? m.title : (fallbackTitle || getMsg('generic_title', 'Confirmar')),
        body: (m && m.body) ? m.body : (fallbackBody || ''),
        confirmText: (m && m.confirmText) ? m.confirmText : fallbackConfirm,
        cancelText: (m && m.cancelText) ? m.cancelText : fallbackCancel,
      });
      setNativeConfirmOpen(true);
    })
  );

  const closeConfirm = (value) => {
    setNativeConfirmOpen(false);
    const r = confirmResolverRef.current;
    confirmResolverRef.current = null;
    if (typeof r === 'function') r(!!value);
  };

  const isProfessional = user && userType === 'professional';
  const calendarPlatformMode = useMemo(() => getCalendarPlatformMode(), []);

  const {
    isFavorito,
    favoritoLoading,
    depoimentoLoading,
    checkFavorito,
    toggleFavorito: toggleFavoritoState,
    enviarDepoimento: enviarDepoimentoState,
  } = useVitrineInteractions({
    user,
    userType,
    negocioId: negocio?.id,
    depoimentoNota,
    depoimentoTexto,
    refreshDepoimentos,
  });

  useEffect(() => {
    if (user && negocio?.id) checkFavorito();
  }, [checkFavorito, negocio?.id, user]);

  const toggleFavorito = async () => {
    if (!user) {
      alertKey('favorite_need_login', 'Login necessário', 'Faça login para favoritar.', 'ENTENDI');
      return;
    }
    if (!userType) {
      alertKey('profile_unconfirmed');
      return;
    }
    if (userType !== 'client') {
      alertKey('favorite_only_client', 'Acesso exclusivo', 'Apenas CLIENTE pode favoritar negócios.', 'ENTENDI');
      return;
    }
    if (!negocio?.id) {
      alertKey('favorite_invalid_business', 'Negócio inválido', 'Negócio inválido.', 'ENTENDI');
      return;
    }
    try {
      await toggleFavoritoState();
    } catch {
      alertKey('favorite_toggle_error', 'Erro', 'Erro ao favoritar. Tente novamente.', 'OK');
    }
  };

  const abrirDepoimento = async () => {
    if (!user) {
      const ok = await confirmKey(
        'depoimento_need_login_confirm',
        'Login necessário',
        'Você precisa fazer login para deixar um depoimento. Deseja fazer login agora?',
        'IR PARA LOGIN',
        'MAIS TARDE'
      );
      if (ok) navigate('/login');
      return;
    }
    if (!userType) {
      alertKey('profile_unconfirmed');
      return;
    }
    if (userType !== 'client') {
      alertKey('depoimento_only_client', 'Acesso exclusivo', 'Apenas CLIENTE pode deixar depoimentos.', 'ENTENDI');
      return;
    }
    setDepoimentoNota(0);
    setDepoimentoTexto('');
    reviewFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const enviarDepoimento = async () => {
    if (!user) {
      const ok = await confirmKey(
        'depoimento_need_login_confirm',
        'Login necessário',
        'Você precisa fazer login para deixar um depoimento. Deseja fazer login agora?',
        'IR PARA LOGIN',
        'MAIS TARDE'
      );
      if (ok) navigate('/login');
      return;
    }
    if (!userType) {
      alertKey('profile_unconfirmed');
      return;
    }
    if (userType !== 'client') {
      alertKey('depoimento_only_client', 'Acesso exclusivo', 'Apenas CLIENTE pode deixar depoimentos.', 'ENTENDI');
      return;
    }
    if (!negocio?.id) {
      alertKey('depoimento_invalid_business', 'Negócio inválido', 'Negócio inválido.', 'ENTENDI');
      return;
    }
    if (!Number.isInteger(depoimentoNota) || depoimentoNota < 1 || depoimentoNota > 5) return;
    try {
      const ok = await enviarDepoimentoState();
      if (!ok) return;
      setDepoimentoNota(0);
      setDepoimentoTexto('');
      alertKey('depoimento_sent', 'Depoimento registrado', 'Seu depoimento foi entregue com sucesso!', 'OK');
    } catch (e) {
      if (isRateLimitError(e)) {
        alertKey('depoimento_rate_limit', 'Limite de depoimentos atingido', 'Você já enviou muitos depoimentos hoje.\n\nTente novamente amanhã.', 'ENTENDI');
        return;
      }
      console.error('Vitrine review send error:', e);
      openAlert({
        title: getMsg('depoimento_send_error_title', 'Erro ao enviar depoimento'),
        body: getMsg('depoimento_send_error_body', 'Tente novamente em instantes.'),
        buttonText: getMsg('common_ok', 'ENTENDI'),
      });
    }
  };

  const nomeNegocioLabel = String(negocio?.nome || '').trim() || 'NEGÓCIO';
  const {
    flow,
    hasSelecao,
    entregasSelecionadas,
    entregaVirtual,
    calendarActionConfig,
    handleConfirmarSelecao,
    handleLimparSelecao,
    handleBookingConfirm,
    closeBooking,
    bookingSectionState,
  } = useVitrineBooking({
    user,
    userType,
    todayISO: serverNow.date,
    fetchNowFromDb,
    confirmKey,
    alertKey,
    navigate,
    location,
    loading,
    negocio,
    nomeNegocioLabel,
    profissionais,
    entregas,
    counterPlural,
    getPrecoFinalEntrega,
    gerarLinkGoogle,
    gerarArquivoICS,
    calendarPlatformMode,
    billingStatus,
  });

  const {
    logoUrl,
    instagramUrl,
    facebookUrl,
    depoimentosView,
    profissionaisView,
    entregaCards,
    galeriaView,
    mediaDepoimentos,
    temaAtivo,
    isLight,
    styles,
  } = useVitrinePresentation({
    negocio,
    profissionais,
    entregas,
    entregaPagesByProf,
    depoimentos,
    galeriaItems,
    isProfessional,
    isFavorito,
    depoimentoNota,
    serverNow,
    getPublicUrl,
    getPrecoFinalEntrega,
    getDowFromDateSP,
    resolveInstagram,
    resolveFacebook,
  });

  useEffect(() => {
    if (!negocio?.nome) return;
    const candidate = businessLogoUrl(negocio.logo_path, import.meta.env.VITE_SUPABASE_URL);
    return applyBusinessMetadataWithImage(buildBusinessMetadata(negocio, entregas, candidate), candidate, {
      applyMetadata: (metadata) => {
        const restoreMetadata = applyMetadata(metadata);
        const removeSchema = applyBusinessStructuredData(negocio, metadata.image);
        return () => { restoreMetadata(); removeSchema(); };
      },
    });
  }, [negocio, entregas]);

  if (loading && initial) return <PublicBusinessPreview business={initial} />;
  if (loading) return (<div className="min-h-screen bg-black flex items-center justify-center"><div className="text-primary text-2xl font-normal animate-pulse">CARREGANDO...</div></div>);
  if (error) return (<div className="min-h-screen bg-black flex items-center justify-center p-4"><div className="max-w-md w-full bg-dark-100 border border-red-500/40 rounded-custom p-8 text-center"><AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" /><h1 className="text-2xl font-normal text-white mb-2">Houve um erro ao carregar</h1><p className="text-gray-400 mb-6">{error}</p><button type="button" onClick={loadVitrine} className="w-full px-6 py-3 bg-primary/20 border border-primary/50 text-primary rounded-button font-normal uppercase">Tentar novamente</button></div></div>);
  if (!negocio) return <NotFound />;
  if (!businessGroup) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <BusinessGroupNotice status={businessGroupStatus} onRetry={retryBusinessGroup} />
    </div>
  );

  return (
    <div className={`min-h-screen bg-vbg text-vtext${isLight ? ' vitrine-light' : ''}${hasSelecao ? ' pb-[72px]' : ''}`}>
      <AlertModal open={nativeAlertOpen} onClose={closeAlert} title={nativeAlertData.title} body={nativeAlertData.body} buttonText={nativeAlertData.buttonText} isLight={isLight} />
      <ConfirmModal open={nativeConfirmOpen} onCancel={() => closeConfirm(false)} onConfirm={() => closeConfirm(true)} title={nativeConfirmData.title} body={nativeConfirmData.body} confirmText={nativeConfirmData.confirmText} cancelText={nativeConfirmData.cancelText} isLight={isLight} />

      <VitrineTopSection
        header={{
          backClass: styles.headerVoltar,
          depoimentoBtn: styles.depoimentoBtn,
          favoritoBtn: styles.favoritoBtn,
          isFavorito,
          favoritoLoading,
          isProfessional,
          heroBg: styles.heroBg,
        }}
        business={{
          negocio,
          logoUrl,
          mediaDepoimentos,
          isLight,
          mediaColor: styles.mediaColor,
          addrClass: styles.addrClass,
          telClass: styles.telClass,
          socialIconCl: styles.socialIconCl,
          instagramUrl,
          facebookUrl,
        }}
        actions={{
          onBack: () => navigate(-1),
          onAbrirDepoimento: abrirDepoimento,
          onToggleFavorito: toggleFavorito,
          sanitizeTel,
        }}
      />

      <VitrineProfessionalsSection
        cards={profissionaisView}
        counterSingular={counterSingular}
        counterPlural={counterPlural}
      />

      <VitrineEntregasSection
        cards={entregaCards}
        sectionTitle={sectionTitle}
        emptyListMsg={emptyListMsg}
        counterSingular={counterSingular}
        counterPlural={counterPlural}
        onLoadPage={loadEntregasPage}
        onLoadPageError={handleEntregasPageError}
        booking={{
          ...bookingSectionState,
          isProfessional: isProfessional && !bookingSectionState.isAssistedBooking,
          isLight,
        }}
      />

      <VitrineGallerySection
        items={galeriaView}
        hasMore={galeriaHasMore}
        loadingMore={galeriaLoadingMore}
        onLoadMore={loadMoreGaleria}
      />

      <VitrineDepoimentosSection
        isProfessional={isProfessional}
        depoimentos={depoimentosView}
        nomeNegocioLabel={nomeNegocioLabel}
        isLight={isLight}
        reviewRef={reviewFormRef}
        reviewState={{
          nota: depoimentoNota,
          texto: depoimentoTexto,
          loading: depoimentoLoading,
        }}
        reviewActions={{
          setNota: setDepoimentoNota,
          setTexto: setDepoimentoTexto,
          onEnviar: enviarDepoimento,
        }}
        pagination={{
          hasMore: depoimentosHasMore,
          loadingMore: depoimentosLoadingMore,
          onLoadMore: loadMoreDepoimentos,
          onLoadMoreError: handleDepoimentosLoadMoreError,
        }}
      />

      <SelectionBar itens={entregasSelecionadas} counterSingular={counterSingular} counterPlural={counterPlural} onConfirm={handleConfirmarSelecao} onClear={handleLimparSelecao} isLight={isLight} />

      {flow.step === 'booking' && entregaVirtual && (
        <BookingCalendar
          profissional={flow.profissional}
          entrega={entregaVirtual}
          todayISO={serverNow.date}
          officialTimeUnavailable={clockUnavailable}
          onRetryOfficialTime={fetchNowFromDb}
          negocioId={negocio.id}
          actorUserId={user?.id}
          assistedClienteId={bookingSectionState.isAssistedBooking ? bookingSectionState.assistedClienteId : null}
          assistedBooking={bookingSectionState.isAssistedBooking}
          onConfirm={handleBookingConfirm}
          onClose={closeBooking}
          temaAtivo={temaAtivo}
        />
      )}

      <BookingConfirmedModal
        open={flow.step === 'confirmado'}
        booking={flow}
        styles={{
          bg: styles.confirmadoBg,
          title: styles.confirmadoTitle,
          hora: styles.confirmadoHora,
          data: styles.confirmadoData,
          sub: styles.confirmadoSub,
          actionBtn: styles.confirmadoAgBtn,
          box: isLight ? 'bg-[#f8f2eb] border-[#ccb59f]' : 'bg-white/5 border-white/10',
          hint: isLight ? 'text-[#9a6c4c]' : 'text-[#c7b19c]',
          secondaryBtn: isLight ? 'border-[#c6a98d] text-[#4a2f1d] hover:bg-[#ead9c9]' : 'border-white/15 text-white hover:bg-white/8',
        }}
        calendarActionConfig={calendarActionConfig}
        formatDateBR={formatDateBR}
        onClose={closeBooking}
        navigate={navigate}
        assistedBooking={bookingSectionState.isAssistedBooking}
        assistedReturnTo={bookingSectionState.assistedReturnTo}
        negocioId={negocio.id}
      />


      <AppFooter userType={userType} professionalRole={professionalRole} onLogout={onLogout} />
    </div>
  );
}
