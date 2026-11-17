import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { ptBR } from '../feedback/messages/ptBR.js';
import { getFeedbackState } from '../feedback/feedbackStore';
import { CheckIcon } from './icons';
import { ZapIcon } from '../components/icons';
import { useBookingSlots } from './booking/useBookingSlots.js';
import { useBookingConfirmation } from './booking/useBookingConfirmation.js';

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

  useEffect(() => {
    function handle(e) {
      if (confirming || getFeedbackState().open) return;
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
  }, [todayISO]);

  const handleRetryOfficialTime = async () => {
    if (!onRetryOfficialTime || retryingOfficialTime) return;
    setRetryingOfficialTime(true);
    try {
      await onRetryOfficialTime();
    } catch {
      // Mantém o aviso visível para permitir uma nova tentativa.
    } finally {
      setRetryingOfficialTime(false);
    }
  };
  
