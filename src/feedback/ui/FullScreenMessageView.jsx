import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { AlertIcon } from '../../components/icons';

const toneByVariant = {
  success: {
    glyph: ':)',
    iconClass: 'text-green-400',
    borderClass: 'border-green-500/30',
    buttonClass: 'bg-green-500 text-black hover:bg-green-400',
  },
  danger: {
    glyph: ':(',
    iconClass: 'text-red-400',
    borderClass: 'border-red-500/30',
    buttonClass: 'bg-red-500 text-white hover:bg-red-400',
  },
  warning: {
    icon: AlertIcon,
    iconClass: 'text-primary',
    borderClass: 'border-primary/30',
    buttonClass: 'bg-primary text-black hover:bg-yellow-400',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-400',
    borderClass: 'border-blue-500/30',
    buttonClass: 'bg-blue-500 text-white hover:bg-blue-400',
  },
};

function resolveTone(variant) {
  return toneByVariant[variant] || toneByVariant.info;
}

function BodyText({ text }) {
  const lines = String(text || '').split('\n');
  return lines.map((line, index) => (
    <span key={`${line}:${index}`}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

export default function FullScreenMessageView({ open, payload, onClose }) {
  const [promptValue, setPromptValue] = useState('');

  useEffect(() => {
    if (!open) return;
    setPromptValue(String(payload?.initialValue ?? ''));
  }, [open, payload?.initialValue]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.(payload?.type === 'confirm' ? false : null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open, payload?.type]);

  if (!open || !payload) return null;

  const variant = payload.variant || 'info';
  const screen = payload.screen || 'dark';
  const isConfirm = payload.type === 'confirm';
  const isPrompt = payload.type === 'prompt';
  const tone = resolveTone(variant);
  const Icon = tone.icon;
  const panelClass = screen === 'light'
    ? 'border-gray-200 bg-white text-black'
    : 'border-gray-800 bg-dark-100 text-white';
  const bodyClass = screen === 'light' ? 'text-gray-700' : 'text-gray-300';
  const secondaryClass = screen === 'light'
    ? 'border-gray-300 text-gray-700 hover:border-gray-500 hover:text-black'
    : 'border-gray-700 text-gray-300 hover:border-primary hover:text-primary';

  const closeWithPrimary = () => {
    if (isConfirm) {
      onClose?.(true);
      return;
    }
    if (isPrompt) {
      onClose?.(promptValue);
      return;
    }
    onClose?.(true);
  };

  const closeWithCancel = () => {
    onClose?.(isConfirm ? false : null);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-custom border ${panelClass} ${tone.borderClass} p-6 shadow-2xl`}>
        <div className="mb-5 flex items-start gap-4">
          <div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center">
            {tone.glyph ? (
              <span className={`inline-flex h-8 w-8 items-center justify-center font-condensed text-[32px] font-normal leading-none ${tone.iconClass}`}>
                {tone.glyph}
              </span>
            ) : (
              <Icon className={`h-6 w-6 ${tone.iconClass}`} />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-normal uppercase">{payload.title || 'Aviso'}</h2>
            {payload.body ? (
              <p className={`mt-3 text-sm leading-relaxed ${bodyClass}`}>
                <BodyText text={payload.body} />
              </p>
            ) : null}
          </div>
        </div>

        {isPrompt ? (
          <input
            autoFocus
            value={promptValue}
            maxLength={payload.maxLength}
            onChange={(event) => setPromptValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') closeWithPrimary();
            }}
            placeholder={payload.placeholder || ''}
            className="mb-5 h-11 w-full rounded-button border border-gray-700 bg-black px-4 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-primary"
          />
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {(isConfirm || isPrompt) ? (
            <button
              type="button"
              onClick={closeWithCancel}
              className={`h-11 rounded-button border px-5 text-xs font-normal uppercase transition-colors ${secondaryClass}`}
            >
              {payload.cancelText || 'CANCELAR'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={closeWithPrimary}
            className={`h-11 rounded-button px-5 text-xs font-normal uppercase transition-colors ${tone.buttonClass}`}
          >
            {payload.confirmText || payload.buttonText || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
