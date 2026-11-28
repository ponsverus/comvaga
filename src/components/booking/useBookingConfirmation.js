import { useEffect, useRef, useState } from 'react';
import { FunctionsFetchError, FunctionsRelayError } from '@supabase/supabase-js';
import { ptBR } from '../../feedback/messages/ptBR.js';
import { withAuthRetry } from '../../utils/authSession';
import { invokeProtectedAction } from '../../utils/protectedAction';
import { isRateLimitError } from '../../utils/errorUtils';

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

export function useBookingConfirmation({
  profissional, entrega, selectedDay, selectedSlot, actorUserId, negocioId,
  assistedBooking, assistedClienteId, onConfirm, fetchSlots, onAlert,
}) {
  const [confirming, setConfirming] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
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
        ? invokeProtectedAction(assistedBooking ? 'create_multiple_assisted_bookings' : 'create_multiple_bookings', {
            ...(assistedBooking ? { p_client_id: clienteIdAssistido } : {}),
            p_business_id: negocioId,
            p_professional_id: profissional.id,
            p_service_ids: entregaIds,
            p_date: selectedDay,
            p_start_time: selectedSlot.hora,
          })
        : invokeProtectedAction(assistedBooking ? 'create_assisted_booking' : 'create_booking', {
            ...(assistedBooking ? { p_client_id: clienteIdAssistido } : {}),
            p_business_id: negocioId,
            p_professional_id: profissional.id,
            p_service_id: entregaIds[0],
            p_date: selectedDay,
            p_start_time: selectedSlot.hora,
          });
      const { data, error } = await withAuthRetry(bookingRequest, 8000, 'booking-confirm');
      if (error) throw error;

      const rows = Array.isArray(data) ? data : (data ? [data] : []);
      const firstResult = rows[0];
      const lastResult = rows[rows.length - 1];
      onConfirm?.({
        inicio: firstResult?.start_time ?? selectedSlot.hora,
        fim: lastResult?.end_time ?? null,
        label: selectedSlot.hora,
        dataISO: selectedDay,
      });
    } catch (error) {
      
      if (!mountedRef.current) return;
      const msg = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
      const limited = isRateLimitError(error);
      const notAllowed = msg.includes('acesso_negado');
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
      onAlert?.({
        title: 'Agendamento',
        body: errorMessage,
        variant: expired || overlap || limited ? 'warning' : 'danger',
        buttonText: 'OK',
      });
    } finally {
      if (mountedRef.current) setConfirming(false);
    }
  };

  return { confirming, handleConfirm };
}
