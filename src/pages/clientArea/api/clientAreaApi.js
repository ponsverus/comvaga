import { supabase } from '../../../supabase';
import { withAuthRetry } from '../../../utils/authSession';

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

export async function fetchFavoritosCliente({ clienteId, limit, cursor = null }) {
  const { data, error } = await withAuthRetry(
    () => supabase.rpc('get_favoritos_cliente', {
      p_cliente_id: clienteId,
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

export async function fetchReviewedBookings(agendamentoIds) {
  const ids = Array.isArray(agendamentoIds) ? agendamentoIds.filter(Boolean) : [];
  if (!ids.length) return [];

  const { data, error } = await withAuthRetry(
    () => supabase
      .from('depoimentos')
      .select('id, agendamento_id')
      .in('agendamento_id', ids),
    6000,
    'depoimentos-avaliados'
  );

  if (error) throw error;
  return data || [];
}

export async function createBookingReview({ agendamentoId, nota, comentario }) {
  const { data, error } = await withAuthRetry(
    () => supabase.rpc('create_depoimento_profissional', {
      p_agendamento_id: agendamentoId,
      p_nota: nota,
      p_comentario: comentario ?? null,
    }),
    6500,
    'enviar-depoimento'
  );

  if (error) throw error;
  return data;
}

export async function cancelarAgendamentoCliente(agendamentoId) {
  const { data, error } = await withAuthRetry(
    () => supabase.rpc('cancelar_agendamento', { p_agendamento_id: agendamentoId }),
    6500,
    'cancelar-agendamento'
  );

  if (error) throw error;
  return data;
}

export async function removerContaCliente() {
  const { data, error } = await withAuthRetry(
    () => supabase.rpc('remove_cliente_seguro'),
    6500,
    'excluir-conta'
  );

  if (error) throw error;
  return data;
}

export async function removerFavoritoCliente({ favoritoId, clienteId }) {
  const { error } = await withAuthRetry(
    () => supabase
      .from('favoritos')
      .delete()
      .eq('id', favoritoId)
      .eq('cliente_id', clienteId),
    6000,
    'remover-favorito-cliente'
  );

  if (error) throw error;
}
