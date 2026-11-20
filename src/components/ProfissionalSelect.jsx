import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CheckIcon } from './icons';

export default function ProfissionalSelect({
  value,
  onChange,
  profissionais = [],
  placeholder = 'Selecione',
  apenasAtivos = true,
  required = false,
  buttonClassName = '',
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  const lista = apenasAtivos
    ? (profissionais || []).filter(p => p.status === 'ativo')
    : (profissionais || []);

  const selected = lista.find(p => p.id === value) || null;

  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  function select(id) {
    onChange(id);
    setOpen(false);
  }

  function getInicial(nome) {
    return String(nome || '?')[0].toUpperCase();
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={buttonClassName || [
          'w-full flex items-center gap-3 px-4 py-3 bg-dark-200 border rounded-custom text-sm font-normal transition-colors focus:outline-none',
          open ? 'border-primary/50' : 'border-gray-800 hover:border-gray-700',
          required && !value ? 'border-red-500/50' : '',
        ].join(' ')}
      >
        {selected ? (
          <>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-yellow-600 flex items-center justify-center text-black text-xs font-normal shrink-0">
              {getInicial(selected.nome)}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-white truncate uppercase">{selected.nome}</div>
              {selected.oficio && (
                <div className="text-[11px] text-gray-500 truncate">{selected.oficio}</div>
              )}
            </div>
          </>
        ) : (
          <span className="text-gray-500 flex-1 text-left">{placeholder}</span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 mt-1 z-50 bg-dark-100 border border-gray-800 rounded-custom shadow-2xl py-1 max-h-52 overflow-y-auto"
        >
          {lista.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">:(</div>
          ) : (
            lista.map(p => {
              const isSelected = p.id === value;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => select(p.id)}
                  className={[
                    'w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left',
                    isSelected ? 'bg-primary/10' : 'hover:bg-dark-200',
                  ].join(' ')}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-yellow-600 flex items-center justify-center text-black text-xs font-normal shrink-0">
                    {getInicial(p.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate uppercase ${isSelected ? 'text-primary' : 'text-white'}`}>{p.nome}</div>
                    {p.oficio && (
                      <div className="text-[11px] text-gray-500 truncate">{p.oficio}</div>
                    )}
                  </div>
                  {isSelected && <CheckIcon className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
