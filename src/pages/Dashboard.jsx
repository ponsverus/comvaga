import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { CalendarIcon, ProfessionalIcon, TrendingUpIcon, UsersIcon } from '../components/icons';
import AppFooter from '../components/AppFooter';
import { Eye, LogOut, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { formatPhoneForDisplay } from '../utils/phone';
import { useFeedback } from '../feedback/useFeedback';
import { useBusinessGroup } from '../businessTerms';
import EntregaModal from './dashboard/components/EntregaModal';
import ProfissionalModal from './dashboard/components/ProfissionalModal';
import GeralSection from './dashboard/sections/GeralSection';
import AgendamentosSection from './dashboard/sections/AgendamentosSection';
import HistoricoSection from './dashboard/sections/HistoricoSection';
import ClientesSection from './dashboard/sections/ClientesSection';
import EntregasSection from './dashboard/sections/EntregasSection';
import ProfissionaisSection from './dashboard/sections/ProfissionaisSection';
import InfoNegocioSection from './dashboard/sections/InfoNegocioSection';
import PlanosSection from './dashboard/sections/PlanosSection';
import {
  NOW_RPC_SEQUENCE,
  DEFAULT_PROFISSIONAL_HORARIOS,
  SUPORTE_HREF,
  WEEKDAYS,
  compareAgendamentoDateTimeDesc,
  getBizLabel,
  isCancellationScheduled,
  normalizeStatus,
} from './dashboard/utils';
import { fetchBusinessBillingStatus, getPublicUrl } from './dashboard/api/dashboardApi';
import { useDashboardBootstrap } from './dashboard/hooks/useDashboardBootstrap';
import { useDashboardClientes } from './dashboard/hooks/useDashboardClientes';
import { useDashboardHistorico } from './dashboard/hooks/useDashboardHistorico';
import { useDashboardMetrics } from './dashboard/hooks/useDashboardMetrics';
import { useDashboardMutations } from './dashboard/hooks/useDashboardMutations';

function formatCurrency(value) {
  return `R$ ${Number(value || 0).toFixed(2)}`;
}

function formatDelta(value) {
  const number = Number(value || 0);
  if (number === 0) return '0';
  return `${number > 0 ? '+' : ''}${number}`;
}

function formatPercentDelta(value) {
  const number = Number(value || 0);
  if (number === 0) return '0.0%';
  return `${number > 0 ? '+' : ''}${number.toFixed(1)}%`;
}

function TrendBadge({ data }) {
  const percent = data?.variacao_percentual;
  const delta = data?.variacao_valor;
  const hasPercent = percent !== null && percent !== undefined;
  const value = hasPercent ? Number(percent || 0) : Number(delta || 0);
  const tone = value > 0
    ? 'border-green-400/30 bg-green-400/10 text-green-400'
    : value < 0
      ? 'border-red-400/30 bg-red-400/10 text-red-400'
      : 'border-gray-700 bg-transparent text-gray-400';
  const text = hasPercent ? formatPercentDelta(percent) : formatDelta(delta);

  if (text === '0') return null;

  return (
    <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${tone}`}>
      {text}
    </div>
  );
}

function RevenueTrendBadge({ data }) {
  const percent = data?.variacao_percentual;
  const delta = data?.variacao_valor;
  const hasPercent = percent !== null && percent !== undefined;
  const value = hasPercent ? Number(percent || 0) : Number(delta || 0);
  const text = hasPercent ? formatPercentDelta(percent) : formatDelta(delta);
  const tone = value > 0 ? 'text-green-500' : value < 0 ? 'text-red-500' : 'text-gray-500';

  if (text === '0') return null;

  return (
    <div className={`inline-flex items-center rounded-full border border-white bg-white px-3 py-1 text-xs ${tone}`}>
      {text}
    </div>
  );
}

function InfoPill({ label, value, tone = 'text-gray-300', border = 'border-gray-700', bg = 'bg-transparent' }) {
  return (
    <div className={`inline-flex items-center justify-center gap-1.5 rounded-full border ${border} ${bg} px-3 py-1 text-xs`}>
      {label ? <span className="text-gray-500 uppercase">{label}</span> : null}
      <span className={tone}>{value}</span>
    </div>
  );
}

function getPendingPlanChangeSuffix(status) {
  const planChangeScheduled = Boolean(status?.plan_change_scheduled);
  const pendingPlanLabel = status?.pending_plan_name || status?.pending_plan_code || '';
  if (!planChangeScheduled || !pendingPlanLabel) return '';

  const pendingPlanDate = status?.pending_plan_effective_label || '';
  return ` A TROCA PARA ${pendingPlanLabel}${pendingPlanDate ? ` ESTÁ AGENDADA PARA ${pendingPlanDate}` : ' CONTINUA AGENDADA'}.`;
}

function getBillingAnnouncement(status) {
  if (!status) return null;
  const current = String(status.status || '').toLowerCase();
  const daysUntilTrialEnd = Number(status.days_until_trial_end);
  const daysUntilBlock = Number(status.days_until_block);
  const trialDays = Number(status.trial_days);
  const pendingPlanChangeSuffix = getPendingPlanChangeSuffix(status);

  if (isCancellationScheduled(status)) {
    const accessEndLabel = status?.access_ends_label || '';
    return {
      tone: 'warning',
      text: `PLANO CANCELADO. ACESSO LIBERADO${accessEndLabel ? ` ATÉ ${accessEndLabel}` : ''}.${pendingPlanChangeSuffix}`,
    };
  }

  if (current === 'blocked' || current === 'canceled') {
    return {
      tone: 'danger',
      text: `AGENDA BLOQUEADA. REGULARIZE SEU PLANO.${pendingPlanChangeSuffix}`,
    };
  }

  if (current === 'payment_grace' || current === 'past_due') {
    const suffix = Number.isFinite(daysUntilBlock) && daysUntilBlock > 0
      ? ` BLOQUEIO EM ${daysUntilBlock} DIA${daysUntilBlock === 1 ? '' : 'S'}.`
      : '';
    return {
      tone: 'warning',
      text: `TESTE ENCERRADO. ADD UM PAGAMENTO.${suffix}${pendingPlanChangeSuffix}`,
    };
  }

  if (current === 'trialing' && Number.isFinite(daysUntilTrialEnd) && daysUntilTrialEnd > 0) {
    const total = Number.isFinite(trialDays) && trialDays > 0
      ? ` DE ${trialDays} DIA${trialDays === 1 ? '' : 'S'}`
      : '';
    return {
      tone: 'warning',
      text: `TESTE GRÁTIS ATIVO. FALTAM ${daysUntilTrialEnd} DIA${daysUntilTrialEnd === 1 ? '' : 'S'}${total}.${pendingPlanChangeSuffix}`,
    };
  }

  if (pendingPlanChangeSuffix) {
    return {
      tone: 'warning',
      text: pendingPlanChangeSuffix.trim(),
    };
  }

  return null;
}

function BillingAnnouncementBar({ announcement }) {
  if (!announcement) return null;
  const toneClass = announcement.tone === 'danger'
    ? 'border-red-500/30 bg-[#1a0b0b] text-red-100'
    : 'border-primary/25 bg-[#151106] text-primary';

  return (
    <div className={`border-b ${toneClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 text-center text-xs sm:text-sm font-normal">
        {announcement.text}
      </div>
    </div>
  );
}

const BILLING_CHECKOUT_MESSAGE_KEYS = {
  success: 'dashboard.billing_checkout_success',
  cancel: 'dashboard.billing_checkout_cancel',
  expired: 'dashboard.billing_checkout_expired',
};

function DashboardTopCard({ icon, label, value, children, highlight = false }) {
  const baseClass = highlight
    ? 'bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30'
    : 'bg-dark-100 border-gray-800';

  return (
    <div className={`${baseClass} border rounded-custom p-6 min-h-[136px]`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            {icon}
            <span className="text-sm text-gray-500">{label}</span>
          </div>
          <div className="text-3xl font-normal text-white mb-1">{value}</div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">{children}</div>
      </div>
    </div>
  );
}

export default function Dashboard({ user, onLogout, userType = 'professional', professionalRole = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const feedback = useFeedback();

  const uiAlert   = useCallback(async (key, variant = 'info') => { if (feedback?.showMessage) return feedback.showMessage(key, { variant }); return Promise.resolve(); }, [feedback]);
  const uiConfirm = useCallback(async (key, variant = 'warning') => { if (feedback?.confirm) return !!(await feedback.confirm(key, { variant })); return false; }, [feedback]);
  const uiPrompt  = useCallback(async (key, opts = {}) => { if (feedback?.prompt) return await feedback.prompt(key, opts); return null; }, [feedback]);

  const [activeTab, setActiveTab] = useState('agendamentos');
  const [billingStatus, setBillingStatus] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const {
    parceiroProfissional,
    negocio,
    setNegocio,
    profissionais,
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

  useEffect(() => {
    let active = true;
    if (!negocio?.id || !souDono) {
      setBillingStatus(null);
      setBillingLoading(false);
      return () => { active = false; };
    }
    setBillingLoading(true);
    fetchBusinessBillingStatus(negocio.id)
      .then((status) => {
        if (active) setBillingStatus(status);
      })
      .catch(() => {
        if (active) setBillingStatus(null);
      })
      .finally(() => {
        if (active) setBillingLoading(false);
      });
    return () => { active = false; };
  }, [negocio?.id, souDono]);

  const reloadBillingStatus = useCallback(async () => {
    if (!negocio?.id || !souDono) {
      setBillingStatus(null);
      setBillingLoading(false);
      return null;
    }

    setBillingLoading(true);
    try {
      const status = await fetchBusinessBillingStatus(negocio.id);
      setBillingStatus(status);
      return status;
    } catch {
      setBillingStatus(null);
      return null;
    } finally {
      setBillingLoading(false);
    }
  }, [negocio?.id, souDono]);

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
  });

  const [showNovaEntrega, setShowNovaEntrega]       = useState(false);
  const [editingEntregaId, setEditingEntregaId]     = useState(null);

  const [formEntrega, setFormEntrega] = useState({ nome: '', duracao_minutos: '', preco: '', preco_promocional: '', profissional_id: '' });

  const [formInfo, setFormInfo] = useState({
    nome: '',
    descricao: '',
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

  const businessGroup = useBusinessGroup(negocio?.tipo_negocio);

  const tabEntregasLabel = useMemo(() => getBizLabel(businessGroup, 'tab_title').toUpperCase(), [businessGroup]);
  const sectionTitle     = useMemo(() => getBizLabel(businessGroup, 'tab_title'), [businessGroup]);
  const btnAddLabel      = useMemo(() => getBizLabel(businessGroup, 'button_add'), [businessGroup]);
  const modalNewLabel    = useMemo(() => getBizLabel(businessGroup, 'modal_new'), [businessGroup]);
  const modalEditLabel   = useMemo(() => getBizLabel(businessGroup, 'modal_edit'), [businessGroup]);
  const counterSingular  = useMemo(() => getBizLabel(businessGroup, 'counter_singular'), [businessGroup]);
  const counterPlural    = useMemo(() => getBizLabel(businessGroup, 'counter_plural'), [businessGroup]);
  const emptyListMsg     = useMemo(() => getBizLabel(businessGroup, 'empty_list'), [businessGroup]);

  const adminJaEhProfissional = useMemo(() =>
    profissionais.some(p => p.user_id === user?.id),
  [profissionais, user?.id]);

  const reloadAgendamentosRef = useRef(reloadAgendamentos);
  useEffect(() => { reloadAgendamentosRef.current = reloadAgendamentos; }, [reloadAgendamentos]);

  const loadOverviewRef = useRef(loadOverview);
  useEffect(() => { loadOverviewRef.current = loadOverview; }, [loadOverview]);

  const realtimeRefreshTimerRef = useRef(null);
  const realtimeDashboardContextRef = useRef({
    activeTab,
    faturamentoData,
    faturamentoMes,
    hoje,
    negocioId: negocio?.id || null,
    parceiroProfissionalId,
  });
  useEffect(() => {
    realtimeDashboardContextRef.current = {
      activeTab,
      faturamentoData,
      faturamentoMes,
      hoje,
      negocioId: negocio?.id || null,
      parceiroProfissionalId,
    };
  }, [activeTab, faturamentoData, faturamentoMes, hoje, negocio?.id, parceiroProfissionalId]);

  const agendamentosStatusRef = useRef(new Map());
  useEffect(() => {
    agendamentosStatusRef.current = new Map(
      agendamentos
        .filter((ag) => ag?.id)
        .map((ag) => [ag.id, normalizeStatus(ag.status)])
    );
  }, [agendamentos]);

  const agProfIdsKey = useMemo(() => profissionais.map(p => p.id).sort().join(','), [profissionais]);
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
    uiPrompt,
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

  useEffect(() => {
    if (!negocio?.id || !agProfIdsKey || !hoje) return;
    const scheduleDashboardRefresh = () => {
      if (realtimeRefreshTimerRef.current) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
      }

      realtimeRefreshTimerRef.current = window.setTimeout(() => {
        const ctx = realtimeDashboardContextRef.current;
        if (!ctx.negocioId || !ctx.hoje) return;

        Promise.resolve(reloadAgendamentosRef.current()).catch(() => {});
        Promise.resolve(loadOverviewRef.current(
          ctx.negocioId,
          ctx.hoje,
          ctx.faturamentoData || ctx.hoje,
          ctx.faturamentoMes,
          ctx.parceiroProfissionalId,
          { silent: true }
        )).catch(() => {});

        realtimeRefreshTimerRef.current = null;
      }, 1200);
    };

    const channelName = parceiroProfissionalId
      ? `agendamentos:${negocio.id}:${parceiroProfissionalId}`
      : `agendamentos:${negocio.id}`;
    const channelFilter = parceiroProfissionalId
      ? `profissional_id=eq.${parceiroProfissionalId}`
      : `negocio_id=eq.${negocio.id}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos', filter: channelFilter }, (payload) => {
        const ev = payload?.eventType;
        const novo = payload?.new;
        if (ev === 'INSERT') {
          if (novo?.id) agendamentosStatusRef.current.set(novo.id, normalizeStatus(novo.status));
          setNotifAgendamentos(prev => prev + 1);
        }
        if (ev === 'UPDATE') {
          if (novo?.id) agendamentosStatusRef.current.set(novo.id, normalizeStatus(novo.status));
        }
        scheduleDashboardRefresh();
      }).subscribe();
    return () => {
      if (realtimeRefreshTimerRef.current) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [negocio?.id, agProfIdsKey, hoje, parceiroProfissionalId]);


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

  const billingAnnouncement = souDono ? getBillingAnnouncement(billingStatus) : null;

  return (
    <div className="min-h-screen bg-black text-white">

      <div className="sticky top-0 z-50">
        <BillingAnnouncementBar announcement={billingAnnouncement} />

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
            icon={<span style={{ fontFamily: 'Roboto Condensed, sans-serif' }} className="text-green-400 font-normal text-3xl leading-none">$</span>}
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
            label={tabEntregasLabel}
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
          <style>{`
            @keyframes announcement-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            .announcement-bar-wrapper { display: flex; width: max-content; animation: announcement-scroll 50s linear infinite; }
            .announcement-bar-wrapper:hover { animation-play-state: paused; }
            .announcement-bar-track a { position: relative; z-index: 10; cursor: pointer; display: inline-block; }
            @media (prefers-reduced-motion: reduce) { .announcement-bar-wrapper { animation: none; } }
          `}</style>
        </div>

        <div className="bg-dark-100 border border-gray-800 rounded-custom overflow-hidden">
          <div className="flex overflow-x-auto border-b border-gray-800">
            {tabs.map(tab => {
              const notif = tab === 'agendamentos' ? notifAgendamentos : 0;
              return (
                <button key={tab}
                  onClick={() => { setActiveTab(tab); if (tab === 'agendamentos') setNotifAgendamentos(0); }}
                  className={`relative flex-shrink-0 px-6 py-4 text-sm transition-all uppercase font-normal ${activeTab === tab ? 'bg-primary/20 text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}>
                  {TAB_LABELS[tab]}
                  {notif > 0 && (<span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-black text-[10px] font-bold flex items-center justify-center leading-none">{notif > 99 ? '99+' : notif}</span>)}
                </button>
              );
            })}
          </div>

          <div className="p-6">

            {activeTab === 'visao-geral' && (
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
                canSendReminder={souDono}
                negocioNome={negocio?.nome || ''}
                confirmarAtendimento={confirmarAtendimento}
                cancelarAgendamento={cancelarAgendamento}
                hasMore={agendamentosHasMore}
                loadingMore={agendamentosLoadingMore}
                onLoadMore={loadMoreAgendamentos}
              />
            )}

            {activeTab === 'historico' && (
              <HistoricoSection
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

            {activeTab === 'clientes' && (
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

            {activeTab === 'entregas' && (
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
                counterSingular={counterSingular}
                counterPlural={counterPlural}
                emptyListMsg={emptyListMsg}
                checarPermissao={checarPermissao}
                deleteEntrega={deleteEntrega}
                toggleStatusEntrega={toggleStatusEntrega}
              />
            )}

            {activeTab === 'profissionais' && (
              <ProfissionaisSection
                souDono={souDono}
                adminJaEhProfissional={adminJaEhProfissional}
                cadastrarAdminComoProfissional={cadastrarAdminComoProfissional}
                submittingAdminProf={submittingAdminProf}
              profissionais={profissionais}
              todayDow={serverNow?.dow ?? null}
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
        show={showNovaEntrega}
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
