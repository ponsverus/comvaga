import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import {
  getHorarioPorDia,
  getSemanaResumo,
  normalizeProfissionalHorarios,
} from '../../dashboard/utils';

const PROFISSIONAIS_POR_PAGINA = 3;

function StarChar({ size = 16, className = 'text-primary' }) {
  const sizeClass = size === 15 ? 'text-[15px]' : size === 18 ? 'text-lg' : 'text-base';
  return <span className={`${className} ${sizeClass} leading-none`} aria-hidden="true">★</span>;
}

export default function VitrineProfessionalsDashboardSection({
  cards,
  counterSingular,
  counterPlural,
}) {
  const [pagina, setPagina] = useState(0);
  const totalPaginas = Math.ceil(cards.length / PROFISSIONAIS_POR_PAGINA);
  const inicio = pagina * PROFISSIONAIS_POR_PAGINA;
  const itens = cards.slice(inicio, inicio + PROFISSIONAIS_POR_PAGINA);
  const touchStartRef = useRef(null);

  useEffect(() => {
    const ultimaPaginaValida = Math.max(0, totalPaginas - 1);
    setPagina((prev) => Math.min(prev, ultimaPaginaValida));
  }, [totalPaginas]);

  const goPrev = () => setPagina((p) => Math.max(0, p - 1));
  const goNext = () => setPagina((p) => Math.min(totalPaginas - 1, p + 1));

  const handleTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event) => {
    const start = touchStartRef.current;
    const touch = event.changedTouches?.[0];
    touchStartRef.current = null;
    if (!start || !touch || totalPaginas <= 1) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-vcard2">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-normal mb-6">Profissionais</h2>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {itens.map((prof) => {
            const horarios = normalizeProfissionalHorarios(prof);
            const horarioHoje = getHorarioPorDia(horarios, prof.todayDow);
            const almocoInicio = horarioHoje?.almoco_inicio ? String(horarioHoje.almoco_inicio).slice(0, 5) : null;
            const almocoFim = horarioHoje?.almoco_fim ? String(horarioHoje.almoco_fim).slice(0, 5) : null;
            const pausaTexto = almocoInicio && almocoFim ? `PAUSA ${almocoInicio} - ${almocoFim}` : 'SEM PAUSA';
            const statusLabelRaw = prof.status?.label || '-';
            const statusLabelView = ['ALMOCO', 'ALMOÇO'].includes(String(statusLabelRaw).toUpperCase())
              ? 'PAUSA'
              : statusLabelRaw;

            return (
              <div key={prof.id} className="relative bg-vcard border border-vborder rounded-custom p-5 transition-all hover:border-vprimary/50 self-start">
                <div className="flex items-start gap-3 mb-3">
                  {prof.avatarUrl ? (
                    <div className="w-12 h-12 rounded-custom overflow-hidden border border-vborder bg-vcard2 shrink-0">
                      <img src={prof.avatarUrl} alt={prof.nome} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-vprimary rounded-custom flex items-center justify-center text-xl font-normal text-vprimary-text shrink-0">
                      {prof.nome?.[0] || 'P'}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="min-w-0 font-normal uppercase text-vtext">{prof.nome}</h3>
                      {prof.depInfo?.media && (
                        <div className="inline-flex shrink-0 items-center gap-1 text-vprimary">
                          <StarChar size={15} className="text-yellow-400" />
                          <span className="text-sm font-normal leading-none">{prof.depInfo.media}</span>
                        </div>
                      )}
                    </div>
                    {prof.status?.label && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${prof.status.color || 'bg-gray-500'}`} />
                        <span className="text-xs text-vsub font-normal uppercase">{statusLabelView}</span>
                      </div>
                    )}
                    {prof.profissaoLabel && <p className="text-xs text-vmuted mt-1">{prof.profissaoLabel}</p>}
                    {prof.anos_experiencia != null && (
                      <p className="text-xs text-vmuted mt-1">{prof.anos_experiencia} ANOS DE EXPERIÊNCIA</p>
                    )}
                  </div>
                </div>

                <div className="text-sm text-vsub mb-3">
                  {prof.totalEntregas} {prof.totalEntregas === 1 ? counterSingular : counterPlural}
                </div>

                <div className="text-xs text-vmuted mb-3">
                  <Clock className="w-4 h-4 inline mr-1" />
                  {pausaTexto}
                </div>

                <div className="text-xs text-vmuted mb-1">
                  {getSemanaResumo(horarios, prof.todayDow).map((dia, idx, arr) => {
                    const item = dia.item;
                    const ativo = dia.ativo;
                    const isHoje = dia.destaque;
                    const cl = isHoje
                      ? 'text-vprimary'
                      : ativo
                        ? 'text-vsub'
                        : 'text-vmuted/60';
                    const texto = item
                      ? `${dia.label}${isHoje && ativo ? ` • ${String(item.horario_inicio || '08:00').slice(0, 5)} - ${String(item.horario_fim || '18:00').slice(0, 5)}` : ''}`
                      : dia.label;

                    return (
                      <React.Fragment key={dia.value}>
                        <span className={cl}>{texto}</span>
                        {idx < arr.length - 1 && <span className="mx-1 text-vmuted/60">•</span>}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              type="button"
              onClick={goPrev}
              disabled={pagina === 0}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-transparent border border-vborder text-vmuted transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:border-vsub hover:text-vtext"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-center gap-3">
              {Array.from({ length: totalPaginas }).map((_, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setPagina(i)}
                  className={['rounded-full transition-all duration-300', i === pagina ? 'w-4 h-2 bg-vprimary' : 'w-2 h-2 bg-vborder hover:bg-vsub/40'].join(' ')}
                  aria-label={`Página ${i + 1}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={goNext}
              disabled={pagina === totalPaginas - 1}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-transparent border border-vborder text-vmuted transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:border-vsub hover:text-vtext"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
