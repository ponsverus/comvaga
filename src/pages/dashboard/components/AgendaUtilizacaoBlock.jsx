import { useMemo, useRef, useState } from 'react';

function formatDurationFromMinutes(value) {
  const totalMinutes = Math.max(Number(value || 0), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes} MIN`;
  if (minutes === 0) return `${hours}H`;
  return `${hours}H ${String(minutes).padStart(2, '0')}MIN`;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
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
      {subtle ? (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-sm">
          {subtle}
        </div>
      ) : null}
    </div>
  );
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function ProfessionalMetricBar({ label, value, percent, barClass = 'bg-white' }) {
  const width = Math.round(clampPercent(percent));
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] text-gray-500 tracking-wide leading-none">{label}</span>
        <span className="text-sm font-normal text-gray-200">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full ${barClass} metric-bar-width-${width}`} />
      </div>
    </div>
  );
}

function ProfessionalCountPill({ label, value, tone = 'text-white', border = 'border-gray-700', bg = 'bg-dark-200/60' }) {
  return (
    <div className={`flex flex-1 items-center justify-center gap-2 rounded-full border ${border} ${bg} px-3 py-1.5`}>
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-normal ${tone}`}>{value}</span>
    </div>
  );
}

export default function AgendaUtilizacaoBlock({
  souDono,
  metricsUtilizacao,
  metricsUtilizacaoLoading,
}) {
  const data = metricsUtilizacao?.utilizacao || {};
  const porProfissional = useMemo(
    () => (Array.isArray(data?.por_profissional) ? data.por_profissional : []),
    [data?.por_profissional]
  );
  const scrollerRef = useRef(null);
  const [activePage, setActivePage] = useState(0);
  const desktopPageCount = Math.max(1, Math.ceil(porProfissional.length / 3));

  function updateActivePage() {
    const node = scrollerRef.current;
    if (!node) return;

    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    const pageCount = isDesktop ? desktopPageCount : porProfissional.length;
    const maxScrollLeft = node.scrollWidth - node.clientWidth;
    const nextPage = maxScrollLeft <= 1
      ? 0
      : node.scrollLeft >= maxScrollLeft - 1
        ? pageCount - 1
        : (() => {
          const firstCard = node.firstElementChild;
          const secondCard = firstCard?.nextElementSibling;
          const cardStep = secondCard
            ? secondCard.offsetLeft - firstCard.offsetLeft
            : node.clientWidth;
          const cardIndex = Math.round(node.scrollLeft / Math.max(1, cardStep));
          return Math.max(0, Math.min(pageCount - 1, Math.floor(cardIndex / 3)));
        })();
    setActivePage(Math.max(0, Math.min(pageCount - 1, nextPage)));
  }
  function goToDesktopPage(index) {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTo({ left: index * node.clientWidth, behavior: 'smooth' });
  }

  const mobileActivePage = Math.min(activePage, porProfissional.length - 1);
  const desktopActivePage = Math.min(activePage, desktopPageCount - 1);

  return (
    <div className="bg-dark-200 border border-gray-800 rounded-custom p-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-normal uppercase">Utiliza. da Agenda</h3>
        </div>
        <div className="inline-flex items-center self-start rounded-full border border-gray-700 bg-dark-100 px-3 py-1 text-sm text-gray-300">
          {formatDateDots(data?.amanha)}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-start">
        <MetricCard
          label="TEMPO DISPONÍVEL"
          tone="text-yellow-400"
          value={metricsUtilizacaoLoading ? '...' : formatDurationFromMinutes(data?.minutos_ociosos)}
        />
        <MetricCard
          label="TEMPO OCUPADO"
          tone="text-green-400"
          value={metricsUtilizacaoLoading ? '...' : formatDurationFromMinutes(data?.minutos_ocupados)}
        />
        <MetricCard
          label="TAXA DE OCUPA."
          tone="text-primary"
          value={metricsUtilizacaoLoading ? '...' : formatPercent(data?.taxa_ocupacao)}
        />
        <MetricCard
          label="TEMPO TOTAL"
          value={metricsUtilizacaoLoading ? '...' : formatDurationFromMinutes(data?.minutos_disponiveis)}
        />
        <MetricCard
          label="AGENDAMENTOS"
          value={metricsUtilizacaoLoading ? '...' : Number(data?.agendamentos_validos || 0)}
          subtle={metricsUtilizacaoLoading ? null : (
            <>
              <span className="text-red-400">{Number(data?.cancelados || 0)}</span>
              <span className="text-gray-400">cancelado(s)</span>
            </>
          )}
        />
      </div>

      {souDono && porProfissional.length > 0 ? (
        <div className="mt-4">
          <div
            ref={scrollerRef}
            onScroll={updateActivePage}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {porProfissional.map((item) => (
              <div key={String(item?.profissional_id || item?.nome)} className="shrink-0 basis-full snap-start bg-dark-100 border border-gray-800 rounded-custom p-4 md:basis-[calc((100%-1.5rem)/3)]">
                {(() => {
                  const validos = Number(item?.agendamentos_validos || 0);
                  const cancelados = Number(item?.cancelados || 0);
                  const minutosDisponiveis = Number(item?.minutos_disponiveis || 0);
                  const minutosOcupados = Number(item?.minutos_ocupados || 0);
                  const minutosOciosos = Number(item?.minutos_ociosos || 0);

                  return (
                    <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[12px] text-gray-500 uppercase tracking-wide">Profissional</div>
                    <div className="mt-1 font-normal text-white leading-snug uppercase">{String(item?.nome || 'PROFISSIONAL')}</div>
                  </div>
                  <div className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-normal text-primary">
                    {formatPercent(item?.taxa_ocupacao)}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <ProfessionalMetricBar label="" value={formatDurationFromMinutes(minutosOciosos)} percent={minutosDisponiveis > 0 ? (minutosOciosos / minutosDisponiveis) * 100 : 0} barClass="bg-yellow-400" />
                  <ProfessionalMetricBar label="" value={formatDurationFromMinutes(minutosOcupados)} percent={minutosDisponiveis > 0 ? (minutosOcupados / minutosDisponiveis) * 100 : 0} barClass="bg-green-400" />
                  <ProfessionalMetricBar label="" value={formatPercent(item?.taxa_ocupacao)} percent={item?.taxa_ocupacao} barClass="bg-primary" />
                  <ProfessionalMetricBar label="" value={formatDurationFromMinutes(minutosDisponiveis)} percent={minutosDisponiveis > 0 ? 100 : 0} barClass="bg-gray-300" />
                  <div className="flex items-center gap-2 pt-1">
                    <ProfessionalCountPill label="Válidos" value={validos} />
                    <ProfessionalCountPill label="Cancelados" value={cancelados} tone="text-red-400" border="border-red-400/30" bg="bg-red-400/10" />
                  </div>
                </div>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>

          {porProfissional.length > 1 ? (
            <div className="mt-3 flex justify-center gap-1.5 md:hidden" aria-hidden="true">
              {porProfissional.map((item, index) => (
                <span key={`${String(item?.profissional_id || item?.nome)}-${index}`} className={`h-1.5 rounded-full transition-all ${index === mobileActivePage ? 'w-4 bg-primary' : 'w-1.5 bg-gray-600'}`} />
              ))}
            </div>
          ) : null}

          {porProfissional.length > 3 ? (
            <div className="mt-3 hidden justify-center gap-1.5 md:flex">
              {Array.from({ length: desktopPageCount }).map((_, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => goToDesktopPage(index)}
                  aria-label={"Ir para a pagina " + (index + 1)}
                  title={"Ir para a pagina " + (index + 1)}
                  className={index === desktopActivePage ? 'h-1.5 w-4 rounded-full bg-primary' : 'h-1.5 w-1.5 rounded-full bg-gray-600'}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
