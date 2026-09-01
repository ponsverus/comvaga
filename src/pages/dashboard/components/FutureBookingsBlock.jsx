import ScrollableCardsRow from './ScrollableCardsRow';

function formatCurrency(value) {
  return `R$ ${Number(value || 0).toFixed(2)}`;
}

function formatDateDots(value) {
  if (!value) return 'Selecionar';
  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return String(value);
  return `${day}.${month}.${year}`;
}

function MetricCard({ label, value, tone = 'text-white', subtle }) {
  return (
    <div className="bg-dark-200 border border-gray-800 rounded-custom p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-normal ${tone}`}>{value}</div>
      {subtle ? <div className="text-xs text-gray-500 mt-1">{subtle}</div> : null}
    </div>
  );
}

function ProfessionalInfoPill({ label, value, tone = 'text-white', border = 'border-gray-700', bg = 'bg-dark-200/60' }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border ${border} ${bg} px-2 py-1.5`}>
      <span className="whitespace-nowrap text-sm text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={`whitespace-nowrap text-sm font-normal ${tone}`}>{value}</span>
    </div>
  );
}

export default function FutureBookingsBlock({
  souDono,
  metricsFutureBookings,
  metricsFutureBookingsLoading,
}) {
  const data = metricsFutureBookings?.future_bookings || {};
  const porProfissional = Array.isArray(data?.por_profissional) ? data.por_profissional : [];

  return (
    <div className="bg-dark-200 border border-gray-800 rounded-custom p-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-normal uppercase">Receita Futura Projetada</h3>
        </div>
        <div className="inline-flex items-center self-start rounded-full border border-gray-700 bg-dark-100 px-3 py-1 text-sm text-gray-300">
          {formatDateDots(data?.amanha)}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
        <MetricCard
          label="RECEITA PROJETADA"
          tone="text-primary"
          value={metricsFutureBookingsLoading ? '...' : formatCurrency(data?.receita_projetada)}
        />
        <MetricCard
          label="AGENDAMENTOS FUTUROS"
          value={metricsFutureBookingsLoading ? '...' : Number(data?.total_agendamentos || 0)}
        />
        <MetricCard
          label="TICKET MÉDIO FUTURO"
          tone="text-green-400"
          value={metricsFutureBookingsLoading ? '...' : formatCurrency(data?.ticket_medio)}
        />
      </div>

      {souDono && porProfissional.length > 0 ? (
        <div className="mt-4">
          <ScrollableCardsRow
            items={porProfissional}
            keyExtractor={(item) => String(item?.profissional_id || item?.nome)}
            cardClassName="bg-dark-100 border border-gray-800 rounded-custom p-4"
            renderItem={(item) => (
              <>
                <div className="text-xs text-gray-500 mb-1">PROFISSIONAL</div>
                <div className="font-normal text-white uppercase">{String(item?.nome || 'PROFISSIONAL')}</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <ProfessionalInfoPill value={formatCurrency(item?.receita_projetada)} tone="text-primary" border="border-primary/30" bg="bg-primary/10" />
                  <ProfessionalInfoPill label="Agendam." value={Number(item?.total_agendamentos || 0)} />
                </div>
              </>
            )}
          />
        </div>
      ) : null}
    </div>
  );
}
