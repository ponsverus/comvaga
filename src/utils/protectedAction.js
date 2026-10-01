import { supabase } from '../supabase';

const domains = {
  rpc_criar_agendamento: 'agendamentos',
  rpc_criar_agendamentos_multiplos: 'agendamentos',
  rpc_criar_agendamento_assistido: 'agendamentos',
  rpc_criar_agendamentos_multiplos_assistido: 'agendamentos',
  cancelar_agendamento: 'agendamentos',
  cancelar_agendamento_profissional: 'agendamentos',
  concluir_agendamento_profissional: 'agendamentos',
  create_depoimento_negocio: 'depoimentos',
  create_depoimento_profissional: 'depoimentos',
  aprovar_parceiro_profissional: 'gestao',
  ativar_entrega_segura: 'gestao',
  inativar_entrega_segura: 'gestao',
  excluir_entrega_segura: 'gestao',
  excluir_profissional_parceiro_seguro: 'gestao',
  excluir_negocio_seguro: 'gestao',
  excluir_conta_cliente_seguro: 'gestao',
  excluir_conta_profissional_seguro: 'gestao',
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
