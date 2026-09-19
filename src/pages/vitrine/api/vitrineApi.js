import { supabase } from '../../../supabase';
import { withTimeout } from '../../../utils/withTimeout';
import { withAuthRetry } from '../../../utils/authSession';

export function getPublicUrl(bucket, path) {
  if (!path) return null;
  try {
    const stripped = path.replace(new RegExp(`^${bucket}/`), '');
    const { data } = supabase.storage.from(bucket).getPublicUrl(stripped);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

export async function fetchOfficialDate(rpcSequence) {
  let lastErr = null;

  for (const rpcName of rpcSequence) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { data, error } = await withTimeout(
        supabase.rpc(rpcName),
        6000,
        `data-oficial:${rpcName}`
      );
      if (error) {
        lastErr = error;
        continue;
      }

      const payload = data?.[0] ?? data;
      if (!payload?.date) {
        lastErr = new Error(`${rpcName} vazio`);
        continue;
      }

      return {
        ts: payload?.ts ?? null,
        dow: Number(payload?.dow ?? 0),
        date: String(payload.date),
        source: payload?.source || rpcName,
        minutes: Number(payload?.minutes ?? 0),
      };
    }
  }

  throw lastErr || new Error('Falha ao obter horario oficial');
}

export async function fetchVitrineNegocioBySlug(slug) {
  const { data, error } = await withTimeout(
    supabase.rpc('get_negocio_vitrine_by_slug', { p_slug: slug }),
    7000,
    'negocio'
  );
  if (error) throw error;
  return data?.[0] || null;
}

export async function fetchVitrineProfissionais(negocioId) {
  const { data, error } = await withTimeout(
    supabase.rpc('get_profissionais_vitrine', { p_negocio_id: negocioId }),
    7000,
    'profissionais'
  );
  if (error) throw error;
  return data || [];
}

export async function fetchBusinessBookingAvailability(negocioId) {
  const { data, error } = await withTimeout(
    supabase.rpc('get_business_booking_availability', { p_negocio_id: negocioId }),
    7000,
    'booking-availability'
  );
  if (error) throw error;
  return data || null;
}

function normalizeEntregaPageRows(rows) {
  return (rows || []).map((row) => {
    const normalized = { ...row };
    delete normalized.total_count;
    return normalized;
  });
}

export async function fetchVitrineEntregasPage(profissionalId, { limit = 4, offset = 0 } = {}) {
  if (!profissionalId) return { rows: [], totalCount: 0 };
  const { data, error } = await withTimeout(
    supabase.rpc('get_entregas_vitrine_paginadas', {
      p_profissional_id: profissionalId,
      p_limit: Math.max(1, Number(limit) || 1),
      p_offset: Math.max(0, Number(offset) || 0),
    }),
    7000,
    'entregas-vitrine'
  );
  if (error) throw error;
  return {
    rows: normalizeEntregaPageRows(data),
    totalCount: Number(data?.[0]?.total_count || 0),
  };
}

export async function fetchVitrineEntregasFirstPages(negocioId, profissionalIds, { limit = 4 } = {}) {
  const ids = Array.isArray(profissionalIds) ? profissionalIds.filter(Boolean) : [];
  if (!negocioId || !ids.length) return [];

  const { data, error } = await withTimeout(
    supabase.rpc('get_entregas_vitrine_primeiras_paginas', {
      p_negocio_id: negocioId,
      p_profissional_ids: ids,
      p_limit: Math.max(1, Number(limit) || 1),
    }),
    7000,
    'entregas-vitrine-first-pages'
  );
  if (error) throw error;
  return data || [];
}

export async function fetchVitrineEntregaById({ entregaId, profissionalId }) {
  if (!entregaId || !profissionalId) return null;
  const { data, error } = await withTimeout(
    supabase
      .from('entregas')
      .select('id, negocio_id, profissional_id, nome, duracao_minutos, preco, preco_promocional, ativo')
      .eq('id', entregaId)
      .eq('profissional_id', profissionalId)
      .eq('ativo', true)
      .is('excluido_em', null)
      .is('motivo_excluido', null)
      .maybeSingle(),
    7000,
    'entrega-vitrine-id'
  );
  if (error) throw error;
  if (!data) return null;
  const preco = Number(data.preco ?? 0);
  const promo = Number(data.preco_promocional ?? 0);
  const temPromo = Number.isFinite(promo) && promo > 0 && promo < preco;
  return {
    ...data,
    preco_final: temPromo ? promo : preco,
  };
}

export async function fetchVitrineGaleria(negocioId, { limit = null, offset = 0 } = {}) {
  const { data, error } = await withTimeout(
    supabase.rpc('get_galerias_vitrine', {
      p_negocio_id: negocioId,
      p_limit: limit == null ? null : Math.max(1, Number(limit) || 1),
      p_offset: Math.max(0, Number(offset) || 0),
    }),
    7000,
    'galerias'
  );
  if (error) throw error;
  return data || [];
}

export async function fetchVitrineDepoimentos(negocioId, { limit = null, offset = 0 } = {}) {
  const params = { p_negocio_id: negocioId };
  if (limit != null) {
    params.p_limit = Math.max(1, Number(limit) || 1);
    params.p_offset = Math.max(0, Number(offset) || 0);
  }

  const { data, error } = await withTimeout(
    supabase.rpc('get_depoimentos_vitrine', params),
    7000,
    'depoimentos'
  );
  if (error) throw error;
  return (data || []).map((d) => ({
    ...d,
    users: d.cliente_nome
      ? { nome: d.cliente_nome, avatar_path: d.cliente_avatar_path, type: d.cliente_type }
      : null,
    profissionais: d.profissional_nome ? { nome: d.profissional_nome } : null,
    entrega_nome: d.entrega_nome || null,
    agendamento_data: d.agendamento_data || null,
  }));
}

export async function fetchFavoritoNegocio({ clienteId, negocioId }) {
  const { data, error } = await withAuthRetry(
    () => supabase
      .from('favoritos')
      .select('id')
      .eq('cliente_id', clienteId)
      .eq('tipo', 'negocio')
      .eq('negocio_id', negocioId)
      .maybeSingle(),
    6000,
    'favorito'
  );
  if (error) throw error;
  return !!data;
}

export async function fetchCurrentClienteId() {
  const { data, error } = await withAuthRetry(
    () => supabase.rpc('get_current_cliente_id'),
    6000,
    'cliente-atual'
  );
  if (error) throw error;
  return data || null;
}

export async function addFavoritoNegocio({ clienteId, negocioId }) {
  const { error } = await withAuthRetry(
    () => supabase
      .from('favoritos')
      .insert({ cliente_id: clienteId, tipo: 'negocio', negocio_id: negocioId, profissional_id: null }),
    6000,
    'favorito-insert'
  );
  if (error) throw error;
}

export async function removeFavoritoNegocio({ clienteId, negocioId }) {
  const { error } = await withAuthRetry(
    () => supabase
      .from('favoritos')
      .delete()
      .eq('cliente_id', clienteId)
      .eq('tipo', 'negocio')
      .eq('negocio_id', negocioId),
    6000,
    'favorito-delete'
  );
  if (error) throw error;
}

export async function createDepoimento({ negocioId, nota, comentario }) {
  const { error } = await withAuthRetry(
    () => supabase.rpc('create_depoimento_negocio', {
      p_negocio_id: negocioId,
      p_nota: nota,
      p_comentario: comentario ?? null,
    }),
    7000,
    'enviar-depoimento'
  );
  if (error) throw error;
}
