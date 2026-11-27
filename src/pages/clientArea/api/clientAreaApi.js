import { supabase } from '../../../supabase';
import { withAuthRetry } from '../../../utils/authSession';
import { invokeProtectedAction } from '../../../utils/protectedAction';

export async function fetchClientePerfil(userId) {
  const { data, error } = await withAuthRetry(
    () => supabase
      .from('clientes')
      .select('nome, avatar_path, telefone')
      .eq('user_id', userId)
      .eq('status', 'ativo')
      .maybeSingle(),
    6000,
    'cliente-perfil'
  );

  if (error) throw error;
  return {
    nome: String(data?.nome || '').trim(),
    avatarPath: data?.avatar_path || null,
    telefone: String(data?.telefone || '').trim(),
  };
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

export async function fetchAgendamentosCliente({ clienteId, limit, cursor = null }) {
  const { data, error } = await withAuthRetry(
    () => supabase.rpc('get_agendamentos_cliente', {
      p_cliente_id: clienteId,
      p_limit: limit,
      p_cursor_data: cursor?.data ?? null,
      p_cursor_horario: cursor?.horario_inicio ?? null,
      p_cursor_id: cursor?.id ?? null,
    }),
    7000,
    'agendamentos-cliente'
  );

  if (error) throw error;
  return data || [];
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
    () => invokeProtectedAction('cancelar_agendamento', { p_agendamento_id: agendamentoId }),
    6500,
    'cancelar-agendamento'
  );

  if (error) throw error;
  return data;
}

export async function excluirContaCliente() {
  const { data, error } = await withAuthRetry(
    () => invokeProtectedAction('excluir_conta_cliente_seguro'),
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
      () => supabase.from('clientes')
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
    () => supabase.from('users').update({ nome }).eq('id', userId),
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
    () => supabase.from('clientes')
      .update({ telefone: telefone || null })
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
