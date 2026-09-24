import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronRight, X } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import BookingCalendar from '../components/BookingCalendar';
import { CalendarIcon } from '../components/icons';
import AppFooter from '../components/AppFooter';
import { ptBR } from '../feedback/messages/ptBR';
import { useBusinessGroup } from '../businessTerms';
import { getPublicUrl } from './vitrine/api/vitrineApi';
import { useVitrineBootstrap } from './vitrine/hooks/useVitrineBootstrap';
import { useVitrineBooking } from './vitrine/hooks/useVitrineBooking';
import { useVitrineInteractions } from './vitrine/hooks/useVitrineInteractions';
import { useVitrinePresentation } from './vitrine/hooks/useVitrinePresentation';
import BookingConfirmedModal from './vitrine/components/BookingConfirmedModal';
import VitrineDepoimentosSection from './vitrine/sections/VitrineDepoimentosSection';
import VitrineEntregasSection from './vitrine/sections/VitrineEntregasSection';
import VitrineGallerySection from './vitrine/sections/VitrineGallerySection';
import VitrineProfessionalsSection from './vitrine/sections/VitrineProfessionalsSection';
import VitrineTopSection from './vitrine/sections/VitrineTopSection';

const NOW_RPC_SEQUENCE = ['now_sp', 'now_sp_fallback'];

function formatDateBR(ymd) {
  if (!ymd) return '';
  const [y, m, d] = String(ymd).split('-');
  if (!y || !m || !d) return String(ymd);
  return `${d}.${m}.${y}`;
}

function getDowFromDateSP(dateStr) {
  if (!dateStr) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr).trim());
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).getUTCDay();
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function parseSaoPauloDateTime(dateISO, timeValue) {
  const normalizedTime = String(timeValue || '00:00').slice(0, 5);
  return new Date(`${dateISO}T${normalizedTime}:00-03:00`);
}

function formatUtcCalendarDate(date) {
  return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`;
}

function escapeIcsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function slugifyFilePart(value) {
  return String(value || 'evento')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'evento';
}

function getCalendarPlatformMode() {
  if (typeof navigator === 'undefined') return 'chooser';
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const isAndroid = /Android/i.test(ua);
  const isIPhone = /iPhone/i.test(ua);
  const isIPad = /iPad/i.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
  const isMac = /Mac/i.test(platform) && maxTouchPoints <= 1;

  if (isAndroid) return 'google-with-fallback';
  if (isIPhone || isIPad || isMac) return 'ics';
  return 'ics';
}

function getCalendarEndDate(dataISO, inicioHHMM, fimHHMM, duracaoMin) {
  const inicio = parseSaoPauloDateTime(dataISO, inicioHHMM);
  if (fimHHMM) return parseSaoPauloDateTime(dataISO, fimHHMM);
  return new Date(inicio.getTime() + duracaoMin * 60000);
}

function gerarLinkGoogle({ titulo, dataISO, inicioHHMM, fimHHMM, duracaoMin, detalhes, local }) {
  const inicio = parseSaoPauloDateTime(dataISO, inicioHHMM);
  const fim = getCalendarEndDate(dataISO, inicioHHMM, fimHHMM, duracaoMin);
  const details = [detalhes, local ? `Local: ${local}` : ''].filter(Boolean).join('\n');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titulo)}&dates=${formatUtcCalendarDate(inicio)}/${formatUtcCalendarDate(fim)}&ctz=America%2FSao_Paulo&details=${encodeURIComponent(details)}&location=${encodeURIComponent(local || '')}&sf=true&output=xml`;
}

function gerarArquivoICS({ titulo, dataISO, inicioHHMM, fimHHMM, duracaoMin, detalhes, local, uidSeed }) {
  const inicio = parseSaoPauloDateTime(dataISO, inicioHHMM);
  const fim = getCalendarEndDate(dataISO, inicioHHMM, fimHHMM, duracaoMin);
  const dtStamp = formatUtcCalendarDate(new Date());
  const dtStart = formatUtcCalendarDate(inicio);
  const dtEnd = formatUtcCalendarDate(fim);
  const uid = `${slugifyFilePart(uidSeed || titulo)}-${dtStart}@comvaga`;
  const content = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Comvaga//Agenda//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(titulo)}`,
    `DESCRIPTION:${escapeIcsText(detalhes)}`,
    `LOCATION:${escapeIcsText(local)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete de agendamento',
    'TRIGGER:-PT30M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return {
    content,
    filename: `${slugifyFilePart(titulo)}-${String(dataISO || '').replace(/-/g, '')}.ics`,
  };
}

function resolveInstagram(instaRaw) {
  const raw = String(instaRaw || '').trim();
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const handle = raw.replace(/^@/, '').replace(/\s+/g, '');
  return handle ? `https://instagram.com/${handle}` : null;
}

function resolveFacebook(fbRaw) {
  const raw = String(fbRaw || '').trim();
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const handle = raw.replace(/^@/, '').replace(/\s+/g, '');
  return handle ? `https://facebook.com/${handle}` : null;
}

function getPrecoFinalEntrega(s) {
  const preco = Number(s?.preco ?? 0);
  const promo = Number(s?.preco_promocional ?? 0);
  const temPromo = Number.isFinite(promo) && promo > 0 && promo < preco;
  return temPromo ? promo : preco;
}

function sanitizeTel(raw) {
  const v = String(raw || '').trim();
  if (!v) return '';
  return v.replace(/[^\d+]/g, '');
}

function buildMetaDescription(negocio) {
  const nome = String(negocio?.nome || '').trim() || 'este negócio';
  const descricao = String(negocio?.descricao || '').replace(/\s+/g, ' ').trim();
  const base = descricao || `Agende horários, veja trabalhos, profissionais e depoimentos de ${nome}.`;
  return base.length > 160 ? `${base.slice(0, 157).trim()}...` : base;
}

function setMetaTag(name, content) {
  if (typeof document === 'undefined') return;
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function isRateLimitError(error) {
  const raw = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return raw.includes('rate_limit_exceeded') || raw.includes('limite diário') || raw.includes('too many requests');
}

function AlertModal({ open, onClose, title, body, buttonText, isLight }) {
  if (!open) return null;
  const bg = isLight ? 'bg-vcard border-vborder' : 'bg-dark-100 border-gray-800';
  const titleCl = isLight ? 'text-vtext' : 'text-white';
  const bodyCl = isLight ? 'text-vsub' : 'text-gray-300';
  const closeCl = isLight ? 'text-vmuted hover:text-vtext' : 'text-gray-400 hover:text-white';
  const btnCl = isLight ? 'bg-vprimary text-vprimary-text hover:opacity-90' : 'bg-gradient-to-r from-primary to-yellow-600 text-black';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className={`border rounded-custom max-w-md w-full p-6 ${bg}`}>
        <div className="flex justify-between items-start gap-3 mb-3">
          <h3 className={`text-xl font-normal ${titleCl}`}>{title}</h3>
          <button type="button" onClick={onClose} className={closeCl}><X className="w-6 h-6" /></button>
        </div>
        {body && <p className={`font-normal whitespace-pre-line ${bodyCl}`}>{body}</p>}
        <button type="button" onClick={onClose} className={`mt-5 w-full py-3 rounded-button uppercase font-normal transition-colors ${btnCl}`}>
          {buttonText || 'OK'}
        </button>
      </div>
    </div>
  );
}

function ConfirmModal({ open, onCancel, onConfirm, title, body, confirmText, cancelText, isLight }) {
  if (!open) return null;
  const bg = isLight ? 'bg-vcard border-vborder' : 'bg-dark-100 border-gray-800';
  const titleCl = isLight ? 'text-vtext' : 'text-white';
  const bodyCl = isLight ? 'text-vsub' : 'text-gray-300';
  const closeCl = isLight ? 'text-vmuted hover:text-vtext' : 'text-gray-400 hover:text-white';
  const cancelCl = isLight ? 'bg-vcard2 border-vborder text-vsub hover:border-vprimary hover:text-vtext' : 'bg-dark-200 border-gray-800 text-gray-200';
  const confirmCl = isLight ? 'bg-vprimary text-vprimary-text hover:opacity-90' : 'bg-gradient-to-r from-primary to-yellow-600 text-black';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className={`border rounded-custom max-w-md w-full p-6 ${bg}`}>
        <div className="flex justify-between items-start gap-3 mb-3">
          <h3 className={`text-xl font-normal ${titleCl}`}>{title}</h3>
          <button type="button" onClick={onCancel} className={closeCl}><X className="w-6 h-6" /></button>
        </div>
        {body && <p className={`font-normal whitespace-pre-line ${bodyCl}`}>{body}</p>}
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onCancel} className={`flex-1 py-3 border rounded-button uppercase font-normal transition-colors ${cancelCl}`}>{cancelText || 'CANCELAR'}</button>
          <button type="button" onClick={onConfirm} className={`flex-1 py-3 rounded-button uppercase font-normal transition-colors ${confirmCl}`}>{confirmText || 'CONFIRMAR'}</button>
        </div>
      </div>
    </div>
  );
}

function SelectionBar({ itens, counterSingular, counterPlural, onConfirm, onClear, isLight }) {
  const qtd = itens.length;
  if (qtd === 0) return null;
  const durTotal = itens.reduce((sum, x) => sum + Number(x.duracao_minutos || 0), 0);
  const valTotal = itens.reduce((sum, x) => sum + getPrecoFinalEntrega(x), 0);
  const label = qtd === 1 ? counterSingular : counterPlural;
  const textMain = isLight ? 'text-vtext' : 'text-white';
  const textSub = isLight ? 'text-vsub' : 'text-gray-500';
  const clearBtn = isLight ? 'text-vmuted hover:text-vtext' : 'text-gray-600 hover:text-gray-400';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] vitrine-selection-bar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-vprimary flex items-center justify-center text-vprimary-text text-xs font-normal shrink-0 tabular-nums">{qtd}</div>
          <div className="min-w-0">
            <div className={`text-sm font-normal truncate ${textMain}`}>{qtd} {label} SELECIONADO{qtd > 1 ? 's' : ''}</div>
            <div className={`text-xs font-normal ${textSub}`}>{durTotal} MIN • R$ {valTotal.toFixed(2)}</div>
          </div>
          <button type="button" onClick={onClear} className={`shrink-0 ml-1 ${clearBtn}`} title="Limpar"><X className="w-4 h-4" /></button>
        </div>
        <button type="button" onClick={onConfirm} className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-vprimary text-vprimary-text rounded-full text-sm font-normal uppercase whitespace-nowrap transition-opacity hover:opacity-80">
          <CalendarIcon className="w-4 h-4" />
          Escolher data
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function Vitrine({ user, userType, professionalRole = null, onLogout }) {
  const { slug } = useParams();
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
  });

  const businessGroup = useBusinessGroup(negocio?.tipo_negocio);
  const bizV = vitrineMsgs?.business || {};
  const sectionTitle = bizV?.section_title?.[businessGroup] ?? 'Servs';
  const counterSingular = ptBR?.vitrine?.business?.counter_singular?.[businessGroup] ?? 'SERV.';
  const counterPlural = ptBR?.vitrine?.business?.counter_plural?.[businessGroup] ?? 'SERVS';
  const emptyListMsg = ptBR?.vitrine?.business?.empty_list?.[businessGroup] ?? ':(';
  const loadMoreErrorMsg = ptBR?.vitrine?.business?.load_more_error?.[businessGroup] ?? 'Erro ao carregar mais itens. Tente novamente.';

  const [nativeAlertOpen, setNativeAlertOpen] = useState(false);
  const [nativeAlertData, setNativeAlertData] = useState({ title: '', body: '', buttonText: 'OK' });
  const [nativeConfirmOpen, setNativeConfirmOpen] = useState(false);
  const [nativeConfirmData, setNativeConfirmData] = useState({ title: '', body: '', confirmText: 'CONFIRMAR', cancelText: 'CANCELAR' });
  const confirmResolverRef = useRef(null);

  const [depoimentoNota, setDepoimentoNota] = useState(5);
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
    if (!user) return;
    fetchNowFromDb().catch(() => {});
  }, [user, fetchNowFromDb]);

  useEffect(() => {
    if (user && negocio?.id) checkFavorito();
  }, [checkFavorito, negocio?.id, user]);

  const toggleFavorito = async () => {
    if (!user) {
      alertKey('favorite_need_login', 'Login necessário', 'Faça login para favoritar.', 'ENTENDI');
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
    if (userType !== 'client') {
      alertKey('depoimento_only_client', 'Acesso exclusivo', 'Apenas CLIENTE pode deixar depoimentos.', 'ENTENDI');
      return;
    }
    setDepoimentoNota(5);
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
    if (userType !== 'client') {
      alertKey('depoimento_only_client', 'Acesso exclusivo', 'Apenas CLIENTE pode deixar depoimentos.', 'ENTENDI');
      return;
    }
    if (!negocio?.id) {
      alertKey('depoimento_invalid_business', 'Negócio inválido', 'Negócio inválido.', 'ENTENDI');
      return;
    }
    try {
      const ok = await enviarDepoimentoState();
      if (!ok) return;
      setDepoimentoNota(5);
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
    const nome = String(negocio.nome).trim();
    document.title = `${nome} | Comvaga`;
    setMetaTag('description', buildMetaDescription(negocio));
  }, [negocio]);

  if (loading) return (<div className="min-h-screen bg-black flex items-center justify-center"><div className="text-primary text-2xl font-normal animate-pulse">CARREGANDO...</div></div>);
  if (error) return (<div className="min-h-screen bg-black flex items-center justify-center p-4"><div className="max-w-md w-full bg-dark-100 border border-red-500/40 rounded-custom p-8 text-center"><AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" /><h1 className="text-2xl font-normal text-white mb-2">Houve um erro ao carregar</h1><p className="text-gray-400 mb-6">{error}</p><button type="button" onClick={loadVitrine} className="w-full px-6 py-3 bg-primary/20 border border-primary/50 text-primary rounded-button font-normal uppercase">Tentar novamente</button></div></div>);
  if (!negocio) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-3xl font-normal text-white mb-6">Negócio inexistente.</h1>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-full border border-primary/40 bg-primary/10 px-6 py-3 text-sm font-normal uppercase tracking-wide text-primary transition-colors hover:border-primary hover:bg-primary/20 hover:text-yellow-500"
        >
          VOLTAR PARA HOME
        </Link>
      </div>
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
