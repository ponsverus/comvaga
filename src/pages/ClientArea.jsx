import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { SearchIcon, TimePastIcon, UserIcon } from '../components/icons';
import AppFooter from '../components/AppFooter';
import { supabase } from '../supabase';
import { useFeedback } from '../feedback/useFeedback';
import { convertImageToWebp, isImageFile } from '../utils/media';
import { normalizeBrazilPhone, formatPhoneForDisplay } from '../utils/phone';
import { getRequestErrorKey } from '../utils/requestError';
import { searchHome } from '../utils/searchHome';
import { withAuthRetry } from '../utils/authSession';
import {
  cancelarAgendamentoCliente,
  createBookingReview,
  fetchAgendamentosCliente,
  fetchClientePerfil,
  fetchCurrentClienteId,
  fetchFavoritosCliente,
  fetchReviewedBookings,
  removerContaCliente,
  removerFavoritoCliente,
} from './clientArea/api/clientAreaApi';
import Heart from './clientArea/components/Heart';
import BookingsSection from './clientArea/components/BookingsSection';
import FavoritesSection from './clientArea/components/FavoritesSection';
import SearchResults from './clientArea/components/SearchResults';
import {
  PAGE_SIZE,
  getPublicUrl,
  isRateLimitError,
  maskedPrivateValue,
  mergeById,
  sortByDateThenTimeDesc,
} from './clientArea/utils';

export default function ClientArea({ user, onLogout, userType = 'client' }) {
  const navigate = useNavigate();
  const feedback = useFeedback();

  const uiAlert = useCallback((key, variant = 'info', params = {}) => {
    if (feedback?.showMessage) return feedback.showMessage(key, { variant, ...params });
    return Promise.resolve();
  }, [feedback]);

  const uiConfirm = async (key, variant = 'warning') => {
    return !!(await feedback.confirm(key, { variant }));
  };

  const [activeTab,       setActiveTab]       = useState('agendamentos');
  const [agendamentos,    setAgendamentos]    = useState([]);
  const [favoritos,       setFavoritos]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [agendamentosPage, setAgendamentosPage] = useState(0);
  const [favoritosPage, setFavoritosPage] = useState(0);
  const [agendamentosHasMore, setAgendamentosHasMore] = useState(false);
  const [favoritosHasMore, setFavoritosHasMore] = useState(false);
  const [agendamentosLoadingMore, setAgendamentosLoadingMore] = useState(false);
  const [favoritosLoadingMore, setFavoritosLoadingMore] = useState(false);
  const [removingFavoritoId, setRemovingFavoritoId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchRows, setSearchRows] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [avatarPath,      setAvatarPath]      = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);
  const removingFavoritoRef = useRef(false);
  const desktopSearchRef = useRef(null);
  const desktopSearchInputRef = useRef(null);

  const [nomePerfil,   setNomePerfil]   = useState('');
  const [savingPerfil, setSavingPerfil] = useState(false);

  const [novoEmail,      setNovoEmail]      = useState(user?.email || '');
  const [telefoneCliente, setTelefoneCliente] = useState('');
  const [novaSenha,      setNovaSenha]      = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [savingDados,    setSavingDados]    = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [emailVisivel,   setEmailVisivel]   = useState(false);
  const [editingDados, setEditingDados] = useState({});
  const [dadosBaselines, setDadosBaselines] = useState({});

  const [loadError, setLoadError] = useState('');
  const [clienteId, setClienteId] = useState(null);
  const [avaliacoesPorAgendamento, setAvaliacoesPorAgendamento] = useState({});
  const [depoimentoLoading, setDepoimentoLoading] = useState(false);
  const [depoimentoAlvo, setDepoimentoAlvo] = useState(null);
  const [depoimentoNota, setDepoimentoNota] = useState(5);
  const [depoimentoTexto, setDepoimentoTexto] = useState('');

  const getVisiblePageRows = useCallback((rows, limit = PAGE_SIZE) => (rows || []).slice(0, limit), []);
  const getHasMoreRows = useCallback((rows, limit = PAGE_SIZE) => (rows || []).length > limit, []);

  useEffect(() => { setNovoEmail(user?.email || ''); }, [user?.email]);

  const fetchClienteId = useCallback(async () => {
    return fetchCurrentClienteId();
  }, []);

  const runSearchHome = useCallback(async (cleanTerm) => {
    const clean = String(cleanTerm || '').trim();
    setSearchError('');

    if (clean.length < 3) {
      setSearchRows([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    try {
      const rows = await searchHome(clean, { limit: 10 });
      setSearchRows(rows);
    } catch (error) {
      setSearchRows([]);
      console.error('Client search error:', error);
      setSearchError('Não foi possível realizar a busca agora.');
    } finally {
      setSearching(false);
    }
  }, []);

  const fetchAgendamentos = useCallback(async ({ page = 0, limit = PAGE_SIZE, clienteId: clienteIdParam = clienteId } = {}) => {
    const data = await fetchAgendamentosCliente({
      clienteId: clienteIdParam,
      limit,
      offset: page * PAGE_SIZE,
    });
    return (data || []).map(a => ({
      ...a,
      preco_final:  a.preco_final ?? null,
      data:         String(a.data || ''),
      hora_inicio:  a.horario_inicio ? String(a.horario_inicio).slice(0, 5) : '',
      hora_fim:     a.horario_fim    ? String(a.horario_fim).slice(0, 5)    : '',
      entregas: {
        nome:              a.entrega_nome,
        preco:             a.entrega_preco,
        preco_promocional: a.entrega_promo,
      },
      profissionais: {
        nome:    a.profissional_nome,
        negocios: {
          nome:         a.negocio_nome,
          slug:         a.negocio_slug,
          logo_path:    a.negocio_logo_path,
          tipo_negocio: a.negocio_tipo,
        },
      },
    }));
  }, [clienteId]);

  const fetchFavoritos = useCallback(async ({ page = 0, limit = PAGE_SIZE, clienteId: clienteIdParam = clienteId } = {}) => {
    const data = await fetchFavoritosCliente({
      clienteId: clienteIdParam,
      limit,
      offset: page * PAGE_SIZE,
    });
    return (data || []).map(f => ({
      ...f,
      negocios: f.tipo === 'negocio' && f.negocio_nome
        ? { nome: f.negocio_nome, slug: f.negocio_slug, logo_path: f.negocio_logo_path, tipo_negocio: f.negocio_tipo }
        : null,
      profissionais: f.tipo === 'profissional' && f.profissional_nome
        ? { nome: f.profissional_nome, negocios: f.profissional_negocio_slug ? { slug: f.profissional_negocio_slug } : null }
        : null,
    }));
  }, [clienteId]);

  const syncAvaliacoesConcluidas = useCallback(async (agendamentosRows) => {
    const concluidosIds = (agendamentosRows || [])
      .filter((item) => String(item?.status || '') === 'concluido')
      .map((item) => item?.id)
      .filter(Boolean);

    if (!concluidosIds.length) {
      setAvaliacoesPorAgendamento({});
      return;
    }

    const reviews = await fetchReviewedBookings(concluidosIds);
    const nextMap = {};
    for (const review of reviews) {
      if (!review?.agendamento_id) continue;
      nextMap[review.agendamento_id] = review.id;
    }
    setAvaliacoesPorAgendamento(nextMap);
  }, []);

  const loadPerfil = useCallback(async () => {
    return fetchClientePerfil(user.id);
  }, [user.id]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoadError('');
    setLoading(true);
    try {
      const [perfil, currentClienteId] = await Promise.all([
        loadPerfil(),
        fetchClienteId(),
      ]);
      setClienteId(currentClienteId);
      const [agendamentosRows, favoritosRows] = await Promise.all([
        fetchAgendamentos({ clienteId: currentClienteId, limit: PAGE_SIZE + 1 }),
        fetchFavoritos({ clienteId: currentClienteId, limit: PAGE_SIZE + 1 }),
      ]);
      const visibleAgendamentos = getVisiblePageRows(agendamentosRows);
      const visibleFavoritos = getVisiblePageRows(favoritosRows);
      setNomePerfil(perfil.nome);
      setAvatarPath(perfil.avatarPath);
      setTelefoneCliente(formatPhoneForDisplay(perfil.telefone) || '');
      setAgendamentos(visibleAgendamentos);
      setFavoritos(visibleFavoritos);
      await syncAvaliacoesConcluidas(visibleAgendamentos);
      setAgendamentosPage(0);
      setFavoritosPage(0);
      setAgendamentosHasMore(getHasMoreRows(agendamentosRows));
      setFavoritosHasMore(getHasMoreRows(favoritosRows));
    } catch (error) {
      const requestKey = getRequestErrorKey(error);
      if (requestKey === 'alerts.request_timeout') {
        setLoadError('A leitura da área do cliente demorou demais. Tente novamente em instantes.');
        uiAlert(requestKey, 'warning');
      } else if (requestKey === 'alerts.rate_limit_exceeded') {
        setLoadError('Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.');
        uiAlert(requestKey, 'warning');
      } else {
        console.error('Client area load error:', error);
        setLoadError('Erro ao carregar dados.');
        uiAlert('clientArea.load_data_error', 'warning');
      }
      setAgendamentos([]);
      setFavoritos([]);
      setAgendamentosPage(0);
      setFavoritosPage(0);
      setAgendamentosHasMore(false);
      setFavoritosHasMore(false);
      setAvaliacoesPorAgendamento({});
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadPerfil, fetchClienteId, fetchAgendamentos, fetchFavoritos, getHasMoreRows, getVisiblePageRows, syncAvaliacoesConcluidas, uiAlert]);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id, loadData]);

  useEffect(() => {
    if (!searchOpen) return;
    desktopSearchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return undefined;

    const handlePointerDown = (event) => {
      if (desktopSearchRef.current?.contains(event.target)) return;
      setSearchOpen(false);
      setSearchTerm('');
      setSearchRows([]);
      setSearchError('');
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [searchOpen]);

  useEffect(() => {
    const clean = String(searchTerm || '').trim();
    if (clean.length < 3) {
      setSearchRows([]);
      setSearchError('');
      setSearching(false);
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      runSearchHome(clean);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [runSearchHome, searchTerm]);

  const fetchAgendamentosRef = useRef(fetchAgendamentos);
  useEffect(() => { fetchAgendamentosRef.current = fetchAgendamentos; }, [fetchAgendamentos]);

  const agendamentosPageRef = useRef(agendamentosPage);
  useEffect(() => { agendamentosPageRef.current = agendamentosPage; }, [agendamentosPage]);

  const realtimeRefreshTimerRef = useRef(null);

  useEffect(() => {
    if (!clienteId) return;
    const scheduleRefresh = () => {
      if (realtimeRefreshTimerRef.current) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
      }

      realtimeRefreshTimerRef.current = window.setTimeout(async () => {
        try {
          const limit = (agendamentosPageRef.current + 1) * PAGE_SIZE;
          const rows = await fetchAgendamentosRef.current({ limit: limit + 1 });
          const visibleRows = getVisiblePageRows(rows, limit);
          setAgendamentos(visibleRows);
          await syncAvaliacoesConcluidas(visibleRows);
          setAgendamentosHasMore(getHasMoreRows(rows, limit));
        } catch (error) {
          console.warn('Falha ao atualizar agendamentos em tempo real.', error);
        } finally {
          realtimeRefreshTimerRef.current = null;
        }
      }, 1200);
    };

    const channel = supabase
      .channel(`agendamentos_cliente:${clienteId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agendamentos', filter: `cliente_id=eq.${clienteId}` },
        scheduleRefresh
      )
      .subscribe();
    return () => {
      if (realtimeRefreshTimerRef.current) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [clienteId, getHasMoreRows, getVisiblePageRows, syncAvaliacoesConcluidas]);

  const openFilePicker = () => fileInputRef.current?.click();

  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const maxMb   = 3;
    if (!isImageFile(file)) { uiAlert('clientArea.avatar_invalid_format', 'error'); return; }
    if (file.size > maxMb * 1024 * 1024) { uiAlert('clientArea.avatar_too_large', 'error', { maxMb }); return; }
    let uploadedPath = null;
    try {
      setUploadingAvatar(true);
      const convertedFile = await convertImageToWebp(file);
      const path = `${user.id}/avatar-${Date.now()}.webp`;
      const { error: upErr } = await withAuthRetry(
        () => supabase.storage.from('avatars').upload(path, convertedFile, { upsert: false, contentType: convertedFile.type }),
        10000,
        'avatar-upload'
      );
      if (upErr) throw upErr;
      uploadedPath = path;
      const { error: updErr } = await withAuthRetry(
        () => supabase
          .from('clientes')
          .update({ avatar_path: path })
          .eq('user_id', user.id)
          .eq('status', 'ativo'),
        6000,
        'avatar-path-update'
      );
      if (updErr) throw updErr;
      uploadedPath = null;
      setAvatarPath(path);
      uiAlert('clientArea.avatar_updated', 'success');
    } catch {
      if (uploadedPath) {
        try {
          await withAuthRetry(
            () => supabase.storage.from('avatars').remove([uploadedPath]),
            6000,
            'avatar-remove-failed-upload'
          );
        } catch (removeError) {
          console.warn('Remove apenas upload novo pendente de salvamento no perfil.', removeError);
        }
      }
      uiAlert('clientArea.avatar_update_error', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const salvarNome = async () => {
    const nome = String(nomePerfil || '').trim();
    if (!nome) { uiAlert('clientArea.profile_name_required', 'error'); return false; }
    try {
      setSavingPerfil(true);
      const { error: updErr } = await withAuthRetry(
        () => supabase.from('users').update({ nome }).eq('id', user.id),
        6000,
        'cliente-nome-update'
      );
      if (updErr) throw updErr;
      const { error: metaErr } = await withAuthRetry(
        () => supabase.auth.updateUser({ data: { nome } }),
        6000,
        'cliente-auth-nome-update'
      );
      if (metaErr) {
        console.warn('Falha ao atualizar metadados do usuário.', metaErr);
      }
      uiAlert('clientArea.profile_name_updated', 'success');
      return true;
    } catch {
      uiAlert('clientArea.profile_name_update_error', 'error');
      return false;
    } finally {
      setSavingPerfil(false);
    }
  };

  const salvarEmail = async () => {
    const email = String(novoEmail || '').trim();
    if (!email || !email.includes('@')) { uiAlert('clientArea.account_email_invalid', 'error'); return false; }
    try {
      setSavingDados(true);
      const { error } = await withAuthRetry(
        () => supabase.auth.updateUser({ email }),
        6000,
        'cliente-email-update'
      );
      if (error) throw error;
      uiAlert('clientArea.account_email_update_sent', 'success');
      return true;
    } catch {
      uiAlert('clientArea.account_email_update_error', 'error');
      return false;
    } finally {
      setSavingDados(false);
    }
  };

  const salvarTelefone = async () => {
    const telefone = normalizeBrazilPhone(telefoneCliente);
    if (telefone === null) {
      uiAlert('clientArea.phone_invalid', 'error');
      return false;
    }

    try {
      setSavingDados(true);
      const { error } = await withAuthRetry(
        () => supabase
          .from('clientes')
          .update({ telefone: telefone || null })
          .eq('user_id', user.id)
          .eq('status', 'ativo'),
        6000,
        'cliente-telefone-update'
      );
      if (error) throw error;
      uiAlert('clientArea.phone_updated', 'success');
      return true;
    } catch {
      uiAlert('clientArea.phone_update_error', 'error');
      return false;
    } finally {
      setSavingDados(false);
    }
  };

  const salvarSenha = async () => {
    const pass = String(novaSenha || '');
    const conf = String(confirmarSenha || '');
    if (pass.length < 7) { uiAlert('clientArea.account_password_too_short', 'error'); return false; }
    if (pass !== conf)   { uiAlert('clientArea.account_password_mismatch',  'error'); return false; }
    try {
      setSavingDados(true);
      const { error } = await withAuthRetry(
        () => supabase.auth.updateUser({ password: pass }),
        6000,
        'cliente-password-update'
      );
      if (error) throw error;
      setNovaSenha('');
      setConfirmarSenha('');
      uiAlert('clientArea.account_password_updated', 'success');
      return true;
    } catch {
      uiAlert('clientArea.account_password_update_error', 'error');
      return false;
    } finally {
      setSavingDados(false);
    }
  };

  const dataEditButtonClass = 'shrink-0 rounded-full bg-primary px-3 py-1 text-[12px] font-normal uppercase text-black transition-colors hover:bg-primary/90 disabled:opacity-50';
  const dataSaveButtonClass = 'shrink-0 rounded-full border border-primary/30 px-3 py-1 text-[12px] font-normal uppercase text-primary transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40';
  const dataInputClass = 'w-full bg-transparent px-0 py-2 text-[14px] text-white placeholder-gray-600 outline-none focus:text-white';
  const dataPillInputClass = 'w-full rounded-full border border-gray-800 bg-transparent px-4 py-2 text-center text-[14px] text-white placeholder-gray-600 outline-none focus:border-primary/50 focus:text-white';

  const getDadosFieldValue = (field) => {
    if (field === 'nome') return String(nomePerfil ?? '');
    if (field === 'email') return String(novoEmail ?? '');
    if (field === 'telefone') return String(telefoneCliente ?? '');
    if (field === 'senha') return JSON.stringify([novaSenha || '', confirmarSenha || '']);
    return '';
  };

  const isDadosEditing = (field) => Boolean(editingDados[field]);
  const dadosFieldChanged = (field) => isDadosEditing(field) && dadosBaselines[field] !== getDadosFieldValue(field);
  const dadosInputStateClass = (editing) => editing ? '' : 'cursor-default text-gray-300 focus:text-gray-300';

  const startDadosEditing = (field) => {
    if (field === 'email') setEmailVisivel(true);
    setDadosBaselines((current) => ({ ...current, [field]: getDadosFieldValue(field) }));
    setEditingDados((current) => ({ ...current, [field]: true }));
  };

  const stopDadosEditing = (field) => {
    if (field === 'email') setEmailVisivel(false);
    setEditingDados((current) => ({ ...current, [field]: false }));
    setDadosBaselines((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const saveDadosField = async (field, saveFn) => {
    if (!dadosFieldChanged(field)) return;
    const saved = await Promise.resolve(saveFn());
    if (saved !== false) stopDadosEditing(field);
  };

  const renderDadosAction = (field, saveFn, saving) => (
    isDadosEditing(field) ? (
      <button
        type="button"
        disabled={saving || !dadosFieldChanged(field)}
        onClick={() => saveDadosField(field, saveFn)}
        className={dataSaveButtonClass}
      >
        {saving ? 'SALVANDO' : 'SALVAR'}
      </button>
    ) : (
      <button
        type="button"
        disabled={saving}
        onClick={() => startDadosEditing(field)}
        className={dataEditButtonClass}
      >
        EDITAR
      </button>
    )
  );
  const cancelarAgendamento = async (agendamentoId) => {
    const ok = await uiConfirm('clientArea.booking_cancel_confirm', 'warning');
    if (!ok) return;
    try {
      await cancelarAgendamentoCliente(agendamentoId);
      uiAlert('clientArea.booking_canceled', 'danger');
      const limit = (agendamentosPage + 1) * PAGE_SIZE;
      const rows = await fetchAgendamentos({ limit: limit + 1 });
      const visibleRows = getVisiblePageRows(rows, limit);
      setAgendamentos(visibleRows);
      await syncAvaliacoesConcluidas(visibleRows);
      setAgendamentosHasMore(getHasMoreRows(rows, limit));
    } catch (error) {
      const requestKey = getRequestErrorKey(error);
      if (requestKey) {
        await uiAlert(requestKey, 'warning');
        return;
      }
      uiAlert('clientArea.booking_cancel_error', 'error');
    }
  };

  const marcarNovamente = (agendamento) => {
    const slug = String(agendamento?.negocio_slug || '').trim();
    const profissionalId = agendamento?.profissional_id || null;
    const entregaId = agendamento?.entrega_id || null;
    if (!slug || !profissionalId || !entregaId) {
      uiAlert('clientArea.rebook_unavailable', 'warning');
      return;
    }
    navigate(`/v/${slug}`, {
      state: {
        rebook: {
          profissionalId,
          entregaId,
        },
      },
    });
  };

  const abrirDepoimento = (agendamento) => {
    const jaAberto = depoimentoAlvo?.id === agendamento?.id;
    setDepoimentoAlvo(jaAberto ? null : agendamento);
    setDepoimentoNota(5);
    setDepoimentoTexto('');
  };

  const enviarDepoimentoAgendamento = async () => {
    if (!depoimentoAlvo?.id) return;
    try {
      setDepoimentoLoading(true);
      await createBookingReview({
        agendamentoId: depoimentoAlvo.id,
        nota: depoimentoNota,
        comentario: depoimentoTexto,
      });
      setAvaliacoesPorAgendamento((prev) => ({
        ...prev,
        [depoimentoAlvo.id]: true,
      }));
      setDepoimentoAlvo(null);
      setDepoimentoTexto('');
      setDepoimentoNota(5);
      feedback.showMessage('vitrine.depoimento_sent', { variant: 'success' });
    } catch (e) {
      const requestKey = getRequestErrorKey(e);
      if (requestKey === 'alerts.rate_limit_exceeded' || isRateLimitError(e)) {
        feedback.showMessage('clientArea.depoimento_rate_limit', { variant: 'warning' });
        return;
      }
      if (requestKey === 'alerts.request_timeout') {
        feedback.showMessage('alerts.request_timeout', { variant: 'warning' });
        return;
      }
      console.error('Client review send error:', e);
      feedback.showMessage('clientArea.depoimento_send_error');
    } finally {
      setDepoimentoLoading(false);
    }
  };

  const removerFavorito = async (favoritoId) => {
    if (!clienteId || removingFavoritoRef.current) return;
    try {
      removingFavoritoRef.current = true;
      setRemovingFavoritoId(favoritoId);
      await removerFavoritoCliente({ favoritoId, clienteId });
      setFavoritos(prev => prev.filter(f => f.id !== favoritoId));
      uiAlert('clientArea.favorite_removed', 'success');
    } catch {
      uiAlert('clientArea.favorite_remove_error', 'error');
    } finally {
      removingFavoritoRef.current = false;
      setRemovingFavoritoId(null);
    }
  };

  const excluirContaCliente = async () => {
    if (deletingAccount) return;
    const ok = await uiConfirm('clientArea.account_delete_confirm', 'danger');
    if (!ok) return;

    try {
      setDeletingAccount(true);
      await removerContaCliente();
      await uiAlert('clientArea.account_deleted', 'success');
      const logoutResult = onLogout?.('/');
      if (logoutResult?.catch) logoutResult.catch(() => {});
      navigate('/', { replace: true });
    } catch (error) {
      const requestKey = getRequestErrorKey(error);
      if (requestKey) {
        await uiAlert(requestKey, 'warning');
        return;
      }
      uiAlert('clientArea.account_delete_error', 'error');
    } finally {
      setDeletingAccount(false);
    }
  };

  const carregarMaisAgendamentos = async () => {
    if (agendamentosLoadingMore || !agendamentosHasMore) return;
    try {
      setAgendamentosLoadingMore(true);
      const nextPage = agendamentosPage + 1;
      const rows = await fetchAgendamentos({ page: nextPage, limit: PAGE_SIZE + 1 });
      const visibleRows = getVisiblePageRows(rows);
      const merged = mergeById(agendamentos, visibleRows);
      setAgendamentos(merged);
      await syncAvaliacoesConcluidas(merged);
      setAgendamentosPage(nextPage);
      setAgendamentosHasMore(getHasMoreRows(rows));
    } catch {
      uiAlert('clientArea.load_more_agendamentos_error', 'warning');
    } finally {
      setAgendamentosLoadingMore(false);
    }
  };

  const carregarMaisFavoritos = async () => {
    if (favoritosLoadingMore || !favoritosHasMore) return;
    try {
      setFavoritosLoadingMore(true);
      const nextPage = favoritosPage + 1;
      const rows = await fetchFavoritos({ page: nextPage, limit: PAGE_SIZE + 1 });
      setFavoritos(prev => mergeById(prev, getVisiblePageRows(rows)));
      setFavoritosPage(nextPage);
      setFavoritosHasMore(getHasMoreRows(rows));
    } catch {
      uiAlert('clientArea.load_more_favoritos_error', 'warning');
    } finally {
      setFavoritosLoadingMore(false);
    }
  };

  const agendamentosPorStatus = useMemo(() => {
    const abertos = [], cancelados = [], concluidos = [];
    for (const a of (agendamentos || [])) {
      const st = String(a?.status || '');
      if (st === 'concluido')            concluidos.push(a);
      else if (st.includes('cancelado')) cancelados.push(a);
      else                               abertos.push(a);
    }
    return {
      abertos:    sortByDateThenTimeDesc(abertos),
      cancelados: sortByDateThenTimeDesc(cancelados),
      concluidos: sortByDateThenTimeDesc(concluidos),
    };
  }, [agendamentos]);

  const avatarUrl      = getPublicUrl('avatars', avatarPath);
  const nomeCabecalho  = String(nomePerfil || user?.user_metadata?.nome || '—').trim();
  const avatarFallback = nomeCabecalho?.[0]?.toUpperCase() || '?';
  const clearSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchTerm('');
    setSearchRows([]);
    setSearchError('');
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-primary text-2xl animate-pulse">CARREGANDO...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-dark-100 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <Link to="/" className="flex items-center gap-3">
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-gray-800 bg-dark-200 flex items-center justify-center">
                {avatarUrl
                  ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  : <span className="text-white font-normal">{avatarFallback}</span>
                }
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl sm:text-2xl font-normal">MINHA ÁREA</h1>
                <p className="text-xs text-blue-400 -mt-1">CLIENTE</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <div ref={desktopSearchRef} className="relative hidden md:block">
                <div
                  className={[
                    'relative flex h-11 items-center overflow-hidden rounded-full transition-all duration-300 ease-out',
                    searchOpen
                      ? 'w-72 border border-white/10 bg-black/40 backdrop-blur-md lg:w-96'
                      : 'w-11 border border-transparent bg-transparent',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (searchOpen && !String(searchTerm || '').trim()) {
                        setSearchOpen(false);
                        setSearchRows([]);
                        setSearchError('');
                        return;
                      }
                      setSearchOpen(true);
                    }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center text-gray-300 transition-colors hover:text-primary"
                    aria-label="Pesquisar negócio ou profissional"
                  >
                    <SearchIcon strokeWidth={1.6} className="h-[18px] w-[18px]" />
                  </button>
                  <input
                    ref={desktopSearchInputRef}
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="PESQUISAR NEGÓCIO OU PROFISSIONAL"
                    className={[
                      'min-w-0 flex-1 bg-transparent pr-4 text-sm uppercase text-white placeholder:text-gray-500 focus:outline-none transition-opacity duration-200',
                      searchOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
                    ].join(' ')}
                    tabIndex={searchOpen ? 0 : -1}
                  />
                  {searching && searchOpen && String(searchTerm || '').trim().length >= 3 && (
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 rounded-full border border-primary border-t-transparent animate-spin" />
                    </div>
                  )}
                </div>
                {searchOpen && (
                  <SearchResults
                    searchTerm={searchTerm}
                    searching={searching}
                    searchError={searchError}
                    searchRows={searchRows}
                    onSelectResult={clearSearch}
                  />
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
              <button onClick={openFilePicker} disabled={uploadingAvatar} className="h-9 px-5 bg-dark-200 border border-gray-800 hover:border-primary/50 rounded-button text-sm transition-all uppercase focus:outline-none">
                {uploadingAvatar ? 'ENVIANDO...' : 'FOTO'}
              </button>
              <button onClick={() => onLogout?.()} className="h-9 flex items-center gap-2 px-5 bg-red-600 hover:bg-red-700 text-white rounded-button text-sm transition-all uppercase focus:outline-none">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">SAIR</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loadError && (
          <div className="mb-6 bg-red-500/10 border border-red-500/40 rounded-custom p-4 text-red-300 text-sm">
            {loadError}
          </div>
        )}

        <div className="mb-8 md:hidden">
          <div className="mx-auto max-w-md">
            <div className="relative flex h-11 items-center overflow-hidden rounded-full border border-white/10 bg-black/40 backdrop-blur-md">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center text-gray-300">
                <SearchIcon strokeWidth={1.6} className="h-[18px] w-[18px]" />
              </div>
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="PESQUISAR NEGÓCIO OU PROFISSIONAL"
                className="min-w-0 flex-1 bg-transparent pr-4 text-sm uppercase text-white placeholder:text-gray-500 focus:outline-none"
              />
              {searching && String(searchTerm || '').trim().length >= 3 && (
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 rounded-full border border-primary border-t-transparent animate-spin" />
                </div>
              )}
            </div>
            <SearchResults
              mobile
              searchTerm={searchTerm}
              searching={searching}
              searchError={searchError}
              searchRows={searchRows}
              onSelectResult={clearSearch}
            />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl sm:text-4xl font-normal mb-2">Olá {nomeCabecalho} :)</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 items-start">
          <button onClick={() => setActiveTab('agendamentos')} className="bg-dark-100 border border-gray-800 rounded-custom p-6 hover:border-primary/50 transition-all text-left">
            <TimePastIcon className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="text-lg font-normal mb-1">{agendamentos.length} AGENDAMENTOS</h3>
          </button>
          <button onClick={() => setActiveTab('favoritos')} className="bg-dark-100 border border-gray-800 rounded-custom p-6 hover:border-primary/50 transition-all text-left">
            <Heart filled size={32} className="text-red-500 mb-3" />
            <h3 className="text-lg font-normal mb-1">{favoritos.length} FAVORITOS</h3>
          </button>
          <button onClick={() => setActiveTab('dados')} className="bg-dark-100 border border-gray-800 rounded-custom p-6 hover:border-primary/50 transition-all text-left">
            <UserIcon className="w-8 h-8 text-primary mb-3" />
            <h3 className="text-lg font-normal mb-1">DADOS</h3>
          </button>
        </div>

        <div className="bg-dark-100 border border-gray-800 rounded-custom overflow-hidden">
          <div className="flex border-b border-gray-800">
            {['agendamentos', 'favoritos', 'dados'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 px-6 font-normal transition-all text-sm sm:text-base ${
                  activeTab === tab ? 'bg-primary/20 text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'agendamentos' ? 'AGENDAMENTOS' : tab === 'favoritos' ? 'FAVORITOS' : 'DADOS'}
              </button>
            ))}
          </div>

          <div className={activeTab === 'dados' ? '' : 'p-4 sm:p-6'}>

            {activeTab === 'agendamentos' && (
              <BookingsSection
                groups={agendamentosPorStatus}
                hasMore={agendamentosHasMore}
                loadingMore={agendamentosLoadingMore}
                onLoadMore={carregarMaisAgendamentos}
                onCancel={cancelarAgendamento}
                onRebook={marcarNovamente}
                onOpenReview={abrirDepoimento}
                reviewsByBooking={avaliacoesPorAgendamento}
                reviewTarget={depoimentoAlvo}
                reviewRating={depoimentoNota}
                setReviewRating={setDepoimentoNota}
                reviewText={depoimentoTexto}
                setReviewText={setDepoimentoTexto}
                reviewLoading={depoimentoLoading}
                onSubmitReview={enviarDepoimentoAgendamento}
              />
            )}

            {activeTab === 'favoritos' && (
              <FavoritesSection
                favoritos={favoritos}
                removingFavoritoId={removingFavoritoId}
                hasMore={favoritosHasMore}
                loadingMore={favoritosLoadingMore}
                onRemove={removerFavorito}
                onLoadMore={carregarMaisFavoritos}
              />
            )}

            {activeTab === 'dados' && (
              <>
                <div className="flex items-start gap-3 border-b border-gray-800 px-4 py-3 sm:px-6">
                  <span className="w-[74px] shrink-0 py-2 text-[14px] leading-5 text-gray-500">NOME</span>
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      value={nomePerfil}
                      onChange={(e) => setNomePerfil(e.target.value)}
                      readOnly={!isDadosEditing('nome')}
                      className={`${dataInputClass} uppercase ${dadosInputStateClass(isDadosEditing('nome'))}`}
                      placeholder="NOME DO PERFIL"
                    />
                  </div>
                  {renderDadosAction('nome', salvarNome, savingPerfil)}
                </div>

                <div className="flex items-start gap-3 border-b border-gray-800 px-4 py-3 sm:px-6">
                  <span className="w-[74px] shrink-0 py-2 text-[14px] leading-5 text-gray-500">E-MAIL</span>
                  <div className="min-w-0 flex-1">
                    <input
                      type={emailVisivel || isDadosEditing('email') ? 'email' : 'text'}
                      value={isDadosEditing('email') ? novoEmail : maskedPrivateValue}
                      onChange={(e) => setNovoEmail(e.target.value)}
                      readOnly={!isDadosEditing('email')}
                      className={`${dataInputClass} uppercase truncate pr-2 ${dadosInputStateClass(isDadosEditing('email'))}`}
                      placeholder="E-MAIL DE ACESSO"
                    />
                  </div>
                  {renderDadosAction('email', salvarEmail, savingDados)}
                </div>

                <div className="flex items-start gap-3 border-b border-gray-800 px-4 py-3 sm:px-6">
                  <span className="w-[74px] shrink-0 py-2 text-[14px] leading-5 text-gray-500">TELEFONE</span>
                  <div className="min-w-0 flex-1">
                    <input
                      type="tel"
                      value={telefoneCliente}
                      onChange={(e) => setTelefoneCliente(e.target.value)}
                      readOnly={!isDadosEditing('telefone')}
                      className={`${dataInputClass} uppercase ${dadosInputStateClass(isDadosEditing('telefone'))}`}
                      placeholder="WHATSAPP"
                    />
                  </div>
                  {renderDadosAction('telefone', salvarTelefone, savingDados)}
                </div>

                <div className="px-4 py-3 sm:px-6">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-[14px] leading-5 text-gray-500">SENHA</span>
                    {renderDadosAction('senha', salvarSenha, savingDados)}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      readOnly={!isDadosEditing('senha')}
                      className={`${dataPillInputClass} ${dadosInputStateClass(isDadosEditing('senha'))}`}
                      placeholder="NOVA SENHA"
                    />
                    <input
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      readOnly={!isDadosEditing('senha')}
                      className={`${dataPillInputClass} ${dadosInputStateClass(isDadosEditing('senha'))}`}
                      placeholder="CONFIRMAR"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-800 px-4 py-4 sm:px-6">
                  <button
                    type="button"
                    onClick={excluirContaCliente}
                    disabled={deletingAccount}
                    className="w-full rounded-full border border-red-500/30 py-3 text-center text-[12px] font-normal uppercase text-red-400 transition-colors hover:border-red-400/60 hover:text-red-300 disabled:opacity-50"
                  >
                    {deletingAccount ? 'EXCLUINDO' : 'EXCLUIR CONTA'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      <AppFooter userType={userType} onLogout={onLogout} />
    </div>
  );
}
