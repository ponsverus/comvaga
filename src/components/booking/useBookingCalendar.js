import { useCallback, useEffect, useRef, useState } from 'react';
import { FunctionsFetchError, FunctionsRelayError } from '@supabase/supabase-js';
import { ptBR } from '../../feedback/messages/ptBR.js';
import { supabase } from '../../supabase';
import { withAuthRetry } from '../../utils/authSession';
import { invokeProtectedAction } from '../../utils/protectedAction';
import { isRateLimitError } from '../../utils/errorUtils';

function timeToMin(t) {
  if (!t) return 0;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
}

function isConnectionError(error) {
  const cause = error?.cause;
  const raw = `${error?.code || ''} ${error?.message || ''} ${cause?.code || ''} ${cause?.message || ''}`.toLowerCase();

  return error instanceof FunctionsFetchError
    || error instanceof FunctionsRelayError
    || cause instanceof FunctionsFetchError
    || cause instanceof FunctionsRelayError
    || raw.includes('request_timeout')
    || raw.includes('timeout')
    || raw.includes('failed to fetch')
    || raw.includes('networkerror');
}

export function useBookingSlots({ profissional, entrega, todayISO, todayValid, feedback }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [horariosHot, setHorariosHot] = useState([]);
  const [horariosAll, setHorariosAll] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(null);
  const slotsRef = useRef(null);
  const resumeRef = useRef(null);
  const selectedDayRef = useRef(null);
  const slotsRequestRef = useRef(0);

  useEffect(() => {
    if (!todayValid || !selectedDayRef.current || selectedDayRef.current >= todayISO) return;
    selectedDayRef.current = null;
    slotsRequestRef.current += 1;
    setSelectedDay(null);
    setSelectedSlot(null);
    setHorariosHot([]);
    setHorariosAll([]);
    setShowAll(false);
    setSlotsError(null);
    setSlotsLoading(false);
  }, [todayISO, todayValid]);

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

    try {
      const dur = Number(entrega.duracao_minutos);
      const { data, error } = await withAuthRetry(
        () => supabase.rpc('rpc_get_slots_v4', {
          p_profissional_id: profissional.id,
          p_dia: dayISO,
          p_entrega_min: dur,
          p_margem_min: 5,
          p_modo: 'todos',
        }),
        7000,
        'booking-slots'
      );
      if (error) throw error;
      if (!canApply()) return;

      const list = (data || []).map((slot) => ({
        hora: String(slot.label || '').slice(0, 5),
        isHeat: !!slot.is_heat,
        isRaio: !!slot.is_raio,
        horario_inicio: slot.horario_inicio || null,
        horario_fim: slot.horario_fim || null,
      }));
      const rank = (slot) => slot.isRaio ? 3 : slot.isHeat ? 2 : 1;
      const uniq = new Map();
      for (const slot of list) {
        if (!slot.hora) continue;
        if (!uniq.has(slot.hora) || rank(slot) > rank(uniq.get(slot.hora))) uniq.set(slot.hora, slot);
      }
      const final = [...uniq.values()].sort((a, b) => timeToMin(a.hora) - timeToMin(b.hora));
      const hot = final.filter((slot) => slot.isHeat || slot.isRaio);

      setHorariosAll(final);
      setHorariosHot(hot);

      if (!final.length) {
        const message = ptBR.vitrine.schedule_errors.no_slots;
        setSlotsError(message);
        feedback.showCustom({ title: 'Horários', body: message, variant: 'warning', screen: 'dark', buttonText: 'OK' });
      }

      setTimeout(() => slotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
    } catch {
      if (!canApply()) return;
      const message = ptBR.vitrine.schedule_errors.slots_load_error;
      setSlotsError(message);
      feedback.showCustom({ title: 'Horários', body: message, variant: 'danger', screen: 'dark', buttonText: 'OK' });
    } finally {
      if (canApply()) setSlotsLoading(false);
    }
  }, [feedback, profissional?.id, entrega?.duracao_minutos]);

  const handleSelectDay = (iso) => {
    selectedDayRef.current = iso;
    setSelectedDay(iso);
    fetchSlots(iso);
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setTimeout(() => resumeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  };

  return {
    selectedDay, selectedSlot, horariosHot, horariosAll, showAll, setShowAll,
    slotsLoading, slotsError, slotsRef, resumeRef, fetchSlots,
    handleSelectDay, handleSelectSlot,
  };
}

export function useBookingConfirmation({
  profissional, entrega, selectedDay, selectedSlot, actorUserId, negocioId,
  assistedBooking, assistedClienteId, temaAtivo, onConfirm, fetchSlots, feedback,
}) {
  const [confirming, setConfirming] = useState(false);
  const entregaIds = Array.isArray(entrega?.entrega_ids) && entrega.entrega_ids.length
    ? entrega.entrega_ids.filter(Boolean)
    : [entrega?.id].filter(Boolean);

  const handleConfirm = async () => {
    const clienteIdAssistido = assistedBooking ? assistedClienteId : null;
    if (!selectedSlot || !selectedDay || !actorUserId || !negocioId) return;
    if (assistedBooking && !clienteIdAssistido) return;

    setConfirming(true);
    try {
      const isMultiplo = entregaIds.length > 1;
      const bookingRequest = () => isMultiplo
        ? invokeProtectedAction(assistedBooking ? 'rpc_criar_agendamentos_multiplos_assistido' : 'rpc_criar_agendamentos_multiplos', {
            ...(assistedBooking ? { p_cliente_id: clienteIdAssistido } : {}),
            p_negocio_id: negocioId,
            p_profissional_id: profissional.id,
            p_entrega_ids: entregaIds,
            p_data: selectedDay,
            p_horario_inicio: selectedSlot.hora,
          })
        : invokeProtectedAction(assistedBooking ? 'rpc_criar_agendamento_assistido' : 'rpc_criar_agendamento', {
            ...(assistedBooking ? { p_cliente_id: clienteIdAssistido } : {}),
            p_negocio_id: negocioId,
            p_profissional_id: profissional.id,
            p_entrega_id: entregaIds[0],
            p_data: selectedDay,
            p_horario_inicio: selectedSlot.hora,
          });
      const { data, error } = await withAuthRetry(bookingRequest, 8000, 'booking-confirm');
      if (error) throw error;

      const rows = Array.isArray(data) ? data : (data ? [data] : []);
      const primeiroResultado = rows[0];
      const ultimoResultado = rows[rows.length - 1];
      onConfirm?.({
        inicio: primeiroResultado?.inicio ?? selectedSlot.hora,
        fim: ultimoResultado?.fim ?? null,
        label: selectedSlot.hora,
        dataISO: selectedDay,
      });
    } catch (error) {
      const msg = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
      const limited = isRateLimitError(error);
      const notAllowed = msg.includes('acao_nao_permitida');
      const connectionFailed = isConnectionError(error);
      const scheduleBlocked = msg.includes('blocked');
      const expired = msg.includes('agendamento_horario_expirado') || msg.includes('horario_expirado');
      const overlap = msg.includes('conflito')
        || msg.includes('pausa')
        || msg.includes('overlap')
        || msg.includes('sobrepos')
        || msg.includes('exclusion')
        || String(error?.code || '') === '23P01';
      let errorMessage;
      if (scheduleBlocked) {
        errorMessage = ptBR.vitrine.schedule_errors.plan_blocked;
      } else if (limited) {
        errorMessage = ptBR.vitrine.schedule_errors.rate_limit;
      } else if (expired) {
        errorMessage = ptBR.vitrine.schedule_errors.slot_expired;
        fetchSlots(selectedDay);
      } else if (overlap) {
        errorMessage = ptBR.vitrine.schedule_errors.slot_conflict;
        fetchSlots(selectedDay);
      } else if (notAllowed) {
        errorMessage = ptBR.vitrine.schedule_errors.not_allowed;
      } else if (connectionFailed) {
        errorMessage = ptBR.vitrine.schedule_errors.connection;
      } else {
        errorMessage = ptBR.vitrine.schedule_errors.unexpected;
      }
      feedback.showCustom({
        title: 'Agendamento',
        body: errorMessage,
        variant: expired || overlap || limited ? 'warning' : 'danger',
        screen: temaAtivo === 'light' ? 'light' : 'dark',
        buttonText: 'OK',
      });
    } finally {
      setConfirming(false);
    }
  };

  return { confirming, handleConfirm };
}
