import { supabase } from '../../../supabase';
import { withAuthRetry } from '../../../utils/authSession';
import { invokeProtectedAction } from '../../../utils/protectedAction';
import { fetchOfficialDatePayload } from '../../../utils/officialDate';
import { BUSINESS_SELECT_FIELDS, mapBusinessRow, toBusinessDbPatch } from '../../../api/negociosApi';
export { getPublicUrl } from '../../../utils/storage';

function isAdminExcludedProfessional(row) {
  return row?.status === 'excluido';
}

function getClienteTelefone(row) {
  return String(row?.client_phone ?? row?.cliente_telefone ?? '').trim();
}

function newStableRowId() {
  return globalThis.crypto.randomUUID();
}

async function insertWithStableId(table, payload, ms, label) {
  const stablePayload = { id: payload.id || newStableRowId(), ...payload };
  const { error } = await withAuthRetry(
    () => supabase.from(table).insert([stablePayload]),
    ms,
    label
  );

  if (!error) return stablePayload.id;

  if (error.code === '23505') {
    const { data: existing, error: lookupError } = await withAuthRetry(
      () => supabase.from(table).select('id').eq('id', stablePayload.id).maybeSingle(),
      ms,
      `${label}:confirm`
    );
    if (!lookupError && existing?.id === stablePayload.id) return stablePayload.id;
  }

  throw error;
}

async function normalizeFunctionError(error) {
  if (!error) return error;

  const response = error.context;
  if (!response || typeof response.clone !== 'function') return error;

  let payload = null;
  try {
    payload = await response.clone().json();
  } catch {
    try {
      const text = await response.clone().text();
      payload = text ? { error: text } : null;
    } catch {
      payload = null;
    }
  }

  const message = payload?.error || payload?.message || error.message;
  const nextError = new Error(String(message || 'edge_function_error'));
  nextError.name = error.name;
  nextError.code = payload?.code || error.code;
  nextError.details = payload?.details || error.details;
  nextError.hint = payload?.hint || error.hint;
  nextError.status = response.status || error.status;
  nextError.context = response;
  nextError.payload = payload;
  return nextError;
}


function mapDashboardAvailabilityRow(row) {
  return {
    id: row.id,
    dia_semana: row.day_of_week,
    ativo: row.is_active,
    horario_inicio: row.start_time,
    horario_fim: row.end_time,
    pausa_inicio: row.break_start_time,
    pausa_fim: row.break_end_time,
  };
}

function mapAvailabilityToDb(row) {
  return {
    day_of_week: row.dia_semana,
    is_active: row.ativo,
    start_time: row.horario_inicio,
    end_time: row.horario_fim,
    break_start_time: row.pausa_inicio,
    break_end_time: row.pausa_fim,
  };
}

function mapDashboardDayMetrics(d) {
  if (!d) return null;
  return {
    date: d.date,
    total: d.total,
    cancelados: d.canceled,
    concluidos: d.completed,
    faturamento: d.revenue,
    faturamento_str: d.revenue_str,
    ticket_medio: d.average_ticket,
    ticket_medio_str: d.average_ticket_str,
    taxa_cancelamento: d.cancellation_rate,
    taxa_cancelamento_str: d.cancellation_rate_str,
    taxa_fechamento: d.completion_rate,
    taxa_fechamento_str: d.completion_rate_str,
    por_profissional: Array.isArray(d.by_professional)
      ? d.by_professional.map((p) => ({
          nome: p.name,
          faturamento: p.revenue,
          faturamento_str: p.revenue_str,
        }))
      : [],
  };
}

function mapDashboardTopCards(tc) {
  if (!tc) return null;
  return {
    faturamento_hoje: tc.revenue_today
      ? { valor: tc.revenue_today.amount, comparativo_percentual: tc.revenue_today.delta_percent }
      : null,
    agendamentos_hoje: tc.appointments_today
      ? { total: tc.appointments_today.total, comparativo_percentual: tc.appointments_today.delta_percent }
      : null,
    profissionais: tc.professionals
      ? {
          total: tc.professionals.total,
          ativos: tc.professionals.active,
          ...(tc.professionals.inactive !== undefined ? { inativos: tc.professionals.inactive } : {}),
          ...(tc.professionals.pending !== undefined ? { pendentes: tc.professionals.pending } : {}),
        }
      : null,
    entregas: tc.services
      ? { total: tc.services.total, valor_medio: tc.services.average_price }
      : null,
  };
}

function mapDashboardPeriodMetrics(p) {
  if (!p) return null;
  return {
    ref_date: p.ref_date,
    periodo: p.period,
    month: p.month,
    month_label: p.month_label,
    start_date: p.start_date,
    end_date: p.end_date,
    previous_start_date: p.previous_start_date,
    previous_end_date: p.previous_end_date,
    total: p.total,
    cancelados: p.canceled,
    concluidos: p.completed,
    faturamento: p.revenue,
    faturamento_str: p.revenue_str,
    media_por_atendimento: p.average_per_appointment,
    media_por_atendimento_str: p.average_per_appointment_str,
    por_profissional: Array.isArray(p.by_professional)
      ? p.by_professional.map((item) => ({
          profissional_id: item.professional_id,
          nome: item.name,
          concluidos: item.completed,
          faturamento: item.revenue,
          faturamento_str: item.revenue_str,
          faturamento_anterior: item.previous_revenue,
          comparativo_percentual: item.delta_percent,
        }))
      : [],
  };
}

function mapDashboardNextDaySchedule(n) {
  if (!n) return null;
  return {
    ref_date: n.ref_date,
    amanha: n.tomorrow_date,
    minutos_totais: n.total_minutes,
    minutos_disponiveis: n.available_minutes,
    minutos_ocupados: n.occupied_minutes,
    minutos_ociosos: n.idle_minutes,
    horas_totais: n.total_hours,
    horas_disponiveis: n.available_hours,
    horas_ocupadas: n.occupied_hours,
    horas_ociosas: n.idle_hours,
    agendamentos_validos: n.valid_appointments,
    cancelados: n.canceled_appointments,
    percentual_tempo_reservado: n.reserved_time_percent,
    percentual_tempo_reservado_str: n.reserved_time_percent_str,
    por_profissional: Array.isArray(n.by_professional)
      ? n.by_professional.map((pp) => ({
          profissional_id: pp.professional_id,
          nome: pp.name,
          minutos_totais: pp.total_minutes,
          minutos_disponiveis: pp.available_minutes,
          minutos_ocupados: pp.occupied_minutes,
          minutos_ociosos: pp.idle_minutes,
          horas_totais: pp.total_hours,
          horas_disponiveis: pp.available_hours,
          horas_ocupadas: pp.occupied_hours,
          horas_ociosas: pp.idle_hours,
          agendamentos_validos: pp.valid_appointments,
          cancelados: pp.canceled_appointments,
          percentual_tempo_reservado: pp.reserved_time_percent,
          percentual_tempo_reservado_str: pp.reserved_time_percent_str,
        }))
      : [],
  };
}

function mapDashboardFutureBookings(f) {
  if (!f) return null;
  return {
    ref_date: f.ref_date,
    amanha: f.tomorrow_date,
    total_agendamentos: f.total_appointments,
    receita_projetada: f.projected_revenue,
    receita_projetada_str: f.projected_revenue_str,
    ticket_medio: f.average_ticket,
    ticket_medio_str: f.average_ticket_str,
    por_profissional: Array.isArray(f.by_professional)
      ? f.by_professional.map((pp) => ({
          profissional_id: pp.professional_id,
          nome: pp.name,
          total_agendamentos: pp.total_appointments,
          receita_projetada: pp.projected_revenue,
          receita_projetada_str: pp.projected_revenue_str,
        }))
      : [],
  };
}

export function normalizeAgRow(a) {
  const profId = a?.prof_id ?? a?.professional_id ?? a?.profissional_id ?? null;
  const profNome = a?.professional_name ?? a?.prof_nome ?? a?.profissional_nome ?? null;
  const valorFinal = a?.final_price ?? a?.valor_final ?? a?.valor ?? null;

  return {
    id: a?.id ?? null,
    negocio_id: a?.business_id ?? a?.negocio_id ?? null,
    profissional_id: a?.professional_id ?? a?.profissional_id ?? null,
    cliente_id: a?.client_id ?? a?.cliente_id ?? null,
    entrega_id: a?.service_id ?? a?.entrega_id ?? null,
    data: a?.date ?? a?.data ?? null,
    horario_inicio: a?.start_time ?? a?.horario_inicio ?? null,
    horario_fim: a?.end_time ?? a?.horario_fim ?? null,
    status: a?.status ?? null,
    created_at: a?.created_at ?? null,
    cancelado_em: a?.canceled_at ?? a?.cancelado_em ?? null,
    concluido_em: a?.completed_at ?? a?.concluido_em ?? null,
    valor_final: valorFinal,
    updated_at: a?.updated_at ?? null,
    lembrete_enviado: a?.reminder_sent ?? a?.lembrete_enviado ?? null,
    entregas: {
      nome: a?.service_name ?? a?.entrega_nome ?? null,
      valor: a?.service_price ?? a?.entrega_valor ?? null,
      valor_oferta: a?.service_offer_price ?? a?.entrega_valor_oferta ?? null,
    },
    profissionais: {
      id: profId,
      nome: profNome,
    },
    cliente: {
      id: a?.client_id ?? a?.cliente_id ?? null,
      nome: a?.client_name ?? a?.cliente_nome ?? null,
      telefone: getClienteTelefone(a),
      avatar_path: a?.client_avatar_path ?? a?.cliente_avatar ?? null,
      type: a?.client_type ?? a?.cliente_type ?? null,
    },
  };
}

export async function fetchOfficialDate(rpcNames) {
  const { payload, rpcName } = await fetchOfficialDatePayload(
    rpcNames,
    (name) => withAuthRetry(() => supabase.rpc(name), 6000, `data-oficial:${name}`)
  );

  return {
    ...payload,
    source: payload?.source || rpcName,
  };
}

export async function fetchNegocioById(negocioId) {
  const { data, error } = await withAuthRetry(
    () => supabase
      .from('businesses')
      .select(BUSINESS_SELECT_FIELDS)
      .eq('id', negocioId)
      .maybeSingle(),
    6000,
    'negocio-by-id'
  );

  if (error) throw error;
  return mapBusinessRow(data);
}

export async function fetchOwnerNegocio(ownerId) {
  const { data, error } = await withAuthRetry(
    () => supabase
      .from('businesses')
      .select(BUSINESS_SELECT_FIELDS)
      .eq('owner_id', ownerId)
      .maybeSingle(),
    6000,
    'negocio-owner'
  );

  if (error) throw error;
  return mapBusinessRow(data);
}

export async function fetchBillingPlans() {
  const { data, error } = await withAuthRetry(
    () => supabase
      .from('billing_plans')
      .select('code, name, price_cents, currency, max_profissionais, trial_days, grace_days, sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true }),
    6000,
    'billing-plans'
  );

  if (error) throw error;
  return data || [];
}

export async function fetchBusinessBillingStatus(negocioId) {
  const { data, error } = await withAuthRetry(
    () => supabase.rpc('get_business_billing_status', {
      p_business_id: negocioId,
    }),
    6000,
    'billing-status'
  );
  if (error) throw error;
  return data || null;
}

export async function createAsaasCheckout(negocioId, planCode) {
  const { data, error } = await withAuthRetry(
    () => supabase.functions.invoke('asaas-create-checkout', {
      body: {
        business_id: negocioId,
        plan_code: planCode,
      },
    }),
    25000,
    'asaas-checkout'
  );

  if (error) throw await normalizeFunctionError(error);
  if (!data?.checkout_url && !data?.billing_status) throw new Error('checkout_url_missing');
  return data;
}

export async function reactivateAsaasSubscription(negocioId) {
  const { data, error } = await withAuthRetry(
    () => supabase.functions.invoke('asaas-reactivate-subscription', {
      body: { business_id: negocioId },
    }),
    40000,
    'asaas-reactivate-subscription'
  );
  if (error) throw await normalizeFunctionError(error);
  if (!data?.billing_status) throw new Error('billing_status_missing');
  return data;
}

export async function cancelAsaasSubscription(negocioId) {
  const { data, error } = await withAuthRetry(
    () => supabase.functions.invoke('asaas-cancel-subscription', {
      body: {
        business_id: negocioId,
      },
    }),
    40000,
    'asaas-cancel-subscription'
  );

  if (error) throw await normalizeFunctionError(error);
  if (!data?.billing_status) throw new Error('billing_status_missing');
  return data;
}
export async function cancelAsaasPlanDowngrade(negocioId) {
  const { data, error } = await withAuthRetry(
    () => supabase.functions.invoke('asaas-cancel-downgrade', {
      body: {
        business_id: negocioId,
      },
    }),
    25000,
    'asaas-cancel-downgrade'
  );

  if (error) throw await normalizeFunctionError(error);
  if (!data?.billing_status) throw new Error('billing_status_missing');
  return data;
}

export async function cancelAsaasCheckout(negocioId) {
  const { data, error } = await withAuthRetry(
    () => supabase.functions.invoke('asaas-cancel-checkout', {
      body: {
        business_id: negocioId,
      },
    }),
    25000,
    'asaas-cancel-checkout'
  );

  if (error) throw await normalizeFunctionError(error);
  if (!data?.billing_status) throw new Error('billing_status_missing');
  return data;
}

export async function recoverAsaasSubscriptionPayment(negocioId) {
  const { data, error } = await withAuthRetry(
    () => supabase.functions.invoke('asaas-recover-subscription-payment', {
      body: { business_id: negocioId },
    }),
    12000,
    'asaas-subscription-payment-recovery'
  );

  if (error) throw await normalizeFunctionError(error);
  if (!data?.invoice_url) throw new Error('subscription_invoice_url_missing');
  return data;
}
export async function fetchPartnerNegocioIds(userId) {
  const { data, error } = await withAuthRetry(
    () => supabase
      .from('professionals')
      .select('business_id, created_at')
      .eq('user_id', userId)
      .eq('status', 'ativo')
      .order('created_at', { ascending: false }),
    6000,
    'partner-businesses'
  );

  if (error) throw error;
  return [...new Set((data || []).map((item) => item.business_id).filter(Boolean))];
}

export async function fetchGallery(businessId, { limit = null, cursor = null } = {}) {
  const buildGaleriaQuery = () => {
    let query = supabase
      .from('galleries')
      .select('id, path, sort_order, created_at')
      .eq('business_id', businessId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

    if (cursor?.id) {
      const ordem = Number(cursor.ordem ?? 0);
      query = query.or(
        `sort_order.gt.${ordem},and(sort_order.eq.${ordem},created_at.gt.${cursor.created_at}),and(sort_order.eq.${ordem},created_at.eq.${cursor.created_at},id.gt.${cursor.id})`
      );
    }

    if (limit != null) query = query.limit(Math.max(1, Number(limit) || 1));

    return query;
  };

  const { data, error } = await withAuthRetry(() => buildGaleriaQuery(), 6000, 'galerias-dashboard');

  return { data: (data || []).map(({ sort_order, ...row }) => ({ ...row, ordem: sort_order })), error };
}

export async function fetchProfissionaisComStatus(negocioId) {
  const { data, error } = await withAuthRetry(
    () => supabase.rpc('get_professionals_with_status', { p_business_id: negocioId }),
    6000,
    'profissionais-status'
  );
  if (error) throw error;
  return (data || [])
    .map((row) => ({
      id: row.id,
      negocio_id: row.business_id,
      nome: row.name,
      oficio: row.occupation,
      anos_experiencia: row.years_experience,
      horarios: Array.isArray(row.availability) ? row.availability.map(mapDashboardAvailabilityRow) : [],
      status: row.status,
      motivo_inativo: row.inactive_reason,
      created_at: row.created_at,
      user_id: row.user_id,
      status_label: row.status_label,
      status_key: row.status_key,
    }))
    .filter((row) => !isAdminExcludedProfessional(row));
}

export async function fetchProfissionaisEquipe(negocioId) {
  const { data, error } = await withAuthRetry(
    () => supabase.rpc('get_dashboard_team_professionals', { p_business_id: negocioId }),
    6000,
    'profissionais-equipe'
  );
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    negocio_id: row.business_id,
    nome: row.name,
    oficio: row.occupation,
    anos_experiencia: row.years_experience,
    horarios: Array.isArray(row.availability) ? row.availability.map(mapDashboardAvailabilityRow) : [],
    status: row.status,
    created_at: row.created_at,
    status_label: row.status_label,
    status_key: row.status_key,
    total_entregas: row.total_services,
  }));
}

export async function excluirProfissionalParceiroSeguramente(profissionalId) {
  const { data, error } = await withAuthRetry(
    () => invokeProtectedAction('delete_partner_professional', { p_professional_id: profissionalId }),
    6500,
    'excluir-profissional-parceiro'
  );
  if (error) throw error;
  return data;
}

export async function excluirNegocioSeguramente(negocioId) {
  const { data, error } = await withAuthRetry(
    () => invokeProtectedAction('delete_business', { p_business_id: negocioId }),
    6500,
    'excluir-negocio'
  );
  if (error) throw error;
  return data;
}

export async function excluirEntregaSeguramente(entregaId) {
  const { data, error } = await withAuthRetry(
    () => invokeProtectedAction('delete_service', { p_service_id: entregaId }),
    6500,
    'excluir-entrega'
  );
  if (error) throw error;
  return data;
}

export async function inativarEntregaSeguramente(entregaId) {
  const { data, error } = await withAuthRetry(
    () => invokeProtectedAction('deactivate_service', { p_service_id: entregaId }),
    6500,
    'inativar-entrega'
  );
  if (error) throw error;
  return data;
}

export async function ativarEntregaSeguramente(entregaId) {
  const { data, error } = await withAuthRetry(
    () => invokeProtectedAction('activate_service', { p_service_id: entregaId }),
    6500,
    'ativar-entrega'
  );
  if (error) throw error;
  return data;
}

export async function aprovarParceiroProfissional(profissionalId, negocioId) {
  const { data, error } = await withAuthRetry(
    () => invokeProtectedAction('approve_partner_professional', {
      p_professional_id: profissionalId,
      p_business_id: negocioId,
    }),
    6500,
    'aprovar-parceiro'
  );
  if (error) throw error;
  return data;
}

export async function concluirAgendamentoProfissional(agendamentoId) {
  const { data, error } = await withAuthRetry(
    () => invokeProtectedAction('complete_professional_booking', { p_appointment_id: agendamentoId }),
    6500,
    'concluir-agendamento'
  );
  if (error) throw error;
  return data;
}

export async function cancelarAgendamentoProfissional(agendamentoId) {
  const { data, error } = await withAuthRetry(
    () => invokeProtectedAction('cancel_professional_booking', { p_appointment_id: agendamentoId }),
    6500,
    'cancelar-agendamento-profissional'
  );
  if (error) throw error;
  return data;
}

export async function fetchEntregasPage({
  negocioId,
  profissionalId,
  limit = 6,
  cursor = null,
}) {
  if (!negocioId || !profissionalId) return { rows: [], totalCount: 0 };
  const { data, error } = await withAuthRetry(
    () => supabase.rpc('get_dashboard_services_page', {
      p_business_id: negocioId,
      p_professional_id: profissionalId,
      p_limit: Math.max(1, Number(limit) || 1),
      p_cursor_is_active: cursor?.ativo ?? null,
      p_cursor_price: cursor?.valor ?? null,
      p_cursor_id: cursor?.id ?? null,
    }),
    7000,
    'entregas-dashboard-page'
  );

  if (error) throw error;
  const rows = (data || []).map((item) => ({
    id: item.id,
    negocio_id: item.business_id,
    profissional_id: item.professional_id,
    nome: item.name,
    tempo_minutos: item.duration_minutes,
    valor: item.price,
    valor_oferta: item.offer_price,
    ativo: item.is_active,
    created_at: item.created_at,
    profissionais: { id: item.prof_id ?? item.professional_id, nome: item.professional_name },
  }));
  return {
    rows,
    totalCount: Number(data?.[0]?.total_count || 0),
  };
}

export async function fetchEntregasFirstPages({
  negocioId,
  profissionalIds,
  limit = 6,
}) {
  const ids = Array.isArray(profissionalIds) ? profissionalIds.filter(Boolean) : [];
  if (!negocioId || !ids.length) return [];

  const { data, error } = await withAuthRetry(
    () => supabase.rpc('get_dashboard_services_initial_pages', {
      p_business_id: negocioId,
      p_professional_ids: ids,
      p_limit: Math.max(1, Number(limit) || 1),
    }),
    7000,
    'entregas-dashboard-first-pages'
  );

  if (error) throw error;
  return (data || []).map((item) => ({
    id: item.id,
    negocio_id: item.business_id,
    profissional_id: item.professional_id,
    nome: item.name,
    tempo_minutos: item.duration_minutes,
    valor: item.price,
    valor_oferta: item.offer_price,
    ativo: item.is_active,
    created_at: item.created_at,
    profissionais: { id: item.prof_id ?? item.professional_id, nome: item.professional_name },
    total_count: item.total_count,
  }));
}

export async function fetchAgendamentosNegocio({
  negocioId,
  profissionalIds,
  dataInicio,
  dataFim = null,
  limit = null,
  cursor = null,
}) {
  const { data, error } = await withAuthRetry(
    () => supabase.rpc('get_business_bookings', {
      p_business_id: negocioId,
      p_professional_ids: profissionalIds,
      p_start_date: dataInicio,
      p_end_date: dataFim,
      p_limit: limit,
      p_cursor_date: cursor?.data ?? null,
      p_cursor_start_time: cursor?.horario_inicio ?? null,
      p_cursor_id: cursor?.id ?? null,
    }),
    7000,
    'agendamentos-negocio'
  );

  if (error) throw error;
  return (data || []).map(normalizeAgRow);
}

export async function fetchClientesDashboard({
  negocioId,
  limit = 50,
  search = null,
  cursor = null,
}) {
  const { data, error } = await withAuthRetry(
    () => supabase.rpc('get_dashboard_clients', {
      p_business_id: negocioId,
      p_limit: limit,
      p_search: search,
      p_cursor_latest_date: cursor?.ultimo_data ?? null,
      p_cursor_latest_start_time: cursor?.ultimo_horario_inicio ?? null,
      p_cursor_latest_created_at: cursor?.ultimo_created_at ?? null,
      p_cursor_latest_appointment_id: cursor?.ultimo_agendamento_id ?? null,
      p_cursor_client_id: cursor?.cliente_id ?? null,
    }),
    7000,
    'clientes-dashboard'
  );

  if (error) throw error;
  return (data || []).map((row) => ({
    cliente_id: row.client_id,
    cliente_nome: row.client_name,
    cliente_avatar_path: row.client_avatar_path,
    ultimo_agendamento_id: row.latest_appointment_id,
    ultimo_profissional_id: row.latest_professional_id,
    ultimo_profissional_nome: row.latest_professional_name,
    ultimo_data: row.latest_date,
    ultimo_horario_inicio: row.latest_start_time,
    ultimo_created_at: row.latest_created_at,
    ultimo_entrega_nome: row.latest_service_name,
    ultimo_valor: row.latest_price,
  }));
}

export async function fetchDashboardOverview({
  negocioId,
  refDateISO,
  faturamentoDateISO,
  periodo = '7d',
  profissionalId = null,
}) {
  const params = {
    p_business_id: negocioId,
    p_ref_date: refDateISO,
    p_revenue_date: faturamentoDateISO || refDateISO,
    p_period: periodo || '7d',
  };
  if (profissionalId) params.p_professional_id = profissionalId;

  const { data, error } = await withAuthRetry(
    () => supabase.rpc('get_dashboard_overview', params),
    7000,
    'dashboard-overview'
  );
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));

  return {
    metricsHoje: { today: mapDashboardDayMetrics(data?.today) },
    metricsTopCards: mapDashboardTopCards(data?.top_cards),
    metricsDia: { selected_day: mapDashboardDayMetrics(data?.selected_day) },
    metricsPeriodoData: { period: mapDashboardPeriodMetrics(data?.period) },
    metricsAgendaDiaSeguinte: { agenda_dia_seguinte: mapDashboardNextDaySchedule(data?.next_day_schedule) },
    metricsFutureBookings: { future_bookings: mapDashboardFutureBookings(data?.future_bookings) },
    proximoAgendamento: data?.next_appointment ? normalizeAgRow(data.next_appointment) : null,
  };
}

export async function fetchUserNome(userId) {
  const { data, error } = await withAuthRetry(
    () => supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .maybeSingle(),
    6000,
    'user-nome'
  );
  if (error) throw error;
  return data || null;
}

export async function insertProfessional(payload) {
  return insertWithStableId('professionals', payload, 6000, 'professional-insert');
}

export async function updateNegocioLogo(negocioId, ownerId, logoPatch) {
  const { data, error } = await withAuthRetry(
    () => supabase.from('businesses').update(toBusinessDbPatch(logoPatch)).eq('id', negocioId).eq('owner_id', ownerId).select('id').maybeSingle(),
    6000,
    'negocio-logo-update'
  );
  if (error) throw error;
  if (!data?.id) throw new Error('logo_path_update_missing_business');
}

export async function updateNegocioInfo(negocioId, ownerId, payload) {
  const { error } = await withAuthRetry(
    () => supabase.from('businesses').update(toBusinessDbPatch(payload)).eq('id', negocioId).eq('owner_id', ownerId),
    6000,
    'negocio-info-update'
  );
  if (error) throw error;
}

export async function updateNegocioTema(negocioId, ownerId, tema) {
  const { data, error } = await withAuthRetry(
    () => supabase.from('businesses').update({ theme: tema }).eq('id', negocioId).eq('owner_id', ownerId).select('theme').single(),
    6000,
    'negocio-tema-update'
  );
  if (error) throw error;
  return data.theme;
}

export async function insertGalleryItem(businessId, path) {
  return insertWithStableId('galleries', { business_id: businessId, path }, 6000, 'galeria-insert');
}

export async function enqueueGalleryOrphanDelete(businessId, path) {
  const { error } = await withAuthRetry(
    () => supabase.rpc('enqueue_gallery_orphan_storage_delete', {
      p_business_id: businessId,
      p_path: path,
    }),
    6000,
    'galeria-enqueue-orphan-delete'
  );
  if (error) throw error;
}

export async function deleteGalleryItem(itemId) {
  const { error } = await withAuthRetry(
    () => supabase.from('galleries').delete().eq('id', itemId),
    6000,
    'galeria-delete'
  );
  if (error) throw error;
}

export async function insertEntrega(payload) {
  const { error } = await withAuthRetry(
    () => supabase.from('services').insert([payload]),
    6000,
    'entrega-insert'
  );
  if (error) throw error;
}

export async function updateEntregaById(entregaId, negocioId, payload) {
  const { error } = await withAuthRetry(
    () => supabase.from('services').update(payload).eq('id', entregaId).eq('business_id', negocioId),
    6000,
    'entrega-update'
  );
  if (error) throw error;
}

export async function updateProfissionalStatus(profissionalId, negocioId, status) {
  const { error } = await withAuthRetry(
    () => supabase
      .from('professionals')
      .update({ status })
      .eq('id', profissionalId)
      .eq('business_id', negocioId),
    6000,
    'profissional-status-update'
  );
  if (error) throw error;
}

export async function updateProfissionalComHorarios(profissionalId, payload) {
  const { error } = await withAuthRetry(
    () => supabase.rpc('update_professional_with_availability', {
      p_professional_id: profissionalId,
      p_name: payload.nome,
      p_occupation: payload.oficio,
      p_years_experience: payload.anos_experiencia,
      p_availability: Array.isArray(payload.horarios) ? payload.horarios.map(mapAvailabilityToDb) : payload.horarios,
    }),
    6500,
    'update-profissional-horarios'
  );
  if (error) throw error;
}
