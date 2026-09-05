import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabase';
import { useFeedback } from '../feedback/useFeedback';
import { fetchUserAccessProfile } from '../utils/profileAccess';
import { clearPasswordRecoveryState } from '../utils/auth';
import {
  getLoginAuthAlertKey,
  getPasswordResetRequestAlertKey,
  getPasswordUpdateAlertKey,
} from '../utils/friendlyErrors';
import { ProfessionalIcon, UserIcon } from '../components/icons';

export default function Login({ onLogin, inRecovery: inRecoveryProp = false }) {
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const navigate = useNavigate();

  const [isRecovery, setIsRecovery] = useState(inRecoveryProp);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');

  const [resetLoading, setResetLoading] = useState(false);

  const { showMessage } = useFeedback();

  useEffect(() => {
    setIsRecovery(!!inRecoveryProp);
    setStep(inRecoveryProp ? 2 : 1);
  }, [inRecoveryProp]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        setStep(2);
      }
    });

    return () => {
      data?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      const email = String(formData.email || '').trim();

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: formData.password,
      });

      if (authError) throw authError;

      const authUser = authData?.user;
      if (!authUser?.id) throw new Error('Falha ao autenticar.');

      const profile = await fetchUserAccessProfile(authUser.id);

      if (!profile) {
        await supabase.auth.signOut();
        throw new Error('Perfil inexistente. Conclua seu cadastro para acessar.');
      }

      if (!userType) {
        await supabase.auth.signOut();
        throw new Error('Selecione o tipo de conta para entrar.');
      }

      if (profile.type !== userType) {
        await supabase.auth.signOut();
        throw new Error(
          `Esta conta e de ${profile.type === 'client' ? 'CLIENTE' : 'PROFISSIONAL'}. Selecione o tipo correto.`
        );
      }

      if (userType === 'professional' && profile.professionalRole !== 'owner') {
        await supabase.auth.signOut();
        showMessage('login.partner_use_partner_login');
        return;
      }

      onLogin?.(
        authUser,
        profile.type,
        profile.onboardingStatus,
        profile.accessState,
        profile.professionalRole
      );

    } catch (err) {
      showMessage(getLoginAuthAlertKey(err));
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (resetLoading) return;

    setResetLoading(true);

    try {
      const email = String(formData.email || '').trim();
      if (!email) {
        showMessage('login.reset_email_required');
        return;
      }

      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetErr) throw resetErr;

      showMessage('login.reset_sent');
    } catch (e) {
      showMessage(getPasswordResetRequestAlertKey(e));
      console.error('Password reset request error:', e);
    } finally {
      setResetLoading(false);
    }
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    if (recoveryLoading) return;

    setRecoveryLoading(true);

    try {
      if (newPassword.length < 7) {
        showMessage('login.recovery_password_too_short');
        return;
      }
      if (newPassword !== newPassword2) {
        showMessage('login.recovery_password_mismatch');
        return;
      }

      const { error: upErr } = await supabase.auth.updateUser({ password: newPassword });
      if (upErr) throw upErr;

      showMessage('login.recovery_password_updated');

      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (signOutError) {
        console.warn('Password recovery signOut warning:', signOutError);
      }
      clearPasswordRecoveryState();
      navigate('/login', { replace: true });
    } catch (e2) {
      showMessage(getPasswordUpdateAlertKey(e2));
      console.error('Password update error:', e2);
    } finally {
      setRecoveryLoading(false);
    }
  };

  const title = isRecovery
    ? 'Definir nova senha'
    : step === 1
      ? 'BEM-VINDO DE VOLTA'
      : `${userType === 'client' ? 'CLIENTE' : 'PROFISSIONAL'}`;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div
          className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-primary mb-12 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-normal tracking-wider">VOLTAR</span>
        </Link>

        <div className="flex justify-center mb-8">
          <img src="/Comvaga Logo.png" alt="COMVAGA" className="h-20 w-auto object-contain" />
        </div>

        <div className="relative">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-normal mb-3 tracking-wide">{title}</h1>
            {step === 1 && !isRecovery && (
              <p className="text-gray-500 text-base font-normal">:)</p>
            )}
          </div>

          {isRecovery ? (
            <form onSubmit={handleSetNewPassword} className="space-y-5">
              <div className="space-y-4">
                <div className="relative group">
                  <input
                    type="password"
                    placeholder="NOVA SENHA"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-dark-100/50 border border-gray-800 rounded-custom text-white placeholder-gray-600 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all backdrop-blur-sm"
                    required
                  />
                </div>

                <div className="relative group">
                  <input
                    type="password"
                    placeholder="CONFIRMAR"
                    value={newPassword2}
                    onChange={(e) => setNewPassword2(e.target.value)}
                    className="w-full px-5 py-4 bg-dark-100/50 border border-gray-800 rounded-custom text-white placeholder-gray-600 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all backdrop-blur-sm"
                    required
                  />
                </div>
              </div>

              <button
                disabled={recoveryLoading}
                className="w-full py-4 bg-gradient-to-r from-primary to-yellow-600 text-black font-normal rounded-button hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {recoveryLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    SALVANDO...
                  </span>
                ) : (
                  'SALVAR NOVA SENHA'
                )}
              </button>
            </form>
          ) : (
            <>
              {step === 1 ? (
                <div className="grid grid-cols-2 gap-5">
                  <button
                    onClick={() => { setUserType('client'); setStep(2); }}
                    className="group relative bg-dark-100/40 border border-gray-800/50 rounded-custom p-8 hover:border-blue-500/50 hover:bg-dark-100/60 transition-all overflow-hidden backdrop-blur-sm"
                  >
                    <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-all" />
                    <div className="relative">
                      <UserIcon className="mx-auto mb-4 text-blue-400 w-10 h-10 group-hover:scale-110 transition-transform" />
                      <div className="font-normal text-lg tracking-wide mb-1">CLIENTE</div>
                      <div className="text-xs text-gray-500">AGENDAR TRABALHO</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { setUserType('professional'); setStep(2); }}
                    className="group relative bg-dark-100/40 border border-gray-800/50 rounded-custom p-8 hover:border-primary/50 hover:bg-dark-100/60 transition-all overflow-hidden backdrop-blur-sm"
                  >
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-all" />
                    <div className="relative">
                      <ProfessionalIcon className="mx-auto mb-4 text-primary w-10 h-10 group-hover:scale-110 transition-transform" />
                      <div className="font-normal text-lg tracking-wide mb-1">PROFISSIONAL</div>
                      <div className="text-xs text-gray-500">GERENCIAR NEGÓCIO</div>
                    </div>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors group"
                    >
                      <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                      TROCAR TIPO
                    </button>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={resetLoading}
                      className="inline-flex shrink-0 items-center justify-center rounded-full border border-yellow-500/40 bg-transparent px-4 py-1.5 text-xs font-normal uppercase text-yellow-400 transition-colors hover:border-yellow-500 hover:text-yellow-300 disabled:opacity-50"
                    >
                      {resetLoading ? 'ENVIANDO...' : 'TROCAR SENHA'}
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-custom border border-gray-800 bg-dark-100/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3 border-b border-gray-800 px-5 py-3">
                      <label className="w-[76px] shrink-0 text-sm tracking-wide text-white-500">E-MAIL</label>
                      <input
                        type="email"
                        placeholder="SEU E-MAIL"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-transparent px-0 py-2 text-sm uppercase text-white placeholder-gray-600 outline-none focus:text-white"
                        required
                      />
                    </div>
                    <div className="flex items-center gap-3 px-5 py-3">
                      <label className="w-[76px] shrink-0 text-sm tracking-wide text-white-500">SENHA</label>
                      <div className="relative min-w-0 flex-1">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full bg-transparent px-0 py-2 pr-10 text-sm text-white placeholder-gray-600 outline-none focus:text-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      disabled={loading}
                      className="w-full py-4 bg-gradient-to-r from-primary to-yellow-600 text-black font-normal rounded-button hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          ENTRANDO...
                        </span>
                      ) : (
                        'ENTRAR'
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(userType === 'client' ? '/cadastro/cliente' : '/cadastro/profissional')}
                      className="w-full rounded-button border border-primary/30 bg-transparent py-4 text-sm font-normal uppercase text-primary transition-all hover:border-primary hover:text-yellow-500"
                    >
                      CRIAR CONTA
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        <div className="text-center mt-12">
          <p className="text-xs text-gray-600 font-normal">
            AO CONTINUAR, VOCÊ CONCORDA COM NOSSOS{' '}
            <Link to="/termos" className="text-gray-500 hover:text-primary transition-colors">
              TERMOS DE USO
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
