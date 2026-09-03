import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function parseMonth(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;

  return { year, month };
}

function monthISO(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatDisplay(value) {
  const parsed = parseMonth(value);
  if (!parsed) return null;
  return MONTH_NAMES[parsed.month - 1];
}

function compareMonth(a, b) {
  return String(a || '').localeCompare(String(b || ''));
}

export default function MesSelect({ value, onChange, todayISO }) {
  const todayParsed = parseMonth(todayISO);
  const fallbackDate = new Date();
  const todayYear = todayParsed?.year ?? fallbackDate.getFullYear();
  const todayMonthNumber = todayParsed?.month ?? fallbackDate.getMonth() + 1;
  const currentMonth = monthISO(todayYear, todayMonthNumber);
  const selected = parseMonth(value) || { year: todayYear, month: todayMonthNumber };
  const selectedMonth = monthISO(selected.year, selected.month);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selected.year);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const buttonRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    const nextSelected = parseMonth(value);
    setViewYear(nextSelected?.year ?? todayYear);
  }, [todayYear, value]);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const popoverWidth = 284;
    const popoverHeight = 252;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= popoverHeight ? rect.bottom + 8 : Math.max(16, rect.top - popoverHeight - 8);
    let left = rect.right - popoverWidth;

    if (left < 16) left = 16;
    if (left + popoverWidth > window.innerWidth - 16) left = Math.max(16, window.innerWidth - popoverWidth - 16);

    setPosition({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handle(event) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  function selectMonth(month) {
    const nextMonth = monthISO(viewYear, month);
    if (compareMonth(nextMonth, currentMonth) > 0) return;
    onChange(nextMonth);
    setOpen(false);
  }

  const canGoNextYear = viewYear < todayYear;
  const displayValue = formatDisplay(selectedMonth);

  const popover = (
    <div
      ref={popoverRef}
      style={{ position: 'fixed', top: position.top, left: position.left }}
      className="z-50 w-[284px] rounded-custom border border-gray-800 bg-dark-100 p-4 shadow-2xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewYear((year) => year - 1)}
          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-dark-200 hover:text-white"
          aria-label="Ano anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="select-none text-sm font-normal uppercase tracking-wide text-white">
          {viewYear}
        </span>

        <button
          type="button"
          onClick={() => canGoNextYear && setViewYear((year) => year + 1)}
          disabled={!canGoNextYear}
          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-dark-200 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Proximo ano"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {MONTH_NAMES.map((name, index) => {
          const month = index + 1;
          const optionValue = monthISO(viewYear, month);
          const isSelected = optionValue === selectedMonth;
          const isCurrent = optionValue === currentMonth;
          const isDisabled = compareMonth(optionValue, currentMonth) > 0;

          return (
            <button
              key={optionValue}
              type="button"
              disabled={isDisabled}
              onClick={() => selectMonth(month)}
              className={[
                'h-10 rounded-custom border text-xs font-normal uppercase transition-colors',
                isSelected
                  ? 'border-primary bg-primary text-black'
                  : isDisabled
                    ? 'cursor-not-allowed border-gray-900 bg-transparent text-gray-700'
                    : isCurrent
                      ? 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10'
                      : 'border-gray-800 bg-dark-200 text-gray-300 hover:border-gray-700 hover:text-white',
              ].join(' ')}
            >
              {name.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((next) => !next)}
        className="inline-flex min-w-[112px] items-center justify-center rounded-full border border-gray-800 bg-dark-200 px-4 py-1.5 text-sm font-normal text-white transition-colors hover:border-primary/50 focus:border-primary/50 focus:outline-none"
      >
        <span className="truncate uppercase">{displayValue}</span>
      </button>

      {open && createPortal(popover, document.body)}
    </div>
  );
}
