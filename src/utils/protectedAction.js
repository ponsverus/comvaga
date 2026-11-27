import { supabase } from '../supabase';

const domains = {
  rpc_criar_agendamento: 'agendamentos',
  rpc_criar_agendamentos_multiplos: 'agendamentos',
  rpc_criar_agendamento_assistido: 'agendamentos',
  rpc_criar_agendamentos_multiplos_assistido: 'agendamentos',
  cancelar_agendamento: 'agendamentos',
  cancelar_agendamento_profissional: 'agendamentos',
  concluir_agendamento_profissional: 'agendamentos',
  create_business_review: 'reviews',
  create_professional_review: 'reviews',
  aprovar_parceiro_profissional: 'cadastros',
  ativar_entrega_segura: 'cadastros',
  inativar_entrega_segura: 'cadastros',
  excluir_entrega_segura: 'cadastros',
  excluir_profissional_parceiro_seguro: 'cadastros',
  excluir_negocio_seguro: 'cadastros',
  excluir_conta_cliente_seguro: 'cadastros',
  excluir_conta_profissional_seguro: 'cadastros',
};

export async function invokeProtectedAction(action, params = {}) {
  const domain = domains[action];
  if (!domain) throw new Error('unsupported_protected_action');

  const result = await supabase.functions.invoke(`protected-${domain}`, {
    body: { action, params },
  });
  if (!result.error) return result;

  const response = result.error.context;
  let payload;
  try {
    payload = await response?.clone().json();
  } catch {
    payload = null;
  }
  const error = new Error(payload?.message || payload?.error || result.error.message);
  error.code = payload?.code || result.error.code;
  error.details = payload?.details;
  error.hint = payload?.hint;
  error.status = response?.status || result.error.status;
  error.cause = result.error;
  return { ...result, error };
}
