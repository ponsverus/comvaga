import { Calendar } from 'lucide-react';

function toMonth(value) {
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.slice(0, 7);
  return '';
}

export default function MesSelect({ value, onChange, todayISO }) {
  const currentMonth = toMonth(todayISO);
  const selectedMonth = toMonth(value) || currentMonth;

  return (
    <label className="inline-flex min-w-[160px] items-center gap-2 rounded-full border border-gray-800 bg-dark-200 px-3 py-1.5 text-sm font-normal text-white transition-colors hover:border-primary/50 focus-within:border-primary/50">
      <span className="sr-only">Mes do faturamento</span>
      <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-500" />
      <input
        type="month"
        value={selectedMonth}
        max={currentMonth || undefined}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-center text-sm text-white outline-none [color-scheme:dark]"
      />
    </label>
  );
}
