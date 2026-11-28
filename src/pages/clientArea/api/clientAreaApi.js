import { supabase } from '../../../supabase';
import { withAuthRetry } from '../../../utils/authSession';
import { invokeProtectedAction } from '../../../utils/protectedAction';

export async function fetchClientePerfil(userId) {
  const { data, error } = await withAuthRetry(
    () => supabase
      .from('clients')
      .select('name, avatar_path, phone')
      .eq('user_id', userId)
      .eq('status', 'ativo')
      .maybeSingle(),
    6000,
    'cliente-perfil'
  );

  if (error) throw error;
  return {
    nome: String(data?.name || '').trim(),
    avatarPath: data?.avatar_path || null,
    telefone: String(data?.phone || '').trim(),
  };
}

export async function fetchCurrentClienteId() {
  const { data, error } = await withAuthRetry(
    () => supabase.rpc('get_current_client_id'),
    6000,
    'cliente-atual'
  );

  if (error) throw error;
  return data || null;
}

export async function fetchAgendamentosCliente({ clienteId, limit, cursor = null }) {
  const { data, error } = await withAuthRetry(
    () => supabase.rpc('get_client_bookings', {
      p_client_id: clienteId,
      p_limit: limit,
      p_cursor_date: cursor?.data ?? null,
      p_cursor_start_time: cursor?.horario_inicio ?? null,
      p_cursor_id: cursor?.id ?? null,
    }),
    7000,
    'agendamentos-cliente'
  );

  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    negocio_id: row.business_id,
    profissional_id: row.professional_id,
    entrega_id: row.service_id,
    cliente_id: row.client_id,
    data: row.date,
    horario_inicio: row.start_time,
    horario_fim: row.end_time,
    status: row.status,
    valor_final: row.final_price,
    created_at: row.created_at,
    entrega_nome: row.service_name,
    entrega_valor: row.service_price,
    entrega_valor_oferta: row.service_offer_price,
    profissional_nome: row.professional_name,
    negocio_nome: row.business_name,
    negocio_slug: row.business_slug,
    negocio_logo_path: row.business_logo_path,
    negocio_tipo: row.business_type,
  }));
}

export async function fetchClientFavorites({ clientId, limit, cursor = null }) {
  const { data, error } = await withAuthRetry(
    () => supabase.rpc('get_client_favorites', {
      p_client_id: clientId,
      p_limit: limit,
      p_cursor_created_at: cursor?.created_at ?? null,
      p_cursor_id: cursor?.id ?? null,
    }),
    7000,
    'favoritos-cliente'
  );

  if (error) throw error;
  return data || [];
}

export async function fetchReviewedBookings(bookingIds) {
  const ids = Array.isArray(bookingIds) ? bookingIds.filter(Boolean) : [];
  if (!ids.length) return [];

  const { data, error } = await withAuthRetry(
    () => supabase
      .from('reviews')
      .select('id, booking_id')
      .in('booking_id', ids),
    6000,
    'depoimentos-avaliados'
  );

  if (error) throw error;
  return data || [];
}

export async function createBookingReview({ bookingId, rating, comment }) {
  const { data, error } = await withAuthRetry(
    () => invokeProtectedAction('create_professional_review', {
      p_booking_id: bookingId,
      p_rating: rating,
      p_comment: comment ?? null,
    }),
    6500,
    'enviar-depoimento'
  );

  if (error) throw error;
  return data;
}

export async function cancelarAgendamentoCliente(agendamentoId) {
  const { data, error } = await withAuthRetry(
    () => invokeProtectedAction('cancel_client_booking', { p_appointment_id: agendamentoId }),
    6500,
    'cancelar-agendamento'
  );

  if (error) throw error;
  return data;
}

export async function excluirContaCliente() {
  const { data, error } = await withAuthRetry(
    () => invokeProtectedAction('delete_client_account'),
    6500,
    'excluir-conta'
  );

  if (error) throw error;
  return data;
}

export async function removeClientFavorite({ favoriteId, clientId }) {
  const { error } = await withAuthRetry(
    () => supabase
      .from('favorites')
      .delete()
      .eq('id', favoriteId)
      .eq('client_id', clientId),
    6000,
    'remover-favorito-cliente'
  );

  if (error) throw error;
}

export async function salvarAvatarCliente({ userId, path, file }) {
  let uploadedPath = null;
  try {
    const { error: uploadError } = await withAuthRetry(
      () => supabase.storage.from('avatars').upload(path, file, { upsert: false, contentType: file.type }),
      10000,
      'avatar-upload'
    );
    if (uploadError) throw uploadError;
    uploadedPath = path;

    const { data: updatedClient, error: updateError } = await withAuthRetry(
      () => supabase.from('clients')
        .update({ avatar_path: path })
        .eq('user_id', userId)
        .eq('status', 'ativo')
        .select('id')
        .maybeSingle(),
      6000,
      'avatar-path-update'
    );
    if (updateError) throw updateError;
    if (!updatedClient?.id) throw new Error('avatar_path_update_missing_client');
    return path;
  } catch (error) {
    if (uploadedPath) {
      try {
        const { error: queueError } = await withAuthRetry(
          () => supabase.rpc('enqueue_owned_orphan_storage_delete', {
            p_bucket: 'avatars',
            p_path: uploadedPath,
          }),
          6000,
          'avatar-enqueue-orphan-delete'
        );
        if (queueError) throw queueError;
      } catch (queueError) {
        console.warn('Falha ao enfileirar limpeza de avatar sem vinculo.', queueError);
      }
    }
    throw error;
  }
}

export async function salvarNomeCliente(userId, nome) {
  const { error } = await withAuthRetry(
    () => supabase.from('users').update({ name: nome }).eq('id', userId),
    6000,
    'cliente-nome-update'
  );
  if (error) throw error;

  const { error: metadataError } = await withAuthRetry(
    () => supabase.auth.updateUser({ data: { nome } }),
    6000,
    'cliente-auth-nome-update'
  );
  if (metadataError) console.warn('Falha ao atualizar metadados do usuário.', metadataError);
}

export async function salvarEmailCliente(email) {
  const { error } = await withAuthRetry(
    () => supabase.auth.updateUser({ email }),
    6000,
    'cliente-email-update'
  );
  if (error) throw error;
}

export async function salvarTelefoneCliente(userId, telefone) {
  const { error } = await withAuthRetry(
    () => supabase.from('clients')
      .update({ phone: telefone || null })
      .eq('user_id', userId)
      .eq('status', 'ativo'),
    6000,
    'cliente-telefone-update'
  );
  if (error) throw error;
}

export async function salvarSenhaCliente(password) {
  const { error } = await withAuthRetry(
    () => supabase.auth.updateUser({ password }),
    6000,
    'cliente-password-update'
  );
  if (error) throw error;
}
