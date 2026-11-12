function formatDelta(value) {
  const number = Number(value || 0);
  if (number === 0) return '0';
  return `${number > 0 ? '+' : ''}${number}`;
}

function formatPercentDelta(value) {
  const number = Number(value || 0);
  if (number === 0) return '0.0%';
  return `${number > 0 ? '+' : ''}${number.toFixed(1)}%`;
}

export function TrendBadge({ data }) {
  const percent = data?.variacao_percentual;
  const delta = data?.variacao_valor;
  const hasPercent = percent !== null && percent !== undefined;
  const value = hasPercent ? Number(percent || 0) : Number(delta || 0);
  const tone = value > 0
    ? 'border-green-400/30 bg-green-400/10 text-green-400'
    : value < 0
      ? 'border-red-400/30 bg-red-400/10 text-red-400'
      : 'border-gray-700 bg-transparent text-gray-400';
  const text = hasPercent ? formatPercentDelta(percent) : formatDelta(delta);

  if (text === '0') return null;

  return (
    <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${tone}`}>
      {text}
    </div>
  );
}

export function RevenueTrendBadge({ data }) {
  const percent = data?.variacao_percentual;
  const delta = data?.variacao_valor;
  const hasPercent = percent !== null && percent !== undefined;
  const value = hasPercent ? Number(percent || 0) : Number(delta || 0);
  const text = hasPercent ? formatPercentDelta(percent) : formatDelta(delta);
  const tone = value > 0 ? 'text-green-500' : value < 0 ? 'text-red-500' : 'text-gray-500';

  if (text === '0') return null;

  return (
    <div className={`inline-flex items-center rounded-full border border-white bg-white px-3 py-1 text-xs ${tone}`}>
      {text}
    </div>
  );
}

export function InfoPill({ label, value, tone = 'text-gray-300', border = 'border-gray-700', bg = 'bg-transparent' }) {
  return (
    <div className={`inline-flex items-center justify-center gap-1.5 rounded-full border ${border} ${bg} px-3 py-1 text-xs`}>
      {label ? <span className="text-gray-500 uppercase">{label}</span> : null}
      <span className={tone}>{value}</span>
    </div>
  );
}

export function DashboardTopCard({ icon, label, value, children, highlight = false }) {
  const baseClass = highlight
    ? 'bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30'
    : 'bg-dark-100 border-gray-800';

  return (
    <div className={`${baseClass} border rounded-custom p-6 min-h-[136px]`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            {icon}
            <span className="text-sm text-gray-500">{label}</span>
          </div>
          <div className="text-3xl font-normal text-white mb-1">{value}</div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">{children}</div>
      </div>
    </div>
  );
}
