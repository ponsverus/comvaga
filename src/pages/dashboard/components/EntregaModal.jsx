import { X } from 'lucide-react';
import ProfissionalSelect from '../../../components/ProfissionalSelect';

function ServiceFieldRow({ label, children, hint, last = false }) {
  return (
    <div className={`flex items-start gap-3 px-8 py-3 ${last ? '' : 'border-b border-gray-800'}`}>
      <span className="w-[86px] shrink-0 py-2 text-[14px] leading-5 text-gray-500">{label}</span>
      <div className="min-w-0 flex-1">
        {children}
        {hint ? <p className="mt-1 text-[11px] text-gray-500">{hint}</p> : null}
      </div>
    </div>
  );
}

function ServiceSplitRow({ children, last = false }) {
  return (
    <div className={`grid grid-cols-2 ${last ? '' : 'border-b border-gray-800'}`}>
      {children}
    </div>
  );
}

function ServiceSplitField({ label, children, divider = false }) {
  return (
    <div className={`flex items-start gap-3 px-8 py-3 ${divider ? 'border-r border-gray-800' : ''}`}>
      <span className="w-[58px] shrink-0 py-2 text-[14px] leading-5 text-gray-500">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const serviceInputClass = 'w-full bg-transparent px-0 py-2 text-[14px] text-white placeholder-gray-600 outline-none focus:text-white';

export default function EntregaModal({
  show,
  editingEntregaId,
  modalNewLabel,
  modalEditLabel,
  formEntrega,
  setFormEntrega,
  parceiroProfissional,
  profissionais,
  submittingEntrega,
  onClose,
  onSubmit,
}) {
  if (!show) return null;

  const profissionaisDisponiveis = parceiroProfissional
    ? profissionais.filter((p) => p.id === parceiroProfissional.id)
    : profissionais;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-custom border border-gray-800 bg-dark-100">
        <div className="flex items-center justify-between border-b border-gray-800 px-8 py-6">
          <h3 className="text-2xl font-normal">{editingEntregaId ? modalEditLabel : modalNewLabel}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <ServiceFieldRow label="PROFISSIONAL">
            <ProfissionalSelect
              value={formEntrega.profissional_id}
              onChange={(id) => setFormEntrega({ ...formEntrega, profissional_id: id })}
              profissionais={profissionaisDisponiveis}
              placeholder="SELECIONE"
              apenasAtivos={true}
              buttonClassName="w-full flex items-center gap-3 bg-transparent px-0 py-2 text-sm font-normal transition-colors focus:outline-none"
            />
          </ServiceFieldRow>

          <ServiceFieldRow label="NOME">
            <input
              type="text"
              value={formEntrega.nome}
              onChange={(e) => setFormEntrega({ ...formEntrega, nome: e.target.value })}
              className={`${serviceInputClass} uppercase`}
              required
              placeholder="EX: CORTE, BLINDAGEM"
            />
          </ServiceFieldRow>

          <ServiceSplitRow>
            <ServiceSplitField label="TEMPO" divider>
              <input
                type="number"
                value={formEntrega.tempo_minutos}
                onChange={(e) => setFormEntrega({ ...formEntrega, tempo_minutos: e.target.value })}
                className={serviceInputClass}
                required
                placeholder="MIN"
              />
            </ServiceSplitField>

            <ServiceSplitField label="VALOR">
              <input
                type="number"
                step="0.01"
                value={formEntrega.valor}
                onChange={(e) => setFormEntrega({ ...formEntrega, valor: e.target.value })}
                className={serviceInputClass}
                required
                placeholder="$"
              />
            </ServiceSplitField>
          </ServiceSplitRow>

          <ServiceFieldRow label="OFERTA">
            <input
              type="number"
              step="0.01"
              value={formEntrega.valor_promocional}
              onChange={(e) => setFormEntrega({ ...formEntrega, valor_promocional: e.target.value })}
              className={serviceInputClass}
              placeholder="OPCIONAL"
            />
          </ServiceFieldRow>

          <div className="flex items-center gap-3 border-t border-gray-800 px-8 py-6">
            <button
              type="button"
              onClick={onClose}
              disabled={submittingEntrega}
              className="flex-1 rounded-button border border-red-500/30 py-3 text-[12px] font-normal uppercase text-red-400 disabled:opacity-50"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={submittingEntrega}
              className={`flex-1 rounded-button border border-primary/30 py-3 text-[12px] font-normal uppercase text-primary hover:border-primary ${submittingEntrega ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              {submittingEntrega ? 'SALVANDO...' : 'SALVAR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
