import { supabase } from '../../../supabase';
import { withTimeout } from '../../../utils/withTimeout';

function isAdminRemovedProfessional(row) {
  return row?.status === 'excluido';
}

function getClienteTelefone(row) {
  return String(row?.cliente_telefone ?? '').trim();
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

export function getPublicUrl(bucket, path) {
  if (!bucket || !path) return null;
  try {
    const stripped = path.replace(new RegExp(`^${bucket}/`), '');
    const { data } = supabase.storage.from(bucket).getPublicUrl(stripped);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

export function normalizeAgRow(a) {
  const profId = a?.prof_id ?? a?.profissional_id ?? null;
  const profNome = a?.prof_nome ?? a?.profissional_nome ?? null;
  const precoFinal = a?.preco_final ?? a?.valor ?? null;

  return {
    ...a,
    data: a?.data ?? null,
    horario_inicio: a?.horario_inicio ?? null,
    horario_fim: a?.horario_fim ?? null,
    preco_final: precoFinal,
    entregas: {
      nome: a?.entrega_nome ?? null,
      preco: a?.entrega_preco ?? null,
      preco_promocional: a?.entrega_promo ?? null,
    },
    profissionais: {
      id: profId,
      nome: profNome,
    },
    cliente: {
      id: a?.cliente_id ?? null,
      nome: a?.cliente_nome ?? null,
      telefone: getClienteTelefone(a),
      avatar_path: a?.cliente_avatar ?? null,
      type: a?.cliente_type ?? null,
    },
  };
}

export async function fetchOfficialDate(rpcNames) {
  let lastErr = null;

  for (const rpcName of rpcNames) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await withTimeout(supabase.rpc(rpcName), 6000, `data-oficial:${rpcName}`);
      if (error) {
        lastErr = error;
        continue;
      }

      const payload = data?.[0] ?? data;
      if (!payload || !payload.date) {
        lastErr = new Error(`${rpcName} vazio`);
        continue;
      }

      return {
        ...payload,
        source: payload?.source || rpcName,
      };
    }
  }

  throw lastErr || new Error('Falha ao obter data oficial do banco');
}

export async function fetchOwnerBusinessCount(userId) {
  const { count, error } = await withTimeout(
    supabase
      .from('negocios')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId),
    6000,
    'negocios-count'
  );

  if (error) throw error;
  return Number(count || 0);
}

export async function fetchNegocioById(negocioId) {
  const { data, error } = await withTimeout(
    supabase
      .from('negocios')
      .select('*')
      .eq('id', negocioId)
      .maybeSingle(),
    6000,
    'negocio-by-id'
  );

  if (error) throw error;
  return data || null;
}

export async function fetchOwnerNegocio(ownerId) {
  const { data, error } = await withTimeout(
    supabase
      .from('negocios')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle(),
    6000,
    'negocio-owner'
  );

  if (error) throw error;
  return data || null;
}

export async function fetchBillingPlans() {
  const { data, error } = await withTimeout(
    supabase
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
  const { data, error } = await withTimeout(
    supabase.rpc('get_business_billing_status', {
      p_negocio_id: negocioId,
    }),
    6000,
    'billing-status'
  );
  if (error) throw error;
  return data || null;
}

export async function setBusinessPlan(negocioId, planCode) {
  const { data, error } = await withTimeout(
    supabase.rpc('set_business_plan', {
      p_negocio_id: negocioId,
      p_plan_code: planCode,
    }),
    6500,
    'set-plan'
  );
  if (error) throw error;
  return data || null;
}

export async function createAsaasCheckout(negocioId, planCode) {
  const { data, error } = await withTimeout(
    supabase.functions.invoke('asaas-create-checkout', {
      body: {
        negocio_id: negocioId,
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

export async function cancelAsaasSubscription(negocioId) {
  const { data, error } = await withTimeout(
    supabase.functions.invoke('asaas-cancel-subscription', {
      body: {
        negocio_id: negocioId,
      },
    }),
    8000,
    'asaas-cancel-subscription'
  );

  if (error) throw await normalizeFunctionError(error);
  if (!data?.billing_status) throw new Error('billing_status_missing');
  return data;
}

export async function fetchPartnerNegocioIds(userId) {
  const { data, error } = await withTimeout(
    supabase
      .from('profissionais')
      .select('negocio_id, created_at')
      .eq('user_id', userId)
      .eq('status', 'ativo')
      .order('created_at', { ascending: false }),
    6000,
    'partner-businesses'
  );

  if (error) throw error;
  return [...new Set((data || []).map((item) => item.negocio_id).filter(Boolean))];
}

export async function fetchGaleria(negocioId, { limit = null, offset = 0 } = {}) {
  let query = supabase
    .from('galerias')
    .select('id, path, ordem')
    .eq('negocio_id', negocioId)
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true });

  if (limit != null) {
    const from = Math.max(0, Number(offset) || 0);
    const to = from + Math.max(1, Number(limit) || 1) - 1;
    query = query.range(from, to);
  }

  const { data, error } = await withTimeout(query, 6000, 'galerias-dashboard');

  return { data: data || [], error };
}

export async function fetchProfissionaisComStatus(negocioId) {
  const { data, error } = await withTimeout(
    supabase.rpc('get_profissionais_com_status', { p_negocio_id: negocioId }),
    6000,
    'profissionais-status'
  );
  if (error) throw error;
  return (data || []).filter((row) => !isAdminRemovedProfessional(row));
}

export async function removeProfissionalSeguramente(profissionalId) {
  const { data, error } = await withTimeout(
    supabase.rpc('remove_profissional_seguro', { p_profissional_id: profissionalId }),
    6500,
    'remove-profissional'
  );
  if (error) throw error;
  return data;
}

export async function removeNegocioSeguramente(negocioId) {
  const { data, error } = await withTimeout(
    supabase.rpc('remove_negocio_seguro', { p_negocio_id: negocioId }),
    6500,
    'remove-negocio'
  );
  if (error) throw error;
  return data;
}

export async function removeEntregaSeguramente(entregaId) {
  const { data, error } = await withTimeout(
    supabase.rpc('remove_entrega_segura', { p_entrega_id: entregaId }),
    6500,
    'remove-entrega'
  );
  if (error) throw error;
  return data;
}

export async function inativarEntregaSeguramente(entregaId) {
  const { data, error } = await withTimeout(
    supabase.rpc('inativar_entrega_segura', { p_entrega_id: entregaId }),
    6500,
    'inativar-entrega'
  );
  if (error) throw error;
  return data;
}

export async function ativarEntregaSeguramente(entregaId) {
  const { data, error } = await withTimeout(
    supabase.rpc('ativar_entrega_segura', { p_entrega_id: entregaId }),
    6500,
    'ativar-entrega'
  );
  if (error) throw error;
  return data;
}

export async function aprovarParceiroProfissional(profissionalId, negocioId) {
  const { data, error } = await withTimeout(
    supabase.rpc('aprovar_parceiro_profissional', {
      p_profissional_id: profissionalId,
      p_negocio_id: negocioId,
    }),
    6500,
    'aprovar-parceiro'
  );
  if (error) throw error;
  return data;
}

export async function concluirAgendamentoProfissional(agendamentoId) {
  const { data, error } = await withTimeout(
    supabase.rpc('concluir_agendamento_profissional', { p_agendamento_id: agendamentoId }),
    6500,
    'concluir-agendamento'
  );
  if (error) throw error;
  return data;
}

export async function cancelarAgendamentoProfissional(agendamentoId) {
  const { data, error } = await withTimeout(
    supabase.rpc('cancelar_agendamento_profissional', { p_agendamento_id: agendamentoId }),
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
  offset = 0,
}) {
  if (!negocioId || !profissionalId) return { rows: [], totalCount: 0 };
  const { data, error } = await withTimeout(
    supabase.rpc('get_entregas_dashboard_paginadas', {
      p_negocio_id: negocioId,
      p_profissional_id: profissionalId,
      p_limit: Math.max(1, Number(limit) || 1),
      p_offset: Math.max(0, Number(offset) || 0),
    }),
    7000,
    'entregas-dashboard-page'
  );

  if (error) throw error;
  const rows = (data || []).map((item) => {
    const { prof_id: profId, prof_nome: profNome, ...row } = item;
    delete row.total_count;
    return {
      ...row,
      profissionais: { id: profId, nome: profNome },
    };
  });
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

  const { data, error } = await withTimeout(
    supabase.rpc('get_entregas_dashboard_primeiras_paginas', {
      p_negocio_id: negocioId,
      p_profissional_ids: ids,
      p_limit: Math.max(1, Number(limit) || 1),
    }),
    7000,
    'entregas-dashboard-first-pages'
  );

  if (error) throw error;
  return (data || []).map((item) => {
    const { prof_id: profId, prof_nome: profNome, ...row } = item;
    delete row.total_count;
    return {
      ...row,
      profissionais: { id: profId, nome: profNome },
      total_count: item.total_count,
    };
  });
}

export async function fetchAgendamentosNegocio({
  negocioId,
  profissionalIds,
  dataInicio,
  dataFim = null,
  limit = null,
  cursor = null,
}) {
  const { data, error } = await withTimeout(
    supabase.rpc('get_agendamentos_negocio', {
      p_negocio_id: negocioId,
      p_profissional_ids: profissionalIds,
      p_data_inicio: dataInicio,
      p_data_fim: dataFim,
      p_limit: limit,
      p_cursor_data: cursor?.data ?? null,
      p_cursor_horario: cursor?.horario_inicio ?? null,
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
  offset = 0,
  search = null,
}) {
  const { data, error } = await withTimeout(
    supabase.rpc('get_clientes_dashboard', {
      p_negocio_id: negocioId,
      p_limit: limit,
      p_offset: offset,
      p_search: search,
    }),
    7000,
    'clientes-dashboard'
  );

  if (error) throw error;
  return data || [];
}

export async function fetchDashboardOverview({
  negocioId,
  refDateISO,
  faturamentoDateISO,
  periodo = '7d',
  profissionalId = null,
}) {
  const params = {
    p_negocio_id: negocioId,
    p_ref_date: refDateISO,
    p_faturamento_date: faturamentoDateISO || refDateISO,
    p_periodo: periodo || '7d',
  };
  if (profissionalId) params.p_profissional_id = profissionalId;

  const { data, error } = await withTimeout(
    supabase.rpc('get_dashboard_overview', params),
    7000,
    'dashboard-overview'
  );
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));

  return {
    metricsHoje: { today: data?.today || null },
    metricsTopCards: data?.top_cards || null,
    metricsDia: { selected_day: data?.selected_day || null },
    metricsPeriodoData: { period: data?.period || null },
    metricsUtilizacao: { utilizacao: data?.utilizacao || null },
    metricsFutureBookings: { future_bookings: data?.future_bookings || null },
    proximoAgendamento: data?.proximo_agendamento ? normalizeAgRow(data.proximo_agendamento) : null,
  };
}

export async function fetchUserNome(userId) {
  const { data, error } = await withTimeout(
    supabase
      .from('users')
      .select('nome')
      .eq('id', userId)
      .maybeSingle(),
    6000,
    'user-nome'
  );
  if (error) throw error;
  return data || null;
}

export async function insertProfissional(payload) {
  const { error } = await withTimeout(
    supabase.from('profissionais').insert([payload]),
    6000,
    'profissional-insert'
  );
  if (error) throw error;
}

export async function updateNegocioLogo(negocioId, ownerId, logoPatch) {
  const { error } = await withTimeout(
    supabase.from('negocios').update(logoPatch).eq('id', negocioId).eq('owner_id', ownerId),
    6000,
    'negocio-logo-update'
  );
  if (error) throw error;
}

export async function updateNegocioInfo(negocioId, ownerId, payload) {
  const { error } = await withTimeout(
    supabase.from('negocios').update(payload).eq('id', negocioId).eq('owner_id', ownerId),
    6000,
    'negocio-info-update'
  );
  if (error) throw error;
}

export async function updateNegocioTema(negocioId, ownerId, tema) {
  const { error } = await withTimeout(
    supabase.from('negocios').update({ tema }).eq('id', negocioId).eq('owner_id', ownerId),
    6000,
    'negocio-tema-update'
  );
  if (error) throw error;
}

export async function insertGaleriaItem(negocioId, path) {
  const { error } = await withTimeout(
    supabase.from('galerias').insert({ negocio_id: negocioId, path }),
    6000,
    'galeria-insert'
  );
  if (error) throw error;
}

export async function enqueueGaleriaOrphanDelete(negocioId, path) {
  const { error } = await withTimeout(
    supabase.rpc('enqueue_galeria_orphan_storage_delete', {
      p_negocio_id: negocioId,
      p_path: path,
    }),
    6000,
    'galeria-enqueue-orphan-delete'
  );
  if (error) throw error;
}

export async function deleteGaleriaItem(itemId) {
  const { error } = await withTimeout(
    supabase.from('galerias').delete().eq('id', itemId),
    6000,
    'galeria-delete'
  );
  if (error) throw error;
}

export async function insertEntrega(payload) {
  const { error } = await withTimeout(
    supabase.from('entregas').insert([payload]),
    6000,
    'entrega-insert'
  );
  if (error) throw error;
}

export async function updateEntregaById(entregaId, negocioId, payload) {
  const { error } = await withTimeout(
    supabase.from('entregas').update(payload).eq('id', entregaId).eq('negocio_id', negocioId),
    6000,
    'entrega-update'
  );
  if (error) throw error;
}

export async function updateProfissionalStatus(profissionalId, negocioId, status, motivoInativo) {
  const { error } = await withTimeout(
    supabase
      .from('profissionais')
      .update({
        status,
        motivo_inativo: motivoInativo,
      })
      .eq('id', profissionalId)
      .eq('negocio_id', negocioId),
    6000,
    'profissional-status-update'
  );
  if (error) throw error;
}

export async function updateProfissionalComHorarios(profissionalId, payload) {
  const { error } = await withTimeout(
    supabase.rpc('update_profissional_com_horarios', {
      p_profissional_id: profissionalId,
      p_nome: payload.nome,
      p_profissao: payload.profissao,
      p_anos_experiencia: payload.anos_experiencia,
      p_horarios: payload.horarios,
    }),
    6500,
    'update-profissional-horarios'
  );
  if (error) throw error;
}
