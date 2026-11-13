import { useId, useRef } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { CalendarIcon } from '../../../components/icons';
import ModalDialog from '../../../components/ModalDialog';
import { getPrecoFinalEntrega } from '../utils';

export function AlertModal({ open, onClose, title, body, buttonText, isLight }) {
  const titleId = useId();
  const bodyId = useId();
  const primaryRef = useRef(null);
  const bg = isLight ? 'bg-vcard border-vborder' : 'bg-dark-100 border-gray-800';
  const titleCl = isLight ? 'text-vtext' : 'text-white';
  const bodyCl = isLight ? 'text-vsub' : 'text-gray-300';
  const closeCl = isLight ? 'text-vmuted hover:text-vtext' : 'text-gray-400 hover:text-white';
  const btnCl = isLight ? 'bg-vprimary text-vprimary-text hover:opacity-90' : 'bg-gradient-to-r from-primary to-yellow-600 text-black';

  return (
    <ModalDialog open={open} onDismiss={onClose} labelledBy={titleId} describedBy={body ? bodyId : undefined} initialFocusRef={primaryRef} focusKey={`${title}\n${body}`}>
      <div className={`border rounded-custom max-w-md w-full p-6 ${bg}`}>
        <div className="flex justify-between items-start gap-3 mb-3">
          <h3 id={titleId} className={`text-xl font-normal ${titleCl}`}>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Fechar aviso" className={closeCl}><X className="w-6 h-6" /></button>
        </div>
        {body && <p id={bodyId} className={`font-normal whitespace-pre-line ${bodyCl}`}>{body}</p>}
        <button ref={primaryRef} type="button" onClick={onClose} className={`mt-5 w-full py-3 rounded-button uppercase font-normal transition-colors ${btnCl}`}>
          {buttonText || 'OK'}
        </button>
      </div>
    </ModalDialog>
  );
}

export function ConfirmModal({ open, onCancel, onConfirm, title, body, confirmText, cancelText, isLight }) {
  const titleId = useId();
  const bodyId = useId();
  const cancelRef = useRef(null);
  const bg = isLight ? 'bg-vcard border-vborder' : 'bg-dark-100 border-gray-800';
  const titleCl = isLight ? 'text-vtext' : 'text-white';
  const bodyCl = isLight ? 'text-vsub' : 'text-gray-300';
  const closeCl = isLight ? 'text-vmuted hover:text-vtext' : 'text-gray-400 hover:text-white';
  const cancelCl = isLight ? 'bg-vcard2 border-vborder text-vsub hover:border-vprimary hover:text-vtext' : 'bg-dark-200 border-gray-800 text-gray-200';
  const confirmCl = isLight ? 'bg-vprimary text-vprimary-text hover:opacity-90' : 'bg-gradient-to-r from-primary to-yellow-600 text-black';

  return (
    <ModalDialog open={open} onDismiss={onCancel} labelledBy={titleId} describedBy={body ? bodyId : undefined} initialFocusRef={cancelRef} focusKey={`${title}\n${body}`}>
      <div className={`border rounded-custom max-w-md w-full p-6 ${bg}`}>
        <div className="flex justify-between items-start gap-3 mb-3">
          <h3 id={titleId} className={`text-xl font-normal ${titleCl}`}>{title}</h3>
          <button type="button" onClick={onCancel} aria-label="Fechar confirmação" className={closeCl}><X className="w-6 h-6" /></button>
        </div>
        {body && <p id={bodyId} className={`font-normal whitespace-pre-line ${bodyCl}`}>{body}</p>}
        <div className="mt-5 flex gap-3">
          <button ref={cancelRef} type="button" onClick={onCancel} className={`flex-1 py-3 border rounded-button uppercase font-normal transition-colors ${cancelCl}`}>{cancelText || 'CANCELAR'}</button>
          <button type="button" onClick={onConfirm} className={`flex-1 py-3 rounded-button uppercase font-normal transition-colors ${confirmCl}`}>{confirmText || 'CONFIRMAR'}</button>
        </div>
      </div>
    </ModalDialog>
  );
}

export function SelectionBar({ itens, counterSingular, counterPlural, onConfirm, onClear, isLight }) {
  const qtd = itens.length;
  if (qtd === 0) return null;
  const durTotal = itens.reduce((sum, x) => sum + Number(x.duracao_minutos || 0), 0);
  const valTotal = itens.reduce((sum, x) => sum + getPrecoFinalEntrega(x), 0);
  const label = qtd === 1 ? counterSingular : counterPlural;
  const textMain = isLight ? 'text-vtext' : 'text-white';
  const textSub = isLight ? 'text-vsub' : 'text-gray-500';
  const clearBtn = isLight ? 'text-vmuted hover:text-vtext' : 'text-gray-600 hover:text-gray-400';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] vitrine-selection-bar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-vprimary flex items-center justify-center text-vprimary-text text-xs font-normal shrink-0 tabular-nums">{qtd}</div>
          <div className="min-w-0">
            <div className={`text-sm font-normal truncate ${textMain}`}>{qtd} {label} SELECIONADO{qtd > 1 ? 's' : ''}</div>
            <div className={`text-xs font-normal ${textSub}`}>{durTotal} MIN • R$ {valTotal.toFixed(2)}</div>
          </div>
          <button type="button" onClick={onClear} className={`shrink-0 ml-1 ${clearBtn}`} title="Limpar"><X className="w-4 h-4" /></button>
        </div>
        <button type="button" onClick={onConfirm} className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-vprimary text-vprimary-text rounded-full text-sm font-normal uppercase whitespace-nowrap transition-opacity hover:opacity-80">
          <CalendarIcon className="w-4 h-4" />
          Escolher data
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
