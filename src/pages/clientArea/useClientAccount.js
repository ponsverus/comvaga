import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../supabase';
import { convertImageToWebp, isImageFile, MEDIA_LIMITS } from '../../utils/media';
import { formatPhoneForDisplay, normalizeBrazilPhone } from '../../utils/phone';
import { getRequestErrorKey } from '../../utils/requestError';
import { withAuthRetry } from '../../utils/authSession';
import { excluirContaCliente } from './api/clientAreaApi';

export function useClientAccount({ user, onLogout, navigate, uiAlert, uiConfirm }) {
  const [avatarPath,      setAvatarPath]      = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

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

  useEffect(() => { setNovoEmail(user?.email || ''); }, [user?.email]);

  const applyProfile = useCallback((perfil) => {
    setNomePerfil(perfil.nome);
    setAvatarPath(perfil.avatarPath);
    setTelefoneCliente(formatPhoneForDisplay(perfil.telefone) || '');
  }, []);

  const openFilePicker = () => fileInputRef.current?.click();

  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const maxMb   = MEDIA_LIMITS.avatarInputBytes / (1024 * 1024);
    if (!isImageFile(file)) { uiAlert('clientArea.avatar_invalid_format', 'error'); return; }
    if (file.size > MEDIA_LIMITS.avatarInputBytes) { uiAlert('clientArea.avatar_too_large', 'error', { maxMb }); return; }
    let uploadedPath = null;
    try {
      setUploadingAvatar(true);
      const convertedFile = await convertImageToWebp(file, { maxDimension: MEDIA_LIMITS.avatarMaxDimension });
      const path = `${user.id}/avatar-${Date.now()}.webp`;
      const { error: upErr } = await withAuthRetry(
        () => supabase.storage.from('avatars').upload(path, convertedFile, { upsert: false, contentType: convertedFile.type }),
        10000,
        'avatar-upload'
      );
      if (upErr) throw upErr;
      uploadedPath = path;
      const { data: updatedClient, error: updErr } = await withAuthRetry(
        () => supabase
          .from('clientes')
          .update({ avatar_path: path })
          .eq('user_id', user.id)
          .eq('status', 'ativo')
          .select('id')
          .maybeSingle(),
        6000,
        'avatar-path-update'
      );
      if (updErr) throw updErr;
      if (!updatedClient?.id) throw new Error('avatar_path_update_missing_client');
      uploadedPath = null;
      setAvatarPath(path);
      uiAlert('clientArea.avatar_updated', 'success');
    } catch {
      if (uploadedPath) {
        try {
          const { error: queueError } = await withAuthRetry(
            () => supabase.rpc('enqueue_owned_orphan_storage_delete', {
              p_bucket: 'avatars',
              p_path: uploadedPath,
            }),
            6000,
            'avatar-enqueue-orphan-delete'
          );
          if (queueError) throw queueError;
        } catch (queueError) {
          console.warn('Falha ao enfileirar limpeza de avatar sem vinculo.', queueError);
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

  const handleExcluirContaCliente = async () => {
    if (deletingAccount) return;
    const ok = await uiConfirm('clientArea.account_delete_confirm', 'danger');
    if (!ok) return;

    try {
      setDeletingAccount(true);
      await excluirContaCliente();
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

  return {
    avatarPath,
    uploadingAvatar,
    fileInputRef,
    nomePerfil,
    setNomePerfil,
    savingPerfil,
    novoEmail,
    setNovoEmail,
    telefoneCliente,
    setTelefoneCliente,
    novaSenha,
    setNovaSenha,
    confirmarSenha,
    setConfirmarSenha,
    savingDados,
    deletingAccount,
    emailVisivel,
    isDadosEditing,
    dadosFieldChanged,
    dadosInputStateClass,
    startDadosEditing,
    saveDadosField,
    openFilePicker,
    onPickAvatar,
    salvarNome,
    salvarEmail,
    salvarTelefone,
    salvarSenha,
    handleExcluirContaCliente,
    applyProfile,
  };
}
