import { useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import DatePicker from '../../../components/DatePicker';
import { shareTextFile } from '../../../utils/shareTextFile';
import { ptBR } from '../../../feedback/messages/ptBR.js';
import {
  computeStatusFromDb,
  formatDateBRFromISO,
  getAgDate,
  getAgInicio,
  getValorAgendamento,
  isCancelStatus,
  isDoneStatus,
} from '../utils';

export default function HistoricoSection({
  historicoData,
  setHistoricoData,
  hoje,
  historicoAgendamentos,
  historicoHasMore,
  loadMoreHistorico,
  historicoLoadingMore,
  historicoError,
}) {
  const shareLock = useRef(false);
  const [sharingId, setSharingId] = useState(null);
  const [shareErrorId, setShareErrorId] = useState(null);
  const historicoErrorMsg = historicoError ? ptBR.dashboard?.history_load_error : null;

  const compartilharAgendamento = async (agendamento) => {
    if (shareLock.current) return;
    shareLock.current = true;
    setSharingId(agendamento.id);
    setShareErrorId(null);
    try {
      const status = computeStatusFromDb(agendamento);
      const statusText = isCancelStatus(status) ? 'CANCELADO' : isDoneStatus(status) ? 'CONCLUIDO' : 'AGENDADO';
      const valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
        .format(Number(getValorAgendamento(agendamento)));
      const text = [
        'COMVAGA - AGENDAMENTO',
        `Cliente: ${agendamento.cliente?.nome || '-'}`,
        `Profissional: ${agendamento.profissionais?.nome || '-'}`,
        `Servico: ${agendamento.entregas?.nome || '-'}`,
        `Data: ${formatDateBRFromISO(getAgDate(agendamento))}`,
        `Horario: ${getAgInicio(agendamento)}`,
        `Valor: ${valor}`,
        `Status: ${statusText}`,
      ].join('\n');
      await shareTextFile({
        title: 'Agendamento - ComVaga',
        text,
        filename: `agendamento-${agendamento.id}.txt`,
      });
    } catch {
      setShareErrorId(agendamento.id);
    } finally {
      shareLock.current = false;
      setSharingId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-2xl font-normal">HISTÓRICO</h2>
        <DatePicker value={historicoData} onChange={(iso) => setHistoricoData(iso)} todayISO={hoje} />
      </div>
      {historicoErrorMsg && (
        <div className="mb-4 border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 rounded-custom p-4 text-sm">
          {historicoErrorMsg.body}
        </div>
      )}
      {historicoAgendamentos.length > 0 ? (
        <div className="space-y-3">
          {historicoAgendamentos.map(a => {
            const st = computeStatusFromDb(a);
            const isCancel = isCancelStatus(st);
            const isDone = isDoneStatus(st);
            const valorReal = getValorAgendamento(a);
            return (
              <div key={a.id} className={`bg-dark-200 border rounded-custom p-4 ${isCancel ? 'border-red-500/30' : 'border-gray-800'}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-normal text-white truncate uppercase">{a.cliente?.nome || '—'}</p>
                  <div className={`px-3 py-1 rounded-button text-xs shrink-0 ${isCancel ? 'bg-red-500/20 border border-red-500/50 text-red-300' : isDone ? 'bg-green-500/20 border border-green-500/50 text-green-300' : 'bg-blue-500/20 border border-blue-500/50 text-blue-300'}`}>
                    {isCancel ? 'CANCELADO' : isDone ? 'CONCLUÍDO' : 'AGENDADO'}
                  </div>
                </div>
                <p className="text-xs text-gray-500 truncate mb-0.5 uppercase">PROF: {a.profissionais?.nome || '—'}</p>
                <p className="text-xs text-primary truncate mb-3">{a.entregas?.nome || '—'}</p>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div><div className="text-xs text-gray-500">DATA</div><div className="text-sm">{formatDateBRFromISO(getAgDate(a))}</div></div>
                  <div><div className="text-xs text-gray-500">HORÁRIO</div><div className="text-sm">{getAgInicio(a)}</div></div>
                  <div><div className="text-xs text-gray-500">VALOR</div><div className="text-sm">R$ {Number(valorReal).toFixed(2)}</div></div>
                </div>
                <button
                  type="button"
                  onClick={() => compartilharAgendamento(a)}
                  disabled={sharingId !== null}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary/50 bg-primary/20 py-3 px-4 text-sm font-normal uppercase text-primary hover:bg-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Share2 size={18} aria-hidden="true" className="shrink-0" />
                  {sharingId === a.id ? 'COMPARTILHANDO...' : 'COMPARTILHAR'}
                </button>
                {shareErrorId === a.id && (
                  <p role="alert" className="mt-2 text-sm text-red-300">Falha ao compartilhar. Tente novamente.</p>
                )}
              </div>
            );
          })}
        </div>
      ) : !historicoErrorMsg ? <div className="text-gray-500 text-center py-12">...</div> : null}
      {historicoHasMore && (
        <button onClick={loadMoreHistorico} disabled={historicoLoadingMore} className="mt-12 w-full py-3 bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary rounded-button text-sm transition-all uppercase disabled:opacity-60 disabled:cursor-not-allowed">
          {historicoLoadingMore ? 'CARREGANDO...' : 'CARREGAR MAIS'}
        </button>
      )}
    </div>
  );
}
