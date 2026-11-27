import { supabase } from '../../../supabase';
import { withAuthRetry, withPublicAuthRetry } from '../../../utils/authSession';
import { invokeProtectedAction } from '../../../utils/protectedAction';
import { fetchOfficialDatePayload } from '../../../utils/officialDate';

export { getPublicUrl } from '../../../utils/storage';

export async function fetchOfficialDate(rpcSequence) {
  const { payload, rpcName } = await fetchOfficialDatePayload(
    rpcSequence,
    (name) => withPublicAuthRetry(() => supabase.rpc(name), 6000, `data-oficial:${name}`)
  );

  return {
    ts: payload?.ts ?? null,
    dow: Number(payload?.dow ?? 0),
    date: String(payload.date),
    source: payload?.source || rpcName,
    minutes: Number(payload?.minutes ?? 0),
  };
}

export async function fetchVitrineNegocioBySlug(slug) {
  const { data, error } = await withPublicAuthRetry(
    () => supabase.rpc('get_public_business_profile', { p_slug: slug }),
    7000,
    'negocio'
  );
  if (error) throw error;
  return data || null;
}

export async function fetchVitrineProfissionais(negocioId) {
  const { data, error } = await withPublicAuthRetry(
    () => supabase.rpc('get_profissionais_vitrine', { p_negocio_id: negocioId }),
    7000,
    'profissionais'
  );
  if (error) throw error;
  return data || [];
}

export async function fetchBusinessBookingAvailability(negocioId) {
  const { data, error } = await withPublicAuthRetry(
    () => supabase.rpc('get_business_booking_availability', { p_negocio_id: negocioId }),
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

export async function fetchVitrineEntregasPage(profissionalId, { limit = 4, cursor = null } = {}) {
  if (!profissionalId) return { rows: [], totalCount: 0 };
  const { data, error } = await withPublicAuthRetry(
    () => supabase.rpc('get_entregas_vitrine_paginadas', {
      p_profissional_id: profissionalId,
      p_limit: Math.max(1, Number(limit) || 1),
      p_cursor_valor_final: cursor?.valor_final ?? null,
      p_cursor_nome: cursor?.nome ?? null,
      p_cursor_id: cursor?.id ?? null,
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

  const { data, error } = await withPublicAuthRetry(
    () => supabase.rpc('get_entregas_vitrine_primeiras_paginas', {
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
  const { data: service, error } = await withPublicAuthRetry(
    () => supabase
      .from('services')
      .select('id, business_id, professional_id, name, duration_minutes, price, offer_price, is_active')
      .eq('id', entregaId)
      .eq('professional_id', profissionalId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .is('deletion_reason', null)
      .maybeSingle(),
    7000,
    'entrega-vitrine-id'
  );
  if (error) throw error;
  if (!service) return null;
  const data = {
    id: service.id,
    negocio_id: service.business_id,
    profissional_id: service.professional_id,
    nome: service.name,
    tempo_minutos: service.duration_minutes,
    valor: service.price,
    valor_oferta: service.offer_price,
    ativo: service.is_active,
  };
  const valor = Number(data.valor ?? 0);
  const oferta = Number(data.valor_oferta ?? 0);
  const temOferta = Number.isFinite(oferta) && oferta > 0 && oferta < valor;
  return {
    ...data,
    valor_final: temOferta ? oferta : valor,
  };
}

export async function fetchShowcaseGallery(businessId, { limit = null, cursor = null } = {}) {
  const { data, error } = await withPublicAuthRetry(
    () => supabase.rpc('get_gallery_images', {
      p_business_id: businessId,
      p_limit: limit == null ? null : Math.max(1, Number(limit) || 1),
      p_cursor_sort_order: cursor?.ordem ?? null,
      p_cursor_created_at: cursor?.created_at ?? null,
      p_cursor_id: cursor?.id ?? null,
    }),
    7000,
    'galerias'
  );
  if (error) throw error;
  return (data || []).map(({ sort_order, ...row }) => ({ ...row, ordem: sort_order }));
}

export async function fetchShowcaseReviews(businessId, { limit = null, cursor = null } = {}) {
  const params = { p_business_id: businessId };
  if (limit != null) params.p_limit = Math.max(1, Number(limit) || 1);
  if (cursor?.id) {
    params.p_cursor_created_at = cursor.created_at ?? null;
    params.p_cursor_id = cursor.id;
  }

  const { data, error } = await withPublicAuthRetry(
    () => supabase.rpc('get_showcase_reviews', params),
    7000,
    'depoimentos'
  );
  if (error) throw error;
  return (data || []).map((review) => ({
    id: review.id,
    professional_id: review.professional_id,
    rating: review.rating,
    comment: review.comment,
    created_at: review.created_at,
    users: review.client_name
      ? { nome: review.client_name, avatar_path: review.client_avatar_path, type: review.client_type }
      : null,
    profissionais: review.professional_name ? { nome: review.professional_name } : null,
    entrega_nome: review.service_name || null,
    agendamento_data: review.booking_date || null,
  }));
}

export async function fetchBusinessFavorite({ clientId, businessId }) {
  const { data, error } = await withAuthRetry(
    () => supabase
      .from('favorites')
      .select('id')
      .eq('client_id', clientId)
      .eq('favorite_type', 'negocio')
      .eq('business_id', businessId)
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

export async function addBusinessFavorite({ clientId, businessId }) {
  const { error } = await withAuthRetry(
    () => supabase
      .from('favorites')
      .insert({ client_id: clientId, favorite_type: 'negocio', business_id: businessId, professional_id: null }),
    6000,
    'favorito-insert'
  );
  if (error) throw error;
}

export async function removeBusinessFavorite({ clientId, businessId }) {
  const { error } = await withAuthRetry(
    () => supabase
      .from('favorites')
      .delete()
      .eq('client_id', clientId)
      .eq('favorite_type', 'negocio')
      .eq('business_id', businessId),
    6000,
    'favorito-delete'
  );
  if (error) throw error;
}

export async function createBusinessReview({ businessId, rating, comment }) {
  const { error } = await withAuthRetry(
    () => invokeProtectedAction('create_business_review', {
      p_business_id: businessId,
      p_rating: rating,
      p_comment: comment ?? null,
    }),
    7000,
    'enviar-depoimento'
  );
  if (error) throw error;
}
