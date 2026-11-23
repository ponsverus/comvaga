import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { ptBR } from '../feedback/messages/ptBR.js';
import { getFeedbackState } from '../feedback/feedbackStore';
import { CheckIcon } from './icons';
import { ZapIcon } from '../components/icons';
import { useBookingSlots } from './booking/useBookingSlots.js';
import { useBookingConfirmation } from './booking/useBookingConfirmation.js';
import ModalDialog from './ModalDialog.jsx';
import { formatMoneyBR } from '../utils/money';

function parseISO(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

function toISO(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(y, m)  { return new Date(y, m, 0).getDate(); }
function firstDow(y, m)     { return new Date(y, m - 1, 1).getDay(); }
function isoLt(a, b)        { return String(a) < String(b); }
function isoEq(a, b)        { return String(a) === String(b); }
function getDiasTrabalho(profissional) {
  if (Array.isArray(profissional?.horarios) && profissional.horarios.length) {
    return profissional.horarios
      .filter((h) => h?.ativo !== false)
      .map((h) => Number(h.dia_semana))
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  }
  return [1, 2, 3, 4, 5];
}

const MONTH_NAMES   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEKDAY_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const WEEKDAY_NAMES = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];

export default function BookingCalendar({
  profissional,
  entrega,
  todayISO,
  officialTimeUnavailable = false,
  onRetryOfficialTime,
  onConfirm,
  onClose,
  negocioId,
  actorUserId,
  assistedClienteId = null,
  assistedBooking = false,
  temaAtivo = 'dark',
  onAlert,
}) {
  const isLight = temaAtivo === 'light';
  const today = parseISO(todayISO);
  const [viewYear,  setViewYear]  = useState(today?.year  ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(today?.month ?? new Date().getMonth() + 1);
  const {
    selectedDay, selectedSlot, horariosHot, horariosAll, showAll, setShowAll,
    slotsLoading, slotsError, slotsRef, resumeRef, fetchSlots,
    handleSelectDay, handleSelectSlot,
  } = useBookingSlots({ profissional, entrega, todayISO, todayValid: Boolean(today), onAlert });
  const { confirming, handleConfirm } = useBookingConfirmation({
    profissional, entrega, selectedDay, selectedSlot, actorUserId, negocioId,
    assistedBooking, assistedClienteId, onConfirm, fetchSlots, onAlert,
  });
  const [retryingOfficialTime, setRetryingOfficialTime] = useState(false);

  const containerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const titleId = useId();
  const entregaNameId = useId();

  const handleDismiss = useCallback(() => {
    if (confirming || getFeedbackState().open) return;
    onClose?.();
  }, [confirming, onClose]);

  useEffect(() => {
    function handle(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) handleDismiss();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [handleDismiss]);

  useEffect(() => {
    const parsedToday = parseISO(todayISO);
    if (!parsedToday) return;
    setViewYear(parsedToday.year);
    setViewMonth(parsedToday.month);
  }, [todayISO]);

  const handleRetryOfficialTime = async () => {
    if (!onRetryOfficialTime || retryingOfficialTime) return;
    setRetryingOfficialTime(true);
    try {
      await onRetryOfficialTime();
    } catch {
    } finally {
      setRetryingOfficialTime(false);
    }
  };

  function prevMonth() { if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); } else setViewMonth(m => m - 1); }
  function nextMonth() { if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); } else setViewMonth(m => m + 1); }

  const canGoPrev    = !(viewYear === today?.year && viewMonth === today?.month);
  const diasTrabalho = getDiasTrabalho(profissional);
  const valorExibido = formatMoneyBR(entrega?.valor_oferta
    ? Number(entrega.valor_oferta)
    : Number(entrega?.valor ?? 0));

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDow  = firstDow(viewYear, viewMonth);
  const cells     = [...Array(startDow).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];

  const containerBg     = isLight ? 'bg-white border-gray-200'           : 'bg-dark-100 border-gray-800';
  const headerBorder    = isLight ? 'border-gray-200'                    : 'border-gray-800';
  const labelColor      = isLight ? 'text-gray-500'                      : 'text-gray-500';
  const titleColor      = isLight ? 'text-gray-900'                      : 'text-white';
  const subtitleColor   = isLight ? 'text-gray-500'                      : 'text-gray-400';
  const subMutedColor   = isLight ? 'text-gray-400'                      : 'text-gray-600';
  const closeBtn        = isLight ? 'text-gray-400 hover:text-gray-700 hover:bg-gray-100' : 'text-gray-500 hover:text-white hover:bg-dark-200';
  const navBtn          = isLight ? 'hover:bg-gray-100 text-gray-400 hover:text-gray-700' : 'hover:bg-dark-200 text-gray-400 hover:text-white';
  const monthColor      = isLight ? 'text-gray-900'                      : 'text-white';
  const weekdayColor    = isLight ? 'text-gray-400'                      : 'text-gray-500';
  const dayDisabled     = isLight ? 'text-gray-300 cursor-not-allowed'   : 'text-gray-700 cursor-not-allowed';
  const dayNormal       = isLight ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900' : 'text-gray-300 hover:bg-dark-200 hover:text-white';
  const dayToday        = isLight ? 'text-gray-900 font-bold'            : 'text-primary';
  const loadingColor    = isLight ? 'text-gray-400'                      : 'text-gray-500';
  const slotsErrorClass = isLight ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300';
  const showMoreBtn     = isLight ? 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400 hover:text-gray-800' : 'border-gray-700 bg-dark-200 text-gray-300 hover:border-gray-500 hover:text-white';
  const confirmBtnClass = isLight
    ? 'bg-gray-900 text-white hover:bg-gray-700'
    : 'bg-gradient-to-r from-primary to-yellow-600 text-black';

  return (
    <ModalDialog
      open
      onDismiss={handleDismiss}
      labelledBy={`${titleId} ${entregaNameId}`}
      initialFocusRef={closeButtonRef}
      overlayClassName="bg-black/80"
    >
      <div
        ref={containerRef}
        className={`border rounded-custom w-full max-w-md max-h-[92vh] overflow-y-auto ${containerBg}`}
      >
        <div className={`flex items-center justify-between px-6 pt-6 pb-4 border-b ${headerBorder}`}>
          <div className="min-w-0">
            <h2 id={titleId} className={`text-xs uppercase tracking-wide ${labelColor}`}>Agendamento</h2>
            <div id={entregaNameId} className={`font-normal truncate ${titleColor}`}>{entrega?.nome}</div>
            <div className={`text-xs mt-0.5 ${subtitleColor}`}>
              <span className="uppercase">{profissional?.nome}</span>
              {entrega?.tempo_minutos && <span className={`ml-2 ${subMutedColor}`}>• {entrega.tempo_minutos} MIN</span>}
              <span className="ml-2 text-voferta">• R$ {valorExibido}</span>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleDismiss}
            aria-disabled={confirming}
            aria-label="Fechar calendário"
            className={`shrink-0 ml-4 p-1.5 rounded-button transition-colors aria-disabled:opacity-60 ${closeBtn}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {!todayISO && (
            <div className={`flex flex-col items-center justify-center gap-2 border rounded-button p-3 text-sm font-normal text-center ${slotsErrorClass}`}>
              <span>{officialTimeUnavailable ? ptBR.vitrine.schedule_time_unavailable.body : 'Sincronizando horário oficial...'}</span>
              {officialTimeUnavailable && onRetryOfficialTime && (
                <button
                  type="button"
                  onClick={handleRetryOfficialTime}
                  disabled={retryingOfficialTime}
                  className="font-normal uppercase text-primary hover:opacity-80 disabled:cursor-wait disabled:opacity-60"
                >
                  {retryingOfficialTime
                    ? ptBR.vitrine.schedule_time_unavailable.retryingButtonText
                    : ptBR.vitrine.schedule_time_unavailable.retryButtonText}
                </button>
              )}
            </div>
          )}

          {todayISO && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={prevMonth}
                disabled={!canGoPrev}
                aria-label="Mês anterior"
                className={`p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${navBtn}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={`text-sm font-normal uppercase tracking-wide select-none ${monthColor}`}>
                {MONTH_NAMES[viewMonth - 1]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="Próximo mês"
                className={`p-1.5 rounded transition-colors ${navBtn}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {WEEKDAY_SHORT.map((l, i) => (
                <div key={i} className={`text-center text-[10px] uppercase py-1 select-none ${weekdayColor}`}>{l}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((day, i) => {
                if (day === null) return <div key={`e-${i}`} />;
                const iso        = toISO(viewYear, viewMonth, day);
                const dow        = (startDow + day - 1) % 7;
                const isPast     = isoLt(iso, todayISO);
                const isToday    = isoEq(iso, todayISO);
                const isWorkday  = diasTrabalho.includes(dow);
                const isSelected = selectedDay && isoEq(iso, selectedDay);
                const isDisabled = isPast || !isWorkday;
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && handleSelectDay(iso)}
                    aria-label={`${WEEKDAY_NAMES[dow]}, ${day} de ${MONTH_NAMES[viewMonth - 1]} de ${viewYear}`}
                    aria-pressed={Boolean(isSelected)}
                    aria-current={isToday ? 'date' : undefined}
                    className={[
                      'h-9 w-9 mx-auto flex items-center justify-center text-sm font-normal transition-colors select-none rounded-full',
                      isSelected
                        ? 'bg-vprimary text-vprimary-text'
                        : isToday && !isDisabled
                          ? dayToday
                          : isDisabled
                            ? dayDisabled
                            : dayNormal,
                    ].join(' ')}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
          )}

          {todayISO && selectedDay && (
            <div ref={slotsRef}>
              {slotsLoading && (
                <div className={`flex items-center justify-center py-8 ${loadingColor}`}>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-sm">BUSCANDO HORÁRIOS...</span>
                </div>
              )}

              {!slotsLoading && !slotsError && horariosAll.length > 0 && (() => {
                const hotHoras      = new Set(horariosHot.map(h => h.hora));
                const horariosExtra = horariosAll.filter(h => !hotHoras.has(h.hora));
                return (
                  <div>
                    {horariosHot.length > 0 ? (
                      <>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
                          {horariosHot.map((h, i) => (
                            <SlotButton key={`hot-${i}`} slot={h} isSelected={selectedSlot?.hora === h.hora} onClick={handleSelectSlot} isLight={isLight} />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAll(v => !v)}
                          className={`w-full py-2.5 rounded-full border text-sm font-normal uppercase transition-colors ${showMoreBtn}`}
                        >
                          {showAll ? 'Ocultar horários' : 'Ver mais horários'}
                        </button>
                        {showAll && horariosExtra.length > 0 && (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
                            {horariosExtra.map((h, i) => (
                              <SlotButton key={`extra-${i}`} slot={h} isSelected={selectedSlot?.hora === h.hora} onClick={handleSelectSlot} isLight={isLight} />
                            ))}
                          </div>
                        )}
                        {showAll && horariosExtra.length === 0 && (
                          <p className={`text-center text-xs mt-3 ${isLight ? 'text-gray-400' : 'text-gray-600'}`}>ESCOLHA ACIMA</p>
                        )}
                      </>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {horariosAll.map((h, i) => (
                          <SlotButton key={`all-${i}`} slot={h} isSelected={selectedSlot?.hora === h.hora} onClick={handleSelectSlot} isLight={isLight} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {todayISO && selectedSlot && (
            <div ref={resumeRef}>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirming}
                className={`w-full py-3 rounded-button font-normal uppercase disabled:opacity-60 flex items-center justify-center gap-2 transition-colors ${confirmBtnClass}`}
              >
                {confirming
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando...</>
                  : <><CheckIcon className="w-4 h-4" /> Confirmar agendamento</>
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </ModalDialog>
  );
}

function SlotButton({ slot, isSelected, onClick, isLight }) {
  const baseSelected  = 'bg-vprimary text-vprimary-text border-vprimary';
  const baseRaio      = isLight
    ? 'bg-gray-50 border-gray-300 hover:border-gray-900 text-gray-800'
    : 'bg-dark-200 border-gray-800 hover:border-primary text-white';
  const baseHeat      = isLight
    ? 'bg-gray-50 border-gray-900/40 text-gray-900 hover:bg-gray-100'
    : 'bg-dark-200 border-primary/40 text-primary hover:bg-primary/10';
  const baseNormal    = isLight
    ? 'bg-white border-gray-200 hover:border-gray-500 text-gray-700'
    : 'bg-dark-200 border-gray-800 hover:border-primary text-gray-300';

  return (
    <button
      type="button"
      onClick={() => onClick(slot)}
      aria-pressed={isSelected}
      className={[
        'relative min-h-9 rounded-full border py-2 text-sm uppercase font-normal text-center transition-colors',
        slot.isRaio && !isSelected ? 'pl-4 pr-7' : 'px-4',
        isSelected
          ? baseSelected
          : slot.isRaio
            ? baseRaio
            : slot.isHeat
              ? baseHeat
              : baseNormal,
      ].join(' ')}
    >
      {slot.isRaio && !isSelected && (
        <ZapIcon strokeWidth={1.5} className={`absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 ${isLight ? 'text-gray-700' : 'text-primary'}`} />
      )}
      <span className="tabular-nums normal-case">{slot.hora}</span>
    </button>
  );
}
