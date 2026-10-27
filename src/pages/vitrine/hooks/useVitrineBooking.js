import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchVitrineEntregaById } from '../api/vitrineApi';

export function useVitrineBooking({
  user,
  userType,
  todayISO,
  fetchNowFromDb,
  confirmKey,
  alertKey,
  navigate,
  location,
  loading,
  negocio,
  nomeNegocioLabel,
  profissionais,
  entregas,
  counterPlural,
  getPrecoFinalEntrega,
  gerarLinkGoogle,
  gerarArquivoICS,
  calendarPlatformMode,
  billingStatus,
}) {
  const [calendarExport, setCalendarExport] = useState({ googleUrl: '', icsUrl: '', icsFilename: '' });
  const [flow, setFlow] = useState({ step: 'idle', profissional: null, entregasSelecionadas: [], lastSlot: null });
  const [selecaoProfId, setSelecaoProfId] = useState(null);
  const [entregasSelecionadas, setEntregasSelecionadas] = useState([]);
  const rebookAppliedRef = useRef('');
  const assistedBooking = location.state?.assistedBooking || null;
  const isAssistedBooking = !!(user && userType === 'professional' && assistedBooking?.clienteId);
  const bookingAllowed = billingStatus?.booking_allowed !== false;

  const revokeCurrentIcs = useCallback(() => {
    setCalendarExport((prev) => {
      if (prev.icsUrl) URL.revokeObjectURL(prev.icsUrl);
      return { googleUrl: '', icsUrl: '', icsFilename: '' };
    });
  }, []);

  useEffect(() => {
    return () => {
      if (calendarExport.icsUrl) URL.revokeObjectURL(calendarExport.icsUrl);
    };
  }, [calendarExport.icsUrl]);

  useEffect(() => {
    const rebook = location.state?.rebook;
    if (!rebook || loading || !negocio?.id || !bookingAllowed) return;
    const rebookKey = `${location.key || location.pathname}:${rebook.profissionalId || ''}:${rebook.entregaId || ''}`;
    if (rebookAppliedRef.current === rebookKey) return;
    let cancelled = false;
    (async () => {
      const profissional = profissionais.find((item) => item.id === rebook.profissionalId);
      let entrega = entregas.find((item) =>
        item.id === rebook.entregaId &&
        item.profissional_id === rebook.profissionalId &&
        item.ativo !== false
      );
      if (!entrega) {
        entrega = await fetchVitrineEntregaById({
          entregaId: rebook.entregaId,
          profissionalId: rebook.profissionalId,
        }).catch(() => null);
      }
      if (cancelled || !profissional || !entrega) return;
      rebookAppliedRef.current = rebookKey;
      setSelecaoProfId(null);
      setEntregasSelecionadas([]);
      revokeCurrentIcs();
      setFlow({ step: 'booking', profissional, entregasSelecionadas: [entrega], lastSlot: null });
      navigate(location.pathname, { replace: true, state: {} });
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingAllowed, entregas, loading, location.key, location.pathname, location.state, navigate, negocio?.id, profissionais, revokeCurrentIcs]);

  const requireLogin = useCallback(async () => {
    if (!bookingAllowed) {
      alertKey(
        'schedule_blocked',
        'Agenda indisponível',
        'Este negócio precisa ativar um plano para receber novos agendamentos.',
        'ENTENDI'
      );
      return false;
    }
    if (!user) {
      const ok = await confirmKey(
        'schedule_need_login_confirm',
        'Login necessário',
        'Você precisa fazer login para agendar. Deseja fazer login agora?',
        'IR PARA LOGIN',
        'MAIS TARDE'
      );
      if (ok) navigate('/login');
      return false;
    }
    if (userType !== 'client' && !isAssistedBooking) {
      alertKey(
        'schedule_only_client',
        'Uso restrito',
        'Você está logado como PROFISSIONAL. Para agendar, entre como CLIENTE.',
        'ENTENDI'
      );
      return false;
    }
    if (!todayISO) {
      try {
        await fetchNowFromDb();
      } catch {
        alertKey('schedule_time_unavailable');
        return false;
      }
    }
    return true;
  }, [alertKey, bookingAllowed, confirmKey, fetchNowFromDb, isAssistedBooking, navigate, todayISO, user, userType]);

  const handleAgendarAgora = useCallback(async (profissional, entregas) => {
    if (!(await requireLogin())) return;
    setSelecaoProfId(null);
    setEntregasSelecionadas([]);
    revokeCurrentIcs();
    setFlow({ step: 'booking', profissional, entregasSelecionadas: entregas, lastSlot: null });
  }, [requireLogin, revokeCurrentIcs]);

  const handleToggleSelecao = useCallback(async (profissional, entrega) => {
    if (!(await requireLogin())) return;
    setEntregasSelecionadas((prev) => {
      const jaTemEsseProf = selecaoProfId && selecaoProfId !== profissional.id;
      if (jaTemEsseProf) return prev;
      const existe = prev.some((item) => item.id === entrega.id);
      const proximo = existe ? prev.filter((item) => item.id !== entrega.id) : [...prev, entrega];
      if (proximo.length === 0) setSelecaoProfId(null);
      else setSelecaoProfId(profissional.id);
      return proximo;
    });
  }, [requireLogin, selecaoProfId]);

  const handleConfirmarSelecao = useCallback(() => {
    if (!entregasSelecionadas.length) return;
    const profissional = profissionais.find((item) => item.id === selecaoProfId);
    if (!profissional) return;
    revokeCurrentIcs();
    setFlow({ step: 'booking', profissional, entregasSelecionadas, lastSlot: null });
    setSelecaoProfId(null);
    setEntregasSelecionadas([]);
  }, [profissionais, revokeCurrentIcs, selecaoProfId, entregasSelecionadas]);

  const handleLimparSelecao = useCallback(() => {
    setSelecaoProfId(null);
    setEntregasSelecionadas([]);
  }, []);

  const entregaVirtual = useMemo(() => {
    if (!flow.entregasSelecionadas?.length) return null;
    const primeiraEntrega = flow.entregasSelecionadas[0];
    const durTotal = flow.entregasSelecionadas.reduce((sum, item) => sum + Number(item?.duracao_minutos || 0), 0);
    const valTotal = flow.entregasSelecionadas.reduce((sum, item) => sum + getPrecoFinalEntrega(item), 0);
    return {
      id: primeiraEntrega.id,
      nome: flow.entregasSelecionadas.length === 1 ? primeiraEntrega.nome : `${flow.entregasSelecionadas.length} ${counterPlural}`,
      duracao_minutos: durTotal,
      preco: valTotal,
      preco_promocional: null,
      entrega_ids: flow.entregasSelecionadas.map((item) => item.id).filter(Boolean),
    };
  }, [counterPlural, flow.entregasSelecionadas, getPrecoFinalEntrega]);

  const handleBookingConfirm = useCallback((slot) => {
    const primeiraEntrega = flow.entregasSelecionadas?.[0];
    const durTotal = (flow.entregasSelecionadas || []).reduce((sum, item) => sum + Number(item?.duracao_minutos || 0), 0);
    const entregaNames = (flow.entregasSelecionadas || []).map((item) => item?.nome).filter(Boolean);
    const titulo = primeiraEntrega?.nome || 'Agendamento';
    const detalhes = [
      'Agendamento confirmado pelo Comvaga.',
      flow.profissional?.nome ? `Profissional: ${flow.profissional.nome}` : '',
      entregaNames.length ? `Trabalhos: ${entregaNames.join(', ')}` : '',
    ].filter(Boolean).join('\n');
    const local = negocio?.endereco || nomeNegocioLabel || '';
    const googleUrl = gerarLinkGoogle({
      titulo,
      dataISO: slot.dataISO,
      inicioHHMM: slot.inicio,
      fimHHMM: slot.fim,
      duracaoMin: durTotal,
      detalhes,
      local,
    });
    const icsFile = gerarArquivoICS({
      titulo,
      dataISO: slot.dataISO,
      inicioHHMM: slot.inicio,
      fimHHMM: slot.fim,
      duracaoMin: durTotal,
      detalhes,
      local,
      uidSeed: `${negocio?.id || 'negocio'}-${flow.profissional?.id || 'profissional'}-${slot.dataISO}-${slot.inicio}`,
    });
    const icsBlob = new Blob([icsFile.content], { type: 'text/calendar;charset=utf-8' });
    if (calendarExport.icsUrl) URL.revokeObjectURL(calendarExport.icsUrl);
    const icsUrl = URL.createObjectURL(icsBlob);
    setCalendarExport({ googleUrl, icsUrl, icsFilename: icsFile.filename });
    setFlow((prev) => ({ ...prev, step: 'confirmado', lastSlot: slot }));
  }, [calendarExport.icsUrl, flow.profissional?.id, flow.profissional?.nome, flow.entregasSelecionadas, gerarArquivoICS, gerarLinkGoogle, negocio?.endereco, negocio?.id, nomeNegocioLabel]);

  const abrirGoogleAgenda = useCallback(() => {
    if (!calendarExport.googleUrl) return;
    window.open(calendarExport.googleUrl, '_blank', 'noopener,noreferrer');
  }, [calendarExport.googleUrl]);

  const baixarEventoICS = useCallback(() => {
    if (!calendarExport.icsUrl) return;
    const link = document.createElement('a');
    link.href = calendarExport.icsUrl;
    link.download = calendarExport.icsFilename || 'evento.ics';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [calendarExport.icsFilename, calendarExport.icsUrl]);

  const calendarActionConfig = useMemo(() => {
    if (calendarPlatformMode === 'google-with-fallback') {
      return {
        primaryLabel: 'ABRIR NO GOOGLE AGENDA',
        primaryAction: abrirGoogleAgenda,
        secondaryLabel: 'BAIXAR AGENDAMENTO',
        secondaryAction: baixarEventoICS,
      };
    }
    if (calendarPlatformMode === 'ics') {
      return {
        primaryLabel: 'BAIXAR EVENTO DO CALENDÁRIO',
        primaryAction: baixarEventoICS,
        secondaryLabel: '',
        secondaryAction: null,
      };
    }
    return {
      primaryLabel: 'BAIXAR EVENTO DO CALENDÁRIO',
      primaryAction: baixarEventoICS,
      secondaryLabel: '',
      secondaryAction: null,
    };
  }, [abrirGoogleAgenda, baixarEventoICS, calendarPlatformMode]);

  return {
    flow,
    hasSelecao: entregasSelecionadas.length > 0,
    entregasSelecionadas,
    entregaVirtual,
    calendarActionConfig,
    handleAgendarAgora,
    handleToggleSelecao,
    handleConfirmarSelecao,
    handleLimparSelecao,
    handleBookingConfirm,
    closeBooking: () => setFlow((prev) => ({ ...prev, step: 'idle' })),
    bookingSectionState: {
      selecaoProfId,
      entregasSelecionadas,
      onAgendarAgora: handleAgendarAgora,
      onToggleSelecao: handleToggleSelecao,
      isAssistedBooking,
      assistedClienteId: assistedBooking?.clienteId || null,
      assistedClienteNome: assistedBooking?.clienteNome || '',
      assistedReturnTo: assistedBooking?.returnTo || '/dashboard',
    },
  };
}
