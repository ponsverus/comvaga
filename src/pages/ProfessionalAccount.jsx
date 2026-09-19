import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { supabase } from '../supabase';
import { useFeedback } from '../feedback/useFeedback';
import { withAuthRetry } from '../utils/authSession';
import { getRequestErrorKey } from '../utils/requestError';
import AccountDataSection from './dashboard/sections/AccountDataSection';

export default function ProfessionalAccount({ user, onLogout, professionalRole = null }) {
  const navigate = useNavigate();
  const feedback = useFeedback();
  const [nomePerfil, setNomePerfil] = useState('');
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [novoEmail, setNovoEmail] = useState(user?.email || '');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [savingDados, setSavingDados] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const uiAlert = useCallback(async (key, variant = 'info') => {
    if (feedback?.showMessage) return feedback.showMessage(key, { variant });
    return Promise.resolve();
  }, [feedback]);

  const uiConfirm = useCallback(async (key, variant = 'warning') => {
    if (feedback?.confirm) return !!(await feedback.confirm(key, { variant }));
    return false;
  }, [feedback]);

  useEffect(() => { setNovoEmail(user?.email || ''); }, [user?.email]);

  useEffect(() => {
    let active = true;
    if (!user?.id) return () => { active = false; };

    (async () => {
      const fallback = String(user?.user_metadata?.nome || '').trim();
      try {
        const { data, error } = await withAuthRetry(
          supabase
            .from('users')
            .select('nome')
            .eq('id', user.id)
            .maybeSingle(),
          6000,
          'professional-account-name'
        );
        if (error) throw error;
        if (active) setNomePerfil(String(data?.nome || fallback).trim());
      } catch {
        if (active) setNomePerfil(fallback);
      }
    })();

    return () => { active = false; };
  }, [user?.id, user?.user_metadata?.nome]);

  const salvarNomePerfil = useCallback(async () => {
    const nome = String(nomePerfil || '').trim();
    if (!nome) {
      await uiAlert('clientArea.profile_name_required', 'error');
      return false;
    }
    try {
      setSavingPerfil(true);
      const { error: updErr } = await withAuthRetry(
        supabase.from('users').update({ nome }).eq('id', user.id),
        6000,
        'professional-account-name-update'
      );
      if (updErr) throw updErr;
      const { error: metaErr } = await withAuthRetry(
        supabase.auth.updateUser({ data: { nome } }),
        6000,
        'professional-account-auth-name-update'
      );
      if (metaErr) console.warn('Falha ao atualizar metadados do usuario.', metaErr);
      setNomePerfil(nome);
      await uiAlert('clientArea.profile_name_updated', 'success');
      return true;
    } catch {
      await uiAlert('clientArea.profile_name_update_error', 'error');
      return false;
    } finally {
      setSavingPerfil(false);
    }
  }, [nomePerfil, uiAlert, user?.id]);

  const salvarEmail = async () => {
    const email = String(novoEmail || '').trim();
    if (!email || !email.includes('@')) {
      await uiAlert('dashboard.account_email_invalid', 'error');
      return false;
    }
    try {
      setSavingDados(true);
      const { error } = await withAuthRetry(
        supabase.auth.updateUser({ email }),
        6000,
        'professional-account-email-update'
      );
      if (error) throw error;
      await uiAlert('dashboard.account_email_update_sent', 'success');
      return true;
    } catch {
      await uiAlert('dashboard.account_email_update_error', 'error');
      return false;
    } finally {
      setSavingDados(false);
    }
  };

  const salvarSenha = async () => {
    const pass = String(novaSenha || '');
    const conf = String(confirmarSenha || '');
    if (pass.length < 7) {
      await uiAlert('dashboard.account_password_too_short', 'error');
      return false;
    }
    if (pass !== conf) {
      await uiAlert('dashboard.account_password_mismatch', 'error');
      return false;
    }
    try {
      setSavingDados(true);
      const { error } = await withAuthRetry(
        supabase.auth.updateUser({ password: pass }),
        6000,
        'professional-account-password-update'
      );
      if (error) throw error;
      setNovaSenha('');
      setConfirmarSenha('');
      await uiAlert('dashboard.account_password_updated', 'success');
      return true;
    } catch {
      await uiAlert('dashboard.account_password_update_error', 'error');
      return false;
    } finally {
      setSavingDados(false);
    }
  };

  const excluirConta = async () => {
    if (deletingAccount) return;
    const confirmed = await uiConfirm('professionalAccount.account_delete_confirm', 'danger');
    if (!confirmed) return;

    try {
      setDeletingAccount(true);
      const { error } = await withAuthRetry(
        supabase.rpc('remove_professional_account_seguro'),
        8000,
        'professional-account-delete'
      );
      if (error) throw error;
      await uiAlert('professionalAccount.account_deleted', 'success');
      const redirectTo = professionalRole === 'partner' ? '/login/parceiro' : '/login';
      try {
        await onLogout?.(redirectTo);
      } catch {
        navigate(redirectTo, { replace: true });
      }
    } catch (error) {
      const raw = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
      const requestKey = getRequestErrorKey(error);
      if (raw.includes('account_delete_owned_businesses_blocked') || raw.includes('user_delete_owned_business_exists')) {
        await uiAlert('professionalAccount.account_delete_owned_businesses', 'warning');
      } else if (raw.includes('profissional_agendamentos_futuros_bloqueados')) {
        await uiAlert('professionalAccount.account_delete_future_bookings', 'warning');
      } else if (requestKey) {
        await uiAlert(requestKey, 'warning');
      } else {
        await uiAlert('professionalAccount.account_delete_error', 'danger');
      }
      setDeletingAccount(false);
    }
  };

  const backPath = professionalRole === 'partner' ? '/selecionar-negocio-parceiro' : '/dashboard';

  return (
    <div className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link to={backPath} className="inline-flex items-center gap-2 text-sm uppercase text-gray-400 transition-colors hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <img src="/Comvaga Logo.png" alt="COMVAGA" className="h-12 w-auto object-contain" />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-normal uppercase tracking-wide">Minha conta</h1>
          <p className="mt-2 text-sm uppercase text-gray-500">CLIQUE, EDITE E SALVE</p>
        </div>

        <div className="overflow-hidden rounded-custom border border-gray-800 bg-dark-100 p-6">
          <AccountDataSection
            nomePerfil={nomePerfil}
            setNomePerfil={setNomePerfil}
            savingPerfil={savingPerfil}
            salvarNomePerfil={salvarNomePerfil}
            novoEmail={novoEmail}
            setNovoEmail={setNovoEmail}
            savingDados={savingDados}
            salvarEmail={salvarEmail}
            novaSenha={novaSenha}
            setNovaSenha={setNovaSenha}
            confirmarSenha={confirmarSenha}
            setConfirmarSenha={setConfirmarSenha}
            salvarSenha={salvarSenha}
          />
        </div>

        <div className="mt-6 flex items-center gap-3">
          {professionalRole !== 'partner' && (
            <button
              type="button"
              onClick={() => navigate('/criar-negocio')}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-button border border-primary/30 py-3 text-[12px] font-normal uppercase text-primary transition-colors hover:border-primary"
            >
              <Plus className="h-4 w-4" />
              Criar outro
            </button>
          )}
          <button
            type="button"
            onClick={excluirConta}
            disabled={deletingAccount}
            className="flex-1 rounded-button border border-red-500/30 py-3 text-[12px] font-normal uppercase text-red-400 transition-colors hover:border-red-400 disabled:opacity-50"
          >
            {deletingAccount ? 'Excluindo' : 'Excluir conta'}
          </button>
        </div>
      </div>
    </div>
  );
}
