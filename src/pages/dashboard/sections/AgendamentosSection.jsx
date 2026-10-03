import { formatPhoneForWhatsAppLink } from '../../../utils/phone';
import {
  computeStatusFromDb,
  formatDateBRFromISO,
  getAgDate,
  getAgInicio,
  getValorAgendamento,
  isCancelStatus,
  isDoneStatus,
  timeToMinutes,
} from '../utils';

function formatReminderTime(value) {
  const [hourRaw, minuteRaw] = String(value || '').split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value || 'o horário marcado';
  return `${hour}h${String(minute).padStart(2, '0')}`;
}

function buildReminderHref(agendamento, negocioNome) {
  const phone = formatPhoneForWhatsAppLink(agendamento?.cliente?.telefone);
  if (!phone) return '';

  const clienteNome = agendamento?.cliente?.nome || '';
  const horario = formatReminderTime(getAgInicio(agendamento));
  const profissionalNome = agendamento?.profissionais?.nome || 'nosso profissional';
  const prefix = negocioNome ? `Aqui é da ${negocioNome}. ` : '';
  const saudacao = clienteNome ? `Olá, ${clienteNome}! ` : 'Olá! ';
  const message = `${saudacao}${prefix}Estamos passando para lembrar que seu agendamento é hoje, às ${horario}, com ${profissionalNome}.`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export default function AgendamentosSection({
  agendamentosAgrupadosPorProfissional,
  hoje,
  nowMinutes,
  canSendReminder = false,
  negocioNome = '',
  confirmarAtendimento,
  cancelarAgendamento,
  hasMore,
  loadingMore,
  onLoadMore,
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-normal">AGENDAMENTOS</h2>
      </div>
      {agendamentosAgrupadosPorProfissional.length > 0 ? (
        <div className="space-y-8">
          {agendamentosAgrupadosPorProfissional.map(grupo => (
            <div key={grupo.pid} className="space-y-4">
              <div className="text-sm text-gray-400 uppercase tracking-wide">{grupo.nome}</div>
              <div className="space-y-4">
                {grupo.itens.map(a => {
                  const dataA = getAgDate(a);
                  const isFuturo = dataA > String(hoje || '');
                  const isHoje = dataA === String(hoje || '');
                  const st = computeStatusFromDb(a);
                  const isCancel = isCancelStatus(st);
                  const isDone = isDoneStatus(st);
                  const valorReal = getValorAgendamento(a);
                  const inicioMinutes = timeToMinutes(getAgInicio(a));
                  const hasStarted = Number.isFinite(Number(nowMinutes)) && inicioMinutes <= Number(nowMinutes);
                  const canShowReminder = canSendReminder && isHoje && !isCancel && !isDone && !hasStarted;
                  const reminderHref = canShowReminder ? buildReminderHref(a, negocioNome) : '';
                  return (
                    <div key={a.id} className="bg-dark-200 border border-gray-800 rounded-custom p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-normal text-white truncate uppercase">{a.cliente?.nome || '—'}</p>
                        <div className="shrink-0">
                          {isCancel ? <div className="px-3 py-1 rounded-button text-xs bg-red-500/20 text-red-300">CANCELADO</div>
                            : isDone ? <div className="px-3 py-1 rounded-button text-xs bg-green-500/20 text-green-400">CONCLUÍDO</div>
                            : isFuturo ? <div className="px-3 py-1 rounded-button text-xs bg-yellow-500/20 text-yellow-300">FUTURO</div>
                            : <div className="px-3 py-1 rounded-button text-xs bg-blue-500/20 text-blue-400">AGENDADO</div>}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 truncate mb-0.5 uppercase">PROF: {a.profissionais?.nome || '—'}</p>
                      <p className="text-xs text-primary truncate mb-3">{a.entregas?.nome || '—'}</p>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div><div className="text-xs text-gray-500">DATA</div><div className="text-sm">{formatDateBRFromISO(getAgDate(a))}</div></div>
                        <div><div className="text-xs text-gray-500">HORÁRIO</div><div className="text-sm">{getAgInicio(a)}</div></div>
                        <div><div className="text-xs text-gray-500">VALOR</div><div className="text-sm">R$ {Number(valorReal).toFixed(2)}</div></div>
                      </div>
                      {!isDone && !isCancel && (
                        isHoje ? (
                          <div className={`grid ${canShowReminder ? 'grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'} gap-2`}>
                            <button onClick={() => cancelarAgendamento(a)} className="w-full sm:order-last py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 rounded-button text-sm font-normal uppercase">CANCELAR</button>
                            {canShowReminder ? (
                              reminderHref ? (
                                <a
                                  href={reminderHref}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex w-full items-center justify-center gap-2 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary rounded-button text-sm font-normal uppercase"
                                >
                                  LEMBRAR CLIENTE
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="inline-flex w-full items-center justify-center gap-2 py-2 bg-gray-700/20 border border-gray-700 text-gray-500 rounded-button text-sm font-normal uppercase cursor-not-allowed"
                                >
                                  SEM WHATSAPP
                                </button>
                              )
                            ) : null}
                            <button onClick={() => confirmarAtendimento(a)} className={`w-full sm:order-first ${canShowReminder ? 'col-span-full sm:col-span-1' : ''} py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 rounded-button text-sm font-normal uppercase`}>CONFIRMAR ATENDIMENTO</button>
                          </div>
                        ) : (
                          <button onClick={() => cancelarAgendamento(a)} className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 rounded-button text-sm font-normal uppercase">CANCELAR</button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {hasMore ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="mt-2 w-full py-3 bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary rounded-button text-sm transition-all uppercase disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingMore ? 'CARREGANDO...' : 'CARREGAR MAIS'}
              </button>
            </div>
          ) : null}
        </div>
      ) : <p className="text-red-500 text-center py-12">:(</p>}
    </div>
  );
}
