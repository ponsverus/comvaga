import { useCallback, useEffect, useRef, useState } from 'react';
import { ptBR } from '../../feedback/messages/ptBR.js';
import { supabase } from '../../supabase';
import { withAuthRetry } from '../../utils/authSession';

function timeToMin(t) {
  if (!t) return 0;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
}

export function useBookingSlots({ profissional, entrega, todayISO, todayValid, onAlert }) {
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

  useEffect(() => () => {
    
    slotsRequestRef.current += 1;
    selectedDayRef.current = null;
  }, []);

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
    if (!profissional?.id || !entrega?.tempo_minutos || !dayISO) return;

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
      const tempoMinutos = Number(entrega.tempo_minutos);
      const { data, error } = await withAuthRetry(
        () => supabase.rpc('rpc_get_slots_v4', {
          p_profissional_id: profissional.id,
          p_dia: dayISO,
          p_entrega_min: tempoMinutos,
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
        onAlert?.({ title: 'Horários', body: message, variant: 'warning', buttonText: 'OK' });
      }

      setTimeout(() => slotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
    } catch {
      if (!canApply()) return;
      const message = ptBR.vitrine.schedule_errors.slots_load_error;
      setSlotsError(message);
      onAlert?.({ title: 'Horários', body: message, variant: 'danger', buttonText: 'OK' });
    } finally {
      if (canApply()) setSlotsLoading(false);
    }
  }, [onAlert, profissional?.id, entrega?.tempo_minutos]);

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
