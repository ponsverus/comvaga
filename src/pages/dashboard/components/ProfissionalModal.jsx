import { X } from 'lucide-react';
import TimePicker from '../../../components/TimePicker';
import { DEFAULT_PROFISSIONAL_HORARIOS, toUpperClean } from '../utils';

function ProfessionalFieldRow({ label, children, last = false }) {
  return (
    <div className={`flex items-start gap-3 px-8 py-3 ${last ? '' : 'border-b border-gray-800'}`}>
      <span className="w-[86px] shrink-0 py-2 text-[14px] leading-5 text-gray-500">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function TimeCell({ label, children }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[11px] uppercase text-gray-600">{label}</div>
      {children}
    </div>
  );
}

const professionalInputClass = 'w-full bg-transparent px-0 py-2 text-[14px] text-white placeholder-gray-600 outline-none focus:text-white';
const timePickerClass = 'w-full flex items-center justify-between gap-2 bg-transparent px-0 py-1 text-sm font-normal text-white transition-colors focus:outline-none';

export default function ProfissionalModal({
  show,
  formProfissional,
  setFormProfissional,
  weekdays,
  submittingProfissional,
  onClose,
  onSubmit,
}) {
  if (!show) return null;

  const horarios = Array.isArray(formProfissional.horarios) && formProfissional.horarios.length === 7
    ? formProfissional.horarios
    : DEFAULT_PROFISSIONAL_HORARIOS;
  const activeCount = horarios.filter((h) => h.ativo !== false).length;
  const updateHorario = (diaSemana, patch) => {
    setFormProfissional({
      ...formProfissional,
      horarios: horarios.map((h) => (h.dia_semana === diaSemana ? { ...h, ...patch } : h)),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-custom border border-gray-800 bg-dark-100">
        <div className="flex items-center justify-between border-b border-gray-800 px-8 py-6">
          <h3 className="text-2xl font-normal">EDITAR PROFISSIONAL</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <ProfessionalFieldRow label="NOME">
            <input
              type="text"
              value={formProfissional.nome}
              onChange={(e) => setFormProfissional({ ...formProfissional, nome: e.target.value })}
              className={`${professionalInputClass} uppercase`}
              required
            />
          </ProfessionalFieldRow>

          <ProfessionalFieldRow label="PROFISS.">
            <input
              type="text"
              value={formProfissional.profissao}
              onChange={(e) => setFormProfissional({ ...formProfissional, profissao: toUpperClean(e.target.value) })}
              className={professionalInputClass}
              placeholder="EX: BARBEIRO, MANICURE..."
            />
          </ProfessionalFieldRow>

          <ProfessionalFieldRow label="TEMPO">
            <input
              type="number"
              value={formProfissional.anos_experiencia}
              onChange={(e) => setFormProfissional({ ...formProfissional, anos_experiencia: e.target.value })}
              className={professionalInputClass}
              placeholder="ANOS DE EXPERIÊNCIA"
            />
          </ProfessionalFieldRow>

          <div className="border-y border-gray-800">
            {weekdays.map((d, index) => {
              const item = horarios.find((h) => h.dia_semana === d.value) || DEFAULT_PROFISSIONAL_HORARIOS[d.value];
              const ativo = item.ativo !== false;
              const disableToggle = ativo && activeCount <= 1;

              return (
                <div key={d.value} className={`px-8 py-4 ${index === weekdays.length - 1 ? '' : 'border-b border-gray-800'}`}>
                  <div className="mb-3 flex items-center gap-3">
                    <button
                      type="button"
                      disabled={disableToggle}
                      onClick={() => updateHorario(d.value, { ativo: !ativo })}
                      className={`h-8 w-14 shrink-0 rounded-full border text-[11px] font-normal transition-all disabled:cursor-not-allowed disabled:opacity-60 ${ativo ? 'border-primary/40 bg-primary/15 text-primary' : 'border-gray-800 bg-transparent text-gray-500'}`}
                    >
                      {d.label}
                    </button>
                    <div aria-hidden="true" className={`min-w-0 flex-1 border-t-2 border-dotted ${ativo ? 'border-primary' : 'border-gray-600'}`} />
                    <span className={`text-[11px] uppercase ${ativo ? 'text-primary' : 'text-gray-600'}`}>{ativo ? 'ABERTO' : 'FECHADO'}</span>
                  </div>

                  <div className={ativo ? 'space-y-4' : 'pointer-events-none space-y-4 opacity-35'}>
                    <div className="grid grid-cols-2 gap-4">
                      <TimeCell label="ABRE">
                        <TimePicker
                          value={item.horario_inicio}
                          onChange={(v) => updateHorario(d.value, { horario_inicio: v })}
                          triggerClassName={timePickerClass}
                        />
                      </TimeCell>
                      <TimeCell label="FECHA">
                        <TimePicker
                          value={item.horario_fim}
                          onChange={(v) => updateHorario(d.value, { horario_fim: v })}
                          triggerClassName={timePickerClass}
                        />
                      </TimeCell>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <TimeCell label="PAUSA INÍCIO">
                        <TimePicker
                          value={item.almoco_inicio || ''}
                          onChange={(v) => updateHorario(d.value, { almoco_inicio: v })}
                          triggerClassName={timePickerClass}
                        />
                      </TimeCell>
                      <TimeCell label="PAUSA FIM">
                        <TimePicker
                          value={item.almoco_fim || ''}
                          onChange={(v) => updateHorario(d.value, { almoco_fim: v })}
                          triggerClassName={timePickerClass}
                        />
                      </TimeCell>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 border-t border-gray-800 px-8 py-6">
            <button
              type="button"
              onClick={onClose}
              disabled={submittingProfissional}
              className="flex-1 rounded-button border border-red-500/30 py-3 text-[12px] font-normal uppercase text-red-400 disabled:opacity-50"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={submittingProfissional}
              className={`flex-1 rounded-button border border-primary/30 py-3 text-[12px] font-normal uppercase text-primary hover:border-primary ${submittingProfissional ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              {submittingProfissional ? 'SALVANDO...' : 'SALVAR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
