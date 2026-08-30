import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';
import { CheckIcon } from './icons';
import { ZapIcon } from '../components/icons';
import { withTimeout } from '../utils/withTimeout';

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
function timeToMin(t)       { if (!t) return 0; const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); }
function getDiasTrabalho(profissional) {
  if (Array.isArray(profissional?.horarios) && profissional.horarios.length) {
    return profissional.horarios
      .filter((h) => h?.ativo !== false)
      .map((h) => Number(h.dia_semana))
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  }
  return [1, 2, 3, 4, 5];
}

function isRateLimitError(error) {
  const raw = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return raw.includes('rate_limit_exceeded') || raw.includes('muitas tentativas') || raw.includes('too many requests');
}

const MONTH_NAMES   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEKDAY_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export default function BookingCalendar({
  profissional,
  entrega,
  todayISO,
  onConfirm,
  onClose,
  negocioId,
  actorUserId,
  assistedClienteId = null,
  assistedBooking = false,
  temaAtivo = 'dark',
}) {
  const isLight = temaAtivo === 'light';
  const entregaIds = Array.isArray(entrega?.entrega_ids) && entrega.entrega_ids.length
    ? entrega.entrega_ids.filter(Boolean)
    : [entrega?.id].filter(Boolean);

  const today = parseISO(todayISO);

  const [viewYear,  setViewYear]  = useState(today?.year  ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(today?.month ?? new Date().getMonth() + 1);

  const [selectedDay,  setSelectedDay]  = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [horariosHot,  setHorariosHot]  = useState([]);
  const [horariosAll,  setHorariosAll]  = useState([]);
  const [showAll,      setShowAll]      = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError,   setSlotsError]   = useState(null);

  const [confirming,   setConfirming]   = useState(false);
  const [confirmError, setConfirmError] = useState(null);

  const containerRef = useRef(null);
  const slotsRef     = useRef(null);
  const resumeRef    = useRef(null);
  const selectedDayRef = useRef(null);
  const slotsRequestRef = useRef(0);

  useEffect(() => {
    function handle(e) {
      if (confirming) return;
      if (containerRef.current && !containerRef.current.contains(e.target)) onClose?.();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose, confirming]);

  useEffect(() => {
    const parsedToday = parseISO(todayISO);
    if (!parsedToday) return;
    setViewYear(parsedToday.year);
    setViewMonth(parsedToday.month);

    if (selectedDayRef.current && isoLt(selectedDayRef.current, todayISO)) {
      selectedDayRef.current = null;
      slotsRequestRef.current += 1;
      setSelectedDay(null);
      setSelectedSlot(null);
      setHorariosHot([]);
      setHorariosAll([]);
      setShowAll(false);
      setSlotsError(null);
      setConfirmError(null);
      setSlotsLoading(false);
    }
  }, [todayISO]);

  const fetchSlots = useCallback(async (dayISO) => {
    if (!profissional?.id || !entrega?.duracao_minutos || !dayISO) return;

    const requestId = slotsRequestRef.current + 1;
    slotsRequestRef.current = requestId;
    const canApply = () => slotsRequestRef.current === requestId && selectedDayRef.current === dayISO;

    setSlotsLoading(true);
    setSlotsError(null);
    setHorariosHot([]);
    setHorariosAll([]);
    setShowAll(false);
    setSelectedSlot(null);
    setConfirmError(null);

    try {
      const dur = Number(entrega.duracao_minutos);

      const { data, error } = await withTimeout(
        supabase.rpc('rpc_get_slots_v4', {
          p_profissional_id: profissional.id,
          p_dia:             dayISO,
          p_entrega_min:     dur,
          p_margem_min:      5,
          p_modo:            'todos',
        }),
        7000,
        'booking-slots'
      );
      if (error) throw error;
      if (!canApply()) return;

      const list = (data || []).map(s => ({
        hora:           String(s.label || '').slice(0, 5),
        isHeat:         !!s.is_heat,
        isRaio:         !!s.is_raio,
        horario_inicio: s.horario_inicio || null,
        horario_fim:    s.horario_fim    || null,
        duracaoMin:     dur,
      }));

      const rank = h => h.isRaio ? 3 : h.isHeat ? 2 : 1;
      const uniq = new Map();
      for (const h of list) {
        if (!h.hora) continue;
        if (!uniq.has(h.hora) || rank(h) > rank(uniq.get(h.hora))) uniq.set(h.hora, h);
      }
      const final = [...uniq.values()].sort((a, b) => timeToMin(a.hora) - timeToMin(b.hora));
      const hot   = final.filter(h => h.isHeat || h.isRaio);

      setHorariosAll(final);
      setHorariosHot(hot);

      if (!final.length) setSlotsError('SEM VAGAS PRA HOJE :(');

      setTimeout(() => slotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
    } catch {
      if (!canApply()) return;
      setSlotsError('Erro ao buscar horários. Tente outro dia.');
    } finally {
      if (canApply()) setSlotsLoading(false);
    }
  }, [profissional?.id, entrega?.duracao_minutos]);

  const handleSelectDay = iso => {
    selectedDayRef.current = iso;
    setSelectedDay(iso);
    fetchSlots(iso);
  };

  const handleSelectSlot = slot => {
    setSelectedSlot(slot);
    setConfirmError(null);
    setTimeout(() => resumeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  };

  const handleConfirm = async () => {
    const clienteIdAssistido = assistedBooking ? assistedClienteId : null;
    if (!selectedSlot || !selectedDay || !actorUserId || !negocioId) return;
    if (assistedBooking && !clienteIdAssistido) return;

    setConfirming(true);
    setConfirmError(null);
    try {
      const isMultiplo = entregaIds.length > 1;
      const bookingRequest = isMultiplo
        ? supabase.rpc(assistedBooking ? 'rpc_criar_agendamentos_multiplos_assistido' : 'rpc_criar_agendamentos_multiplos', {
            ...(assistedBooking ? { p_cliente_id: clienteIdAssistido } : {}),
            p_negocio_id:      negocioId,
            p_profissional_id: profissional.id,
            p_entrega_ids:     entregaIds,
            p_data:            selectedDay,
            p_horario_inicio:  selectedSlot.hora,
          })
        : supabase.rpc(assistedBooking ? 'rpc_criar_agendamento_assistido' : 'rpc_criar_agendamento', {
            ...(assistedBooking ? { p_cliente_id: clienteIdAssistido } : {}),
            p_negocio_id:      negocioId,
            p_profissional_id: profissional.id,
            p_entrega_id:      entregaIds[0],
            p_data:            selectedDay,
            p_horario_inicio:  selectedSlot.hora,
          });
      const { data, error } = await withTimeout(
        bookingRequest,
        8000,
        'booking-confirm'
      );

      if (error) throw error;

      const rows = Array.isArray(data) ? data : (data ? [data] : []);
      const primeiroResultado = rows[0];
      const ultimoResultado = rows[rows.length - 1];

      onConfirm?.({
        inicio:  primeiroResultado?.inicio ?? selectedSlot.hora,
        fim:     ultimoResultado?.fim ?? null,
        label:   selectedSlot.hora,
        dataISO: selectedDay,
      });
    } catch (e) {
      const msg     = String(e?.message || '').toLowerCase();
      const limited = isRateLimitError(e);
      const scheduleBlocked = msg.includes('blocked');
      const expired = msg.includes('agendamento_horario_expirado')
        || msg.includes('horario_expirado');
      const overlap = msg.includes('conflito')
        || msg.includes('almoco')
        || msg.includes('overlap')
        || msg.includes('sobrepos')
        || msg.includes('exclusion')
        || String(e?.code || '') === '23P01';
      if (scheduleBlocked) {
        setConfirmError('Agenda indisponível. Este negócio precisa ativar um plano para receber novos agendamentos.');
      } else if (limited) {
        setConfirmError('Muitas tentativas de agendamento. Aguarde um minuto e tente novamente.');
      } else if (expired) {
        setConfirmError('Esse horário expirou. Escolha outro.');
        fetchSlots(selectedDay);
      } else if (overlap) {
        setConfirmError('Alguém acabou de reservar esse horário. Escolha outro.');
        fetchSlots(selectedDay);
      } else {
        setConfirmError('Erro ao confirmar. Tente novamente mais tarde.');
      }
    } finally {
      setConfirming(false);
    }
  };

  function prevMonth() { if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); } else setViewMonth(m => m - 1); }
  function nextMonth() { if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); } else setViewMonth(m => m + 1); }

  const canGoPrev    = !(viewYear === today?.year && viewMonth === today?.month);
  const diasTrabalho = getDiasTrabalho(profissional);
  const valorExibido = entrega?.preco_promocional
    ? Number(entrega.preco_promocional).toFixed(2)
    : Number(entrega?.preco ?? 0).toFixed(2);

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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div
        ref={containerRef}
        className={`border rounded-custom w-full max-w-md max-h-[92vh] overflow-y-auto ${containerBg}`}
      >
        <div className={`flex items-center justify-between px-6 pt-6 pb-4 border-b ${headerBorder}`}>
          <div className="min-w-0">
            <div className={`text-xs uppercase tracking-wide ${labelColor}`}>Agendamento</div>
            <div className={`font-normal truncate ${titleColor}`}>{entrega?.nome}</div>
            <div className={`text-xs mt-0.5 ${subtitleColor}`}>
              <span className="uppercase">{profissional?.nome}</span>
              {entrega?.duracao_minutos && <span className={`ml-2 ${subMutedColor}`}>• {entrega.duracao_minutos} MIN</span>}
              <span className="ml-2" style={{ color: 'var(--vpromo-text)' }}>• R$ {valorExibido}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`shrink-0 ml-4 p-1.5 rounded-button transition-colors ${closeBtn}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {!todayISO && (
            <div className={`flex items-center justify-center border rounded-button p-3 text-sm font-normal text-center ${slotsErrorClass}`}>
              Sincronizando horário oficial...
            </div>
          )}

          {todayISO && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={prevMonth}
                disabled={!canGoPrev}
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

              {!slotsLoading && slotsError && (
                <div className={`flex items-center justify-center border rounded-button p-3 text-sm font-normal text-center ${slotsErrorClass}`}>
                  {slotsError}
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
                          {showAll ? 'OCULTAR HORÁRIOS' : 'VER MAIS HORÁRIOS'}
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
              {confirmError && (
                <div className={`mb-3 border rounded-custom px-4 py-3 text-xs ${isLight ? 'border-red-200 bg-red-50/60 text-red-600' : 'border-red-500/20 bg-red-500/5 text-red-300'}`}>
                  {confirmError}
                </div>
              )}

              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirming}
                className={`w-full py-3 rounded-button font-normal uppercase disabled:opacity-60 flex items-center justify-center gap-2 transition-colors ${confirmBtnClass}`}
              >
                {confirming
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> CONFIRMANDO...</>
                  : <><CheckIcon className="w-4 h-4" /> CONFIRMAR AGENDAMENTO</>
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
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
  const minuteColor   = isLight ? 'text-gray-400' : 'text-gray-500';

  return (
    <button
      type="button"
      onClick={() => onClick(slot)}
      className={[
        'relative p-3 rounded-custom transition-all border uppercase font-normal text-center',
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
        <ZapIcon strokeWidth={1.5} className={`w-3 h-3 absolute top-1 right-1 ${isLight ? 'text-gray-700' : 'text-primary'}`} />
      )}
      <div className="text-lg normal-case">{slot.hora}</div>
      <div className={`text-[10px] normal-case ${minuteColor}`}>{slot.duracaoMin} MIN</div>
    </button>
  );
}
