import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { CalendarIcon, ProfessionalIcon, TrendingUpIcon, UsersIcon } from '../components/icons';
import AppFooter from '../components/AppFooter';
import { Eye, LogOut, AlertCircle } from 'lucide-react';
import { formatPhoneForDisplay } from '../utils/phone';
import { NOW_RPC_SEQUENCE } from '../utils/officialDate';
import { useFeedback } from '../feedback/useFeedback';
import { useBusinessGroup } from '../businessTerms';
import BusinessGroupNotice from '../components/BusinessGroupNotice';
import EntregaModal from './dashboard/components/EntregaModal';
import ProfissionalModal from './dashboard/components/ProfissionalModal';
import DashboardAnnouncementBar from './dashboard/components/DashboardAnnouncementBar';
import { getDashboardAnnouncements } from './dashboard/Announcements';
import { DashboardTopCard, InfoPill, RevenueTrendBadge, TrendBadge } from './dashboard/components/DashboardTopCards';
import GeralSection from './dashboard/sections/GeralSection';
import AgendamentosSection from './dashboard/sections/AgendamentosSection';
import HistoricoSection from './dashboard/sections/HistoricoSection';
import ClientesSection from './dashboard/sections/ClientesSection';
import EntregasSection from './dashboard/sections/EntregasSection';
import ProfissionaisSection from './dashboard/sections/ProfissionaisSection';
import InfoNegocioSection from './dashboard/sections/InfoNegocioSection';
import PlanosSection from './dashboard/sections/PlanosSection';
import {
  DEFAULT_PROFISSIONAL_HORARIOS,
  SUPORTE_HREF,
  WEEKDAYS,
  compareAgendamentoDateTimeDesc,
  getBizLabel,
} from './dashboard/utils';
import { getPublicUrl } from './dashboard/api/dashboardApi';
import { useDashboardBootstrap } from './dashboard/hooks/useDashboardBootstrap';
import { useDashboardBillingStatus } from './dashboard/hooks/useDashboardBillingStatus';
import { useDashboardClientes } from './dashboard/hooks/useDashboardClientes';
import { useDashboardHistorico } from './dashboard/hooks/useDashboardHistorico';
import { useDashboardMetrics } from './dashboard/hooks/useDashboardMetrics';
import { useDashboardMutations } from './dashboard/hooks/useDashboardMutations';
import { useDashboardRealtime } from './dashboard/hooks/useDashboardRealtime';

function formatCurrency(value) {
  return `R$ ${Number(value || 0).toFixed(2)}`;
}

const BILLING_CHECKOUT_MESSAGE_KEYS = {
  success: 'dashboard.billing_checkout_success',
  cancel: 'dashboard.billing_checkout_cancel',
  expired: 'dashboard.billing_checkout_expired',
};

export default function Dashboard({ user, onLogout, userType = 'professional', professionalRole = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const feedback = useFeedback();

  const uiAlert   = useCallback(async (key, variant = 'info') => { if (feedback?.showMessage) return feedback.showMessage(key, { variant }); return Promise.resolve(); }, [feedback]);
  const uiConfirm = useCallback(async (key, variant = 'warning') => { if (feedback?.confirm) return !!(await feedback.confirm(key, { variant })); return false; }, [feedback]);

  const [activeTab, setActiveTab] = useState('agendamentos');
  const {
    parceiroProfissional,
    negocio,
    setNegocio,
    profissionais,
    profissionaisEquipe,
    entregas,
    entregaPagesByProf,
    agendamentos,
    agendamentosHasMore,
    agendamentosLoadingMore,
    galeriaItems,
    setGaleriaItems,
    galeriaHasMore,
    galeriaLoadingMore,
    ownerBusinessCount,
    bootstrapState,
    error,
    serverNow,
    clockUnavailable,
    hoje,
    reloadNegocio,
    reloadProfissionais,
    reloadEntregas,
    loadEntregasPage,
    reloadAgendamentos,
    loadMoreAgendamentos,
    loadMoreGaleria,
    reloadGaleria,
    reloadFull,
  } = useDashboardBootstrap({
    userId: user?.id,
    professionalRole,
    locationNegocioId: location?.state?.negocioId || null,
    navigate,
    rpcSequence: NOW_RPC_SEQUENCE,
    uiAlert,
  });
  const souDono = negocio?.owner_id === user?.id;
  const parceiroProfissionalId = parceiroProfissional?.id ?? null;
  const acessoDashboardAutorizado = souDono || !!parceiroProfissional;

  const {
    billingStatus,
    setBillingStatus,
    billingLoading,
    billingStatusLoadError,
    reloadBillingStatus,
  } = useDashboardBillingStatus({ negocio, souDono });

  const checarPermissao = useCallback(async (profissionalId) => {
    if (!acessoDashboardAutorizado) {
      await uiAlert('dashboard.parceiro_acao_proibida', 'warning');
      return false;
    }
    if (!parceiroProfissional) return true;
    if (parceiroProfissional.id === profissionalId) return true;
    await uiAlert('dashboard.parceiro_acao_proibida', 'warning');
    return false;
  }, [acessoDashboardAutorizado, parceiroProfissional, uiAlert]);

  const [faturamentoData, setFaturamentoData]             = useState('');
  const [faturamentoMes, setFaturamentoMes]             = useState('');
  const handleMetricsLoadError = useCallback(() => {
    uiAlert('dashboard.metrics_load_error', 'warning');
  }, [uiAlert]);
  const {
    metricsHoje,
    metricsTopCards,
    metricsDia,
    metricsPeriodoData,
    metricsUtilizacao,
    metricsFutureBookings,
    proximoAgendamento,
    metricsTopCardsLoading,
    metricsDiaLoading,
    metricsPeriodoLoading,
    metricsUtilizacaoLoading,
    metricsFutureBookingsLoading,
    loadOverview,
  } = useDashboardMetrics({
    negocioId: negocio?.id,
    hoje,
    faturamentoData,
    faturamentoMes,
    parceiroProfissionalId,
    onLoadError: handleMetricsLoadError,
  });

  const [showNovaEntrega, setShowNovaEntrega]       = useState(false);
  const [editingEntregaId, setEditingEntregaId]     = useState(null);

  const [formEntrega, setFormEntrega] = useState({ nome: '', duracao_minutos: '', preco: '', preco_promocional: '', profissional_id: '' });

  const [formInfo, setFormInfo] = useState({
    nome: '',
    descricao: '',
    meta_title: '',
    meta_description: '',
    telefone: '',
    endereco_cep: '',
    endereco_rua: '',
    endereco_numero: '',
    endereco_complemento: '',
    endereco_bairro: '',
    endereco_cidade: '',
    endereco_estado: '',
    instagram: '',
    facebook: '',
    tema: 'dark',
  });

  const [notifAgendamentos, setNotifAgendamentos] = useState(0);

  const [showEditProfissional, setShowEditProfissional]       = useState(false);
  const [editingProfissionalId, setEditingProfissionalId]     = useState(null);
  const [formProfissional, setFormProfissional] = useState({ nome: '', profissao: '', anos_experiencia: '', horarios: DEFAULT_PROFISSIONAL_HORARIOS });

  useEffect(() => {
    if (!negocio) return;
    setFormInfo({
      nome: negocio.nome || '',
      descricao: negocio.descricao || '',
      meta_title: negocio.meta_title || '',
      meta_description: negocio.meta_description || '',
      telefone: formatPhoneForDisplay(negocio.telefone) || '',
      endereco_cep: negocio.endereco_cep || '',
      endereco_rua: negocio.endereco_rua || '',
      endereco_numero: negocio.endereco_numero || '',
      endereco_complemento: negocio.endereco_complemento || '',
      endereco_bairro: negocio.endereco_bairro || '',
      endereco_cidade: negocio.endereco_cidade || '',
      endereco_estado: negocio.endereco_estado || '',
      instagram: negocio.instagram || '',
      facebook: negocio.facebook || '',
      tema: negocio.tema || 'dark',
    });
  }, [negocio]);

  const { group: businessGroup, status: businessGroupStatus, retry: retryBusinessGroup } =
    useBusinessGroup(negocio?.tipo_negocio, null, negocio?.id);

  const tabEntregasLabel = useMemo(() => getBizLabel(businessGroup, 'tab_title').toUpperCase(), [businessGroup]);
  const sectionTitle     = useMemo(() => getBizLabel(businessGroup, 'tab_title'), [businessGroup]);
  const btnAddLabel      = useMemo(() => getBizLabel(businessGroup, 'button_add'), [businessGroup]);
  const modalNewLabel    = useMemo(() => getBizLabel(businessGroup, 'modal_new'), [businessGroup]);
  const modalEditLabel   = useMemo(() => getBizLabel(businessGroup, 'modal_edit'), [businessGroup]);
  const counterSingular  = useMemo(() => getBizLabel(businessGroup, 'counter_singular'), [businessGroup]);
  const counterPlural    = useMemo(() => getBizLabel(businessGroup, 'counter_plural'), [businessGroup]);
  const emptyListMsg     = useMemo(() => getBizLabel(businessGroup, 'empty_list'), [businessGroup]);
  const entregaLoadMoreErrorKey = useMemo(() => `dashboard.business.${businessGroup}.load_more_error`, [businessGroup]);
  const handleEntregasPageError = useCallback(() => {
    uiAlert(entregaLoadMoreErrorKey, 'warning');
  }, [entregaLoadMoreErrorKey, uiAlert]);

  const adminJaEhProfissional = useMemo(() =>
    profissionais.some(p => p.user_id === user?.id),
  [profissionais, user?.id]);

  const { subscribeRealtime } = useDashboardRealtime({
    activeTab,
    faturamentoData,
    faturamentoMes,
    hoje,
    negocio,
    parceiroProfissionalId,
    agendamentos,
    profissionais,
    reloadAgendamentos,
    loadOverview,
    setNotifAgendamentos,
  });
  const {
    historicoAgendamentos,
    historicoHasMore,
    historicoLoadingMore,
    historicoError,
    historicoData,
    setHistoricoData,
    loadMoreHistorico,
  } = useDashboardHistorico({
    negocioId: negocio?.id,
    hoje,
    parceiroProfissionalId,
  });
  const {
    clientes,
    clientesLoading,
    clientesError,
    clientesHasMore,
    clientesLoadingMore,
    loadMoreClientes,
  } = useDashboardClientes({
    negocioId: negocio?.id,
  });

  const {
    logoUploading,
    infoSaving,
    temaSaving,
    galleryUploading,
    submittingEntrega,
    submittingProfissional,
    submittingAdminProf,
    deletingBusiness,
    cadastrarAdminComoProfissional,
    uploadLogoNegocio,
    salvarInfoNegocio,
    salvarTema,
    excluirNegocio,
    uploadGaleria,
    excluirImagemGaleria,
    createEntrega,
    updateEntrega,
    deleteEntrega,
    toggleStatusEntrega,
    toggleStatusProfissional,
    excluirProfissional,
    updateProfissional,
    aprovarParceiro,
    confirmarAtendimento,
    cancelarAgendamento,
  } = useDashboardMutations({
    userId: user?.id,
    negocio,
    businessGroup,
    parceiroProfissional,
    reloadNegocio,
    reloadProfissionais,
    reloadEntregas,
    reloadAgendamentos,
    reloadGaleria,
    loadOverview,
    navigate,
    checarPermissao,
    uiAlert,
    uiConfirm,
    setNegocio,
    setGaleriaItems,
    formInfo,
    setFormInfo,
    formEntrega,
    setFormEntrega,
    entregas,
    editingEntregaId,
    setEditingEntregaId,
    setShowNovaEntrega,
    formProfissional,
    editingProfissionalId,
    setEditingProfissionalId,
    setShowEditProfissional,
  });

  useEffect(() => {
    setFaturamentoData(prev => prev ? prev : hoje);
    setFaturamentoMes(prev => prev ? prev : String(hoje || '').slice(0, 7));
  }, [hoje]);

  useEffect(() => subscribeRealtime(), [subscribeRealtime]);

  const agendamentosAgrupadosPorProfissional = useMemo(() => {
    const fonte = parceiroProfissionalId
      ? agendamentos.filter(a => a.profissional_id === parceiroProfissionalId)
      : agendamentos;
    const map = new Map();
    for (const a of fonte) { const pid = a.profissional_id || a.profissionais?.id || 'sem-prof'; const nome = a.profissionais?.nome || 'PROFISSIONAL'; if (!map.has(pid)) map.set(pid, { pid, nome, itens: [] }); map.get(pid).itens.push(a); }
    const grupos = Array.from(map.values()).map(gr => ({ ...gr, itens: gr.itens.slice().sort(compareAgendamentoDateTimeDesc) }));
    const ordem = new Map((profissionais || []).map((p, idx) => [p.id, idx]));
    grupos.sort((a, b) => (ordem.get(a.pid) ?? 9999) - (ordem.get(b.pid) ?? 9999));
    return grupos;
  }, [agendamentos, profissionais, parceiroProfissionalId]);

  const entregasPorProf = useMemo(() => {
    const map = new Map(); for (const p of profissionais) map.set(p.id, []); for (const s of entregas) { if (!map.has(s.profissional_id)) map.set(s.profissional_id, []); map.get(s.profissional_id).push(s); } return map;
  }, [profissionais, entregas]);

  const entregasCountByProf = useMemo(() => {
    const map = new Map();
    for (const p of profissionais) {
      const total = entregaPagesByProf?.[p.id]?.totalCount;
      map.set(p.id, Number.isFinite(Number(total)) ? Number(total) : (entregasPorProf.get(p.id) || []).length);
    }
    return map;
  }, [entregaPagesByProf, entregasPorProf, profissionais]);

  const faturamentoPorProfissionalHoje   = useMemo(() => { const arr = metricsHoje?.today?.por_profissional || []; if (!Array.isArray(arr)) return []; return arr.map(x => { if (!x) return null; const nome = String(x.nome ?? '').trim(); const valor = Number(x.faturamento ?? x.valor ?? 0); if (!nome) return null; return [nome, Number.isFinite(valor) ? valor : 0]; }).filter(Boolean).sort((a, b) => Number(b[1]) - Number(a[1])); }, [metricsHoje]);
  const faturamentoPorProfissionalFiltro = useMemo(() => { const arr = metricsDia?.selected_day?.por_profissional || []; if (!Array.isArray(arr)) return []; return arr.map(x => { if (!x) return null; const nome = String(x.nome ?? '').trim(); const valor = Number(x.faturamento ?? x.valor ?? 0); if (!nome) return null; return [nome, Number.isFinite(valor) ? valor : 0]; }).filter(Boolean).sort((a, b) => Number(b[1]) - Number(a[1])); }, [metricsDia]);
  const faturamentoPorProfissionalPeriodo = useMemo(() => { const arr = metricsPeriodoData?.period?.por_profissional || []; if (!Array.isArray(arr)) return []; return arr.map(x => { if (!x) return null; const nome = String(x.nome ?? '').trim(); const valor = Number(x.faturamento ?? x.valor ?? 0); const variacao = x.variacao_percentual === null || x.variacao_percentual === undefined ? null : Number(x.variacao_percentual); if (!nome) return null; return [nome, Number.isFinite(valor) ? valor : 0, Number(x.concluidos || 0), Number.isFinite(variacao) ? variacao : null]; }).filter(Boolean).sort((a, b) => Number(b[1]) - Number(a[1])); }, [metricsPeriodoData]);
  const topFaturamento = metricsTopCards?.faturamento_hoje || {};
  const topAgendamentos = metricsTopCards?.agendamentos_hoje || {};
  const topProfissionais = metricsTopCards?.profissionais || {};
  const topEntregas = metricsTopCards?.entregas || {};
  const topCardsReady = !!metricsTopCards;

  const tabs = useMemo(() => (
    parceiroProfissional
      ? ['visao-geral', 'agendamentos', 'historico', 'clientes', 'entregas', 'profissionais']
      : souDono
        ? ['visao-geral', 'agendamentos', 'historico', 'clientes', 'entregas', 'profissionais', 'info-negocio', 'planos']
        : ['visao-geral', 'agendamentos', 'historico', 'clientes', 'entregas', 'profissionais']
  ), [parceiroProfissional, souDono]);

  const TAB_LABELS = { 'visao-geral': 'GERAL', 'agendamentos': 'AGENDAMENTOS', 'historico': 'HISTÓRICO', 'clientes': 'CLIENTES', 'entregas': tabEntregasLabel, 'profissionais': 'PROFISSIONAIS', 'dados': 'DADOS', 'info-negocio': 'INFO DO NEGÓCIO', 'planos': 'PLANOS' };
  useEffect(() => {
    const searchParams = new URLSearchParams(location?.search || '');
    const queryTab = searchParams.get('tab');
    const requestedTab = location?.state?.activeTab || queryTab;
    if (requestedTab && tabs.includes(requestedTab)) setActiveTab(requestedTab);

    const billingResult = String(searchParams.get('billing') || '').toLowerCase();
    const messageKey = BILLING_CHECKOUT_MESSAGE_KEYS[billingResult];
    if (!messageKey) return;

    feedback?.showMessage?.(messageKey);
    searchParams.delete('billing');
    const nextSearch = searchParams.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
      },
      {
        replace: true,
        state: location.state,
      }
    );
  }, [feedback, location.pathname, location?.search, location.state, location?.state?.activeTab, navigate, tabs]);

  const agendarCliente = useCallback((cliente) => {
    if (!negocio?.slug || !cliente?.cliente_id) return;
    navigate(`/v/${negocio.slug}`, {
      state: {
        assistedBooking: {
          clienteId: cliente.cliente_id,
          clienteNome: cliente.cliente_nome || '',
          negocioId: negocio.id,
          returnTo: '/dashboard',
        },
      },
    });
  }, [navigate, negocio?.id, negocio?.slug]);
  const handleDashboardLogout = useCallback(() => {
    onLogout(parceiroProfissional || professionalRole === 'partner' ? '/login/parceiro' : '/login');
  }, [onLogout, parceiroProfissional, professionalRole]);
  const dashboardError = typeof error === 'string'
    ? { title: 'Erro ao carregar', body: error, primaryLabel: 'TENTAR NOVAMENTE', primaryAction: 'retry' }
    : error;
  const handleDashboardErrorPrimaryAction = useCallback(() => {
    if (dashboardError?.primaryAction === 'partner-business-center') {
      navigate('/selecionar-negocio-parceiro', { replace: true });
      return;
    }
    reloadFull();
  }, [dashboardError?.primaryAction, navigate, reloadFull]);

  if (bootstrapState === 'loading') return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <div className="text-primary text-xl">CARREGANDO...</div>
      </div>
    </div>
  );

  if (bootstrapState === 'error' && error) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-dark-100 border border-red-500/50 rounded-custom p-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-normal text-white mb-2">{dashboardError?.title || 'Erro ao carregar'}</h1>
        <p className="text-gray-400 mb-6">{dashboardError?.body || 'Erro inesperado.'}</p>
        <button onClick={handleDashboardErrorPrimaryAction} className="w-full px-6 py-3 bg-primary/20 border border-primary/50 text-primary rounded-button mb-3 font-normal uppercase">{dashboardError?.primaryLabel || 'TENTAR NOVAMENTE'}</button>
        <button onClick={handleDashboardLogout} className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-button font-normal uppercase">SAIR</button>
      </div>
    </div>
  );

  if (bootstrapState !== 'ready' || !negocio) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <div className="text-primary text-xl">CARREGANDO...</div>
      </div>
    </div>
  );

  const announcements = getDashboardAnnouncements({
    souDono,
    billingStatusLoadError,
    billingLoading,
    billingStatus,
    activeTab,
    reloadBillingStatus,
    setActiveTab,
    clockUnavailable,
    reloadFull,
  });

  return (
    <div className="min-h-screen bg-black text-white">

      <div className="sticky top-0 z-50">
        <DashboardAnnouncementBar announcements={announcements} />

        <header className="bg-dark-100 border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-800 bg-dark-200 flex items-center justify-center shrink-0">
                  {negocio.logo_path
                    ? <img src={getPublicUrl('logos', negocio.logo_path)} alt="Logo" className="w-full h-full object-cover" />
                    : <div className="w-12 h-12 bg-gradient-to-br from-primary to-yellow-600 rounded-full flex items-center justify-center"><ProfessionalIcon className="w-7 h-7 text-black" /></div>}
                </div>
                <div>
                  <h1 className="text-xl font-normal">{negocio.nome}</h1>
                  {souDono
                    ? ownerBusinessCount > 1
                      ? <button type="button" onClick={() => navigate('/selecionar-negocio')} className="text-xs text-gray-500 hover:text-primary transition-colors -mt-0.5 block">SELECIONAR NEGÓCIO</button>
                      : <span className="text-xs text-gray-500 -mt-0.5 block">DASHBOARD</span>
                    : <button type="button" onClick={() => navigate('/selecionar-negocio-parceiro')} className="text-xs text-primary hover:text-yellow-500 -mt-0.5 block uppercase transition-colors">SELECIONAR NEGÓCIO</button>}
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <Link to={`/v/${negocio.slug}`} target="_blank" className="hidden sm:flex items-center gap-2 px-4 py-2 bg-dark-200 border border-gray-800 hover:border-primary rounded-button text-sm font-normal uppercase">
                  <Eye className="w-4 h-4" />VER VITRINE
                </Link>
                {souDono && (
                  <label className="inline-block">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogoNegocio(e.target.files?.[0])} disabled={logoUploading} />
                    <span className={`inline-flex items-center justify-center text-center rounded-button font-normal border transition-all uppercase focus:outline-none ${logoUploading ? 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed' : 'bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary cursor-pointer'}  px-4 py-1.5 text-[11px] sm:px-4 sm:py-2 sm:text-sm`}>
                      <span className="sm:hidden">{logoUploading ? 'ENVIANDO...' : 'LOGO'}</span>
                      <span className="hidden sm:inline">{logoUploading ? 'ENVIANDO...' : 'ALTERAR LOGO'}</span>
                    </span>
                  </label>
                )}
                <button onClick={handleDashboardLogout} className="flex items-center gap-2 px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 rounded-button text-sm font-normal uppercase">
                  <LogOut className="w-4 h-4" /><span className="hidden sm:inline">SAIR</span>
                </button>
              </div>
            </div>
          </div>
        </header>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 items-start">
          <DashboardTopCard
            highlight
            icon={<span className="font-condensed text-green-400 font-normal text-3xl leading-none">$</span>}
            label="FATURAMENTO HOJE"
            value={metricsTopCardsLoading ? '...' : topCardsReady ? formatCurrency(topFaturamento.valor) : '--'}
          >
            {topCardsReady ? (
              <RevenueTrendBadge data={topFaturamento} />
            ) : null}
          </DashboardTopCard>

          <DashboardTopCard
            icon={<CalendarIcon className="w-8 h-8 text-blue-400" dotOpacity={0} />}
            label="AGENDAMENTOS HOJE"
            value={metricsTopCardsLoading ? '...' : topCardsReady ? Number(topAgendamentos.total || 0) : '--'}
          >
            {topCardsReady ? (
              <TrendBadge data={topAgendamentos} />
            ) : null}
          </DashboardTopCard>

          <DashboardTopCard
            icon={<UsersIcon className="w-8 h-8 text-purple-400" />}
            label="PROFISSIONAIS"
            value={metricsTopCardsLoading ? '...' : topCardsReady ? Number(topProfissionais.total || 0) : '--'}
          >
            {topCardsReady ? (
              <InfoPill label="Ativos" value={Number(topProfissionais.ativos || 0)} />
            ) : null}
          </DashboardTopCard>

          <DashboardTopCard
            icon={<TrendingUpIcon className="w-8 h-8 text-primary" />}
            label={tabEntregasLabel || 'ATENDIMENTOS'}
            value={metricsTopCardsLoading ? '...' : topCardsReady ? Number(topEntregas.total || 0) : '--'}
          >
            {topCardsReady ? (
              <InfoPill label="Média" value={formatCurrency(topEntregas.preco_medio)} />
            ) : null}
          </DashboardTopCard>
        </div>

        <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-yellow-400 border-y border-yellow-300/50 mb-8 overflow-hidden h-10 flex items-center">
          <div className="announcement-bar-wrapper flex">
            {[1, 2].map((i) => (
              <div key={i} className="announcement-bar-track flex items-center shrink-0 whitespace-nowrap" aria-hidden={i === 2}>
                {[...Array(12)].map((_, index) => (
                  <div key={index} className="flex items-center">
                    <span className="text-black font-bold text-sm uppercase mx-4">CLIQUE PARA IR</span>
                    <span className="text-black mx-4">●</span>
                    <Link to={`/v/${negocio.slug}`} target="_blank" className="text-black font-normal text-sm uppercase hover:underline underline-offset-4 transition-all mx-4">VER VITRINE</Link>
                    <span className="text-black mx-4">●</span>
                    <a href={SUPORTE_HREF} target="_blank" rel="noreferrer" className="text-black font-normal text-sm uppercase hover:underline underline-offset-4 transition-all mx-4">SUPORTE</a>
                    <span className="text-black mx-4">●</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-dark-100 border border-gray-800 rounded-custom overflow-visible">
          <div className="flex overflow-x-auto border-b border-gray-800">
            {tabs.map(tab => {
              const notif = tab === 'agendamentos' ? notifAgendamentos : 0;
              return (
                <button key={tab}
                  onClick={() => { setActiveTab(tab); if (tab === 'agendamentos') setNotifAgendamentos(0); }}
                  className={`relative flex-shrink-0 px-6 py-4 text-sm transition-all uppercase font-normal ${activeTab === tab ? 'bg-primary/20 text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}>
                  {TAB_LABELS[tab] || 'ATENDIMENTOS'}
                  {notif > 0 && (<span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-black text-[10px] font-bold flex items-center justify-center leading-none">{notif > 99 ? '99+' : notif}</span>)}
                </button>
              );
            })}
          </div>

          <div className="p-6">

            {!businessGroup && ['visao-geral', 'historico', 'clientes', 'entregas', 'profissionais'].includes(activeTab) && (
              <BusinessGroupNotice status={businessGroupStatus} onRetry={retryBusinessGroup} />
            )}

            {businessGroup && activeTab === 'visao-geral' && (
              <GeralSection
                metricsHoje={metricsHoje}
                proximoAgendamento={proximoAgendamento}
                souDono={souDono}
                faturamentoPorProfissionalHoje={faturamentoPorProfissionalHoje}
                faturamentoData={faturamentoData}
                setFaturamentoData={setFaturamentoData}
                hoje={hoje}
                metricsDiaLoading={metricsDiaLoading}
                metricsDia={metricsDia}
                faturamentoPorProfissionalFiltro={faturamentoPorProfissionalFiltro}
                faturamentoMes={faturamentoMes}
                setFaturamentoMes={setFaturamentoMes}
                metricsPeriodoData={metricsPeriodoData}
                metricsPeriodoLoading={metricsPeriodoLoading}
                faturamentoPorProfissionalPeriodo={faturamentoPorProfissionalPeriodo}
                metricsUtilizacao={metricsUtilizacao}
                metricsUtilizacaoLoading={metricsUtilizacaoLoading}
                metricsFutureBookings={metricsFutureBookings}
                metricsFutureBookingsLoading={metricsFutureBookingsLoading}
                counterSingular={counterSingular}
              />
            )}

            {activeTab === 'agendamentos' && (
              <AgendamentosSection
                agendamentosAgrupadosPorProfissional={agendamentosAgrupadosPorProfissional}
                hoje={hoje}
                nowMinutes={serverNow?.minutes}
                canSendReminder={souDono && !clockUnavailable}
                negocioNome={negocio?.nome || ''}
                confirmarAtendimento={confirmarAtendimento}
                cancelarAgendamento={cancelarAgendamento}
                hasMore={agendamentosHasMore}
                loadingMore={agendamentosLoadingMore}
                onLoadMore={loadMoreAgendamentos}
              />
            )}

            {businessGroup && activeTab === 'historico' && (
              <HistoricoSection
                negocioNome={negocio?.nome || ''}
                businessGroup={businessGroup}
                historicoData={historicoData}
                setHistoricoData={setHistoricoData}
                hoje={hoje}
                historicoAgendamentos={historicoAgendamentos}
                historicoHasMore={historicoHasMore}
                loadMoreHistorico={loadMoreHistorico}
                historicoLoadingMore={historicoLoadingMore}
                historicoError={historicoError}
              />
            )}

            {businessGroup && activeTab === 'clientes' && (
              <ClientesSection
                clientes={clientes}
                clientesLoading={clientesLoading}
                clientesError={clientesError}
                clientesHasMore={clientesHasMore}
                clientesLoadingMore={clientesLoadingMore}
                loadMoreClientes={loadMoreClientes}
                onAgendarCliente={agendarCliente}
                itemLabel={counterSingular}
              />
            )}

            {businessGroup && activeTab === 'entregas' && (
              <EntregasSection
                sectionTitle={sectionTitle}
                parceiroProfissional={parceiroProfissional}
                setShowNovaEntrega={setShowNovaEntrega}
                setEditingEntregaId={setEditingEntregaId}
                setFormEntrega={setFormEntrega}
                btnAddLabel={btnAddLabel}
                profissionais={profissionais}
                entregasPorProf={entregasPorProf}
                entregaPagesByProf={entregaPagesByProf}
                loadEntregasPage={loadEntregasPage}
                onLoadPageError={handleEntregasPageError}
                counterSingular={counterSingular}
                counterPlural={counterPlural}
                emptyListMsg={emptyListMsg}
                checarPermissao={checarPermissao}
                deleteEntrega={deleteEntrega}
                toggleStatusEntrega={toggleStatusEntrega}
              />
            )}

            {businessGroup && activeTab === 'profissionais' && (
              <ProfissionaisSection
                souDono={souDono}
                adminJaEhProfissional={adminJaEhProfissional}
                cadastrarAdminComoProfissional={cadastrarAdminComoProfissional}
                submittingAdminProf={submittingAdminProf}
              profissionais={souDono ? profissionais : profissionaisEquipe}
              todayDow={clockUnavailable || !serverNow?.date ? null : serverNow.dow}
              parceiroProfissional={parceiroProfissional}
              entregas={entregas}
              entregasCountByProf={entregasCountByProf}
                counterPlural={counterPlural}
                aprovarParceiro={aprovarParceiro}
                excluirProfissional={excluirProfissional}
                toggleStatusProfissional={toggleStatusProfissional}
                setEditingProfissionalId={setEditingProfissionalId}
                setFormProfissional={setFormProfissional}
                setShowEditProfissional={setShowEditProfissional}
              />
            )}

            {activeTab === 'info-negocio' && souDono && (
              <InfoNegocioSection
                salvarInfoNegocio={salvarInfoNegocio}
                infoSaving={infoSaving}
                formInfo={formInfo}
                setFormInfo={setFormInfo}
                salvarTema={salvarTema}
                temaSaving={temaSaving}
                galleryUploading={galleryUploading}
                uploadGaleria={uploadGaleria}
                galeriaItems={galeriaItems}
                galeriaHasMore={galeriaHasMore}
                galeriaLoadingMore={galeriaLoadingMore}
                loadMoreGaleria={loadMoreGaleria}
                getPublicUrl={getPublicUrl}
                excluirImagemGaleria={excluirImagemGaleria}
                  deletingBusiness={deletingBusiness}
                  excluirNegocio={excluirNegocio}
                  navigate={navigate}
                />
            )}

            {activeTab === 'planos' && souDono && (
              <PlanosSection
                negocioId={negocio.id}
                profissionais={profissionais}
                billingStatus={billingStatus}
                billingLoading={billingLoading}
                onBillingStatusChange={setBillingStatus}
                reloadBillingStatus={reloadBillingStatus}
              />
            )}

          </div>
        </div>
      </div>

      <EntregaModal
        show={showNovaEntrega && !!businessGroup}
        editingEntregaId={editingEntregaId}
        modalNewLabel={modalNewLabel}
        modalEditLabel={modalEditLabel}
        formEntrega={formEntrega}
        setFormEntrega={setFormEntrega}
        parceiroProfissional={parceiroProfissional}
        profissionais={profissionais}
        submittingEntrega={submittingEntrega}
        onClose={() => {
          setShowNovaEntrega(false);
          setEditingEntregaId(null);
          setFormEntrega({ nome: '', duracao_minutos: '', preco: '', preco_promocional: '', profissional_id: '' });
        }}
        onSubmit={editingEntregaId ? updateEntrega : createEntrega}
      />

      <ProfissionalModal
        show={showEditProfissional}
        formProfissional={formProfissional}
        setFormProfissional={setFormProfissional}
        weekdays={WEEKDAYS}
        submittingProfissional={submittingProfissional}
        onClose={() => {
          setShowEditProfissional(false);
          setEditingProfissionalId(null);
        }}
        onSubmit={updateProfissional}
      />

      <AppFooter userType={userType} professionalRole={professionalRole} onLogout={handleDashboardLogout} />

    </div>
  );
}
