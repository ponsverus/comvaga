import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function parseISO(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

function toISO(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDisplay(iso) {
  if (!iso) return null;
  const p = parseISO(iso);
  if (!p) return null;
  return `${String(p.day).padStart(2, '0')}.${String(p.month).padStart(2, '0')}.${p.year}`;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function firstDayOfMonth(year, month) {
  return new Date(year, month - 1, 1).getDay();
}

const MONTH_NAMES = [
'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

const WEEKDAY_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export default function DatePicker({ value, onChange, todayISO }) {

  const today = parseISO(todayISO);
  const selected = parseISO(value);

  const initYear  = selected?.year  ?? today?.year  ?? new Date().getFullYear();
  const initMonth = selected?.month ?? today?.month ?? (new Date().getMonth() + 1);

  const [viewYear, setViewYear] = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);
  const [open, setOpen] = useState(false);

  const containerRef = useRef(null);
  const buttonRef = useRef(null);


  useEffect(() => {

    if (!open) return;

    function handle(e) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);

  }, [open]);

  useEffect(() => {
    const currentSelected = parseISO(value);
    if (currentSelected) {
      setViewYear(currentSelected.year);
      setViewMonth(currentSelected.month);
    }
  }, [value]);

  function prevMonth() {
    if (viewMonth === 1) {
      setViewYear(y => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth(m => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewYear(y => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth(m => m + 1);
    }
  }

  function selectDay(day) {
    onChange(toISO(viewYear, viewMonth, day));
    setOpen(false);
  }

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDow = firstDayOfMonth(viewYear, viewMonth);

  const cells = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1)
  ];

  const displayValue = formatDisplay(value);

  const calendar = (
    <div
      ref={containerRef}
      className="absolute right-0 top-[calc(100%+0.5rem)] z-50 bg-dark-100 border border-gray-800 rounded-custom shadow-2xl p-5 w-[300px]"
    >

      <div className="flex items-center justify-between mb-4">

        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-full hover:bg-dark-200 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-sm font-normal text-white uppercase tracking-wide select-none">
          {MONTH_NAMES[viewMonth - 1]} {viewYear}
        </span>

        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-full hover:bg-dark-200 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

      </div>

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_SHORT.map((l, i) => (
          <div
            key={i}
            className="text-center text-[10px] text-gray-500 uppercase py-1 select-none"
          >
            {l}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">

        {cells.map((day, i) => {

          if (day === null) return <div key={`e-${i}`} />;

          const isSelected =
            selected &&
            selected.year === viewYear &&
            selected.month === viewMonth &&
            selected.day === day;

          const isToday =
            today &&
            today.year === viewYear &&
            today.month === viewMonth &&
            today.day === day;

          return (
            <button
              type="button"
              key={day}
              onClick={() => selectDay(day)}
              className={[
                'h-9 w-full flex items-center justify-center text-sm font-normal transition-colors select-none rounded-full',
                isSelected
                  ? 'bg-primary text-black'
                  : isToday && !isSelected
                  ? 'text-primary'
                  : 'text-gray-300 hover:bg-dark-200 hover:text-white cursor-pointer'
              ].join(' ')}
            >
              {day}
            </button>
          );
        })}

      </div>

      {today && (
        <div className="mt-4">

          <button
            type="button"
            onClick={() => {
              onChange(todayISO);
              setViewYear(today.year);
              setViewMonth(today.month);
              setOpen(false);
            }}
            className="w-full py-2 rounded-full border border-gray-700 bg-dark-200 text-gray-300 text-sm font-normal uppercase hover:border-gray-500 hover:text-white transition-colors"
          >
            HOJE
          </button>

        </div>
      )}

    </div>
  );

  return (
    <div className="relative inline-block">

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 bg-dark-200 border border-gray-800 rounded-full text-sm font-normal text-white hover:border-primary/50 focus:border-primary/50 focus:outline-none transition-colors"
      >
        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
        <span className="text-white">
          {displayValue ?? <span className="text-gray-500">Selecionar</span>}
        </span>
      </button>

      {open && calendar}

    </div>
  );
}
