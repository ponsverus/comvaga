import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabase';
import { ptBR } from '../feedback/messages/ptBR';
import { useFeedback } from '../feedback/useFeedback';
import { fetchUserAccessProfile } from '../utils/profileAccess';
import { getParceiroLoginAlert } from '../utils/friendlyErrors';

const msgs = ptBR.parceiroLogin;


function FieldRow({ label, children, last = false }) {
  return (
    <div className={`flex items-center gap-3 px-5 py-3 ${last ? '' : 'border-b border-gray-800'}`}>
      <label className="w-[76px] shrink-0 text-sm tracking-wide text-gray-500">{label}</label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const fieldInputClass = 'w-full bg-transparent px-0 py-2 text-sm text-white placeholder-gray-600 outline-none focus:text-white';

export default function LoginParceiro({ onLogin, suppressAuthRef }) {
  const navigate = useNavigate();
  const feedback = useFeedback();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const showPartnerAlert = (msg) => {
    feedback.showCustom({
      title: 'Login parceiro',
      body: msg.body,
      variant: msg.variant === 'sucesso' ? 'success' : msg.variant === 'aviso' ? 'warning' : 'danger',
      screen: 'dark',
      buttonText: 'OK',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailClean = email.trim().toLowerCase();

    if (!emailClean || !emailClean.includes('@')) return showPartnerAlert(msgs.email_invalid);
    if (senha.length < 7) return showPartnerAlert(msgs.senha_too_short);

    setLoading(true);
    if (suppressAuthRef) suppressAuthRef.current = true;

    try {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: emailClean,
        password: senha,
      });

      if (signInErr) {
        if (String(signInErr.message || '').toLowerCase().includes('invalid')) {
          return showPartnerAlert(msgs.credentials_invalid);
        }
        throw signInErr;
      }

      const uid = signInData?.user?.id;
      if (!uid) throw new Error(msgs.auth_error.body);

      const accessProfile = await fetchUserAccessProfile();
      if (accessProfile?.type !== 'professional') {
        await supabase.auth.signOut();
        return showPartnerAlert(msgs.not_partner);
      }

      if (accessProfile?.professionalRole === 'owner') {
        await supabase.auth.signOut();
        return showPartnerAlert(ptBR.parceiroCadastro.owner_cannot_request_partner_access);
      }

      if (accessProfile?.professionalRole !== 'partner') {
        await supabase.auth.signOut();
        return showPartnerAlert(msgs.not_partner);
      }

      if (suppressAuthRef) suppressAuthRef.current = false;
      onLogin(
        signInData.user,
        'professional',
        accessProfile.onboardingStatus,
        accessProfile.accessState,
        'partner'
      );
      navigate('/selecionar-negocio-parceiro', { replace: true });
    } catch (e2) {
      showPartnerAlert(getParceiroLoginAlert(e2, msgs));
      console.error('Partner login error:', e2);
      await supabase.auth.signOut();
    } finally {
      if (suppressAuthRef) suppressAuthRef.current = false;
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (resetLoading) return;
    const emailClean = email.trim().toLowerCase();
    if (!emailClean || !emailClean.includes('@')) {
      showPartnerAlert(msgs.reset_email_required);
      return;
    }
    setResetLoading(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(emailClean, {
        redirectTo: `${window.location.origin}/reset-password?next=${encodeURIComponent('/login/parceiro')}`,
      });
      if (resetErr) throw resetErr;
      showPartnerAlert(msgs.reset_sent);
    } catch {
      showPartnerAlert(msgs.reset_error);
    } finally {
      setResetLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/Comvaga Logo.png" alt="COMVAGA" className="h-20 w-auto object-contain mx-auto mb-4" />
          <h1 className="text-3xl font-normal text-white uppercase">LOGIN PARCEIRO</h1>
          <p className="text-gray-500 text-sm mt-2 font-normal">ACESSE SUA CENTRAL DE NEGÓCIOS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetLoading}
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-yellow-500/40 bg-transparent px-4 py-1.5 text-xs font-normal uppercase text-yellow-400 transition-colors hover:border-yellow-500 hover:text-yellow-300 disabled:opacity-50"
            >
              {resetLoading ? 'ENVIANDO...' : 'TROCAR SENHA'}
            </button>
          </div>

          <div className="overflow-hidden rounded-custom border border-gray-800 bg-dark-100">
            <FieldRow label="E-MAIL">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="SEU E-MAIL"
                className={`${fieldInputClass} uppercase`}
                required
              />
            </FieldRow>

            <FieldRow label="SENHA" last>
              <div className="relative min-w-0">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className={`${fieldInputClass} pr-10`}
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
            </FieldRow>
          </div>

          <div className="space-y-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary to-yellow-600 text-black rounded-button font-normal uppercase disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'ENTRANDO...' : 'ENTRAR'}
            </button>

            <Link
              to="/cadastro/parceiro"
              className="flex w-full items-center justify-center rounded-button border border-primary/30 bg-transparent py-3 text-sm font-normal uppercase tracking-wider text-primary transition-all hover:border-primary hover:text-yellow-500"
            >
              SOLICITAR ACESSO
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
