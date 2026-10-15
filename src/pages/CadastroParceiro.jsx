import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabase';
import { ptBR } from '../feedback/messages/ptBR';
import { useFeedback } from '../feedback/useFeedback';
import { getParceiroCadastroAlert } from '../utils/friendlyErrors';
import { fetchUserAccessProfile } from '../utils/profileAccess';

const msgs = ptBR.parceiroCadastro;

function FieldRow({ label, children, last = false }) {
  return (
    <div className={`flex items-center gap-3 px-5 py-3 ${last ? '' : 'border-b border-gray-800'}`}>
      <label className="w-[82px] shrink-0 text-sm tracking-wide text-gray-500">{label}</label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const fieldInputClass = 'w-full bg-transparent px-0 py-2 text-sm text-white placeholder-gray-600 outline-none focus:text-white';

function getEmailAvailabilityAlert(checkResult) {
  const reason = String(checkResult?.reason || '').trim();

  if (reason === 'email_invalid') return msgs.email_invalid;
  if (reason === 'rate_limit_exceeded') return msgs.email_check_rate_limit;
  if (reason !== 'email_already_registered') return msgs.access_unavailable;
  return msgs.email_registered_unknown;
}

export default function CadastroParceiro({ onLogin, suppressAuthRef }) {
  const navigate = useNavigate();
  const feedback = useFeedback();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const showPartnerAlert = (msg) => {
    feedback.showCustom({
      title: 'Cadastro parceiro',
      body: msg.body,
      variant: msg.variant === 'sucesso' ? 'success' : msg.variant === 'aviso' ? 'warning' : 'danger',
      screen: 'dark',
      buttonText: 'OK',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nomeClean = nome.trim().replace(/\s+/g, ' ');
    const emailClean = email.trim().toLowerCase();

    if (!nomeClean) return showPartnerAlert(msgs.nome_required);
    if (!emailClean || !emailClean.includes('@')) return showPartnerAlert(msgs.email_invalid);
    if (senha.length < 7) return showPartnerAlert(msgs.senha_too_short);

    setLoading(true);
    if (suppressAuthRef) suppressAuthRef.current = true;

    try {
      const { data: emailStatus, error: emailStatusErr } = await supabase.rpc('check_signup_email_availability', {
        p_email: emailClean,
      });

      if (emailStatusErr) throw emailStatusErr;
      if (emailStatus?.available === false) {
        return showPartnerAlert(getEmailAvailabilityAlert(emailStatus));
      }

      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: emailClean,
        password: senha,
        options: {
          data: {
            type: 'professional',
            partner_signup: true,
            nome: nomeClean,
          },
          emailRedirectTo: `${window.location.origin}/selecionar-negocio-parceiro`,
        },
      });

      if (signUpErr) {
        if (String(signUpErr.message || '').toLowerCase().includes('already')) {
          return showPartnerAlert(msgs.access_unavailable);
        }
        throw signUpErr;
      }

      const uid = signUpData?.user?.id;
      if (!uid) throw new Error(msgs.account_create_error.body);

      if (!signUpData?.session) {
        setShowAlert(true);
        return;
      }

      const profile = await fetchUserAccessProfile(uid);
      if (!profile) throw new Error(msgs.account_create_error.body);

      if (suppressAuthRef) suppressAuthRef.current = false;
      onLogin?.(signUpData.user, profile.type, profile.onboardingStatus, profile.accessState, profile.professionalRole);
      navigate('/selecionar-negocio-parceiro', { replace: true });
    } catch (e) {
      showPartnerAlert(getParceiroCadastroAlert(e, msgs));
      console.error('Partner signup error:', e);
      await supabase.auth.signOut();
    } finally {
      if (suppressAuthRef) suppressAuthRef.current = false;
      setLoading(false);
    }
  };

  if (showAlert) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-green-400 text-2xl font-normal">:)</span>
          </div>
          <h1 className="text-3xl font-normal text-white uppercase mb-4">{msgs.success_title}</h1>
          <p className="text-gray-400 font-normal mb-8">{msgs.success_body}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-gradient-to-r from-primary to-yellow-600 text-black rounded-button font-normal uppercase"
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/Comvaga Logo.png" alt="COMVAGA" className="h-20 w-auto object-contain mx-auto mb-4" />
          <h1 className="text-3xl font-normal text-white uppercase">CADASTRO PARCEIRO</h1>
          <p className="text-gray-500 text-sm mt-2 font-normal">CONFIRME SEU E-MAIL PARA CONTINUAR</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="overflow-hidden rounded-custom border border-gray-800 bg-dark-100">
            <FieldRow label="NOME">
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="NOME PROFISSIONAL"
                className={`${fieldInputClass} uppercase`}
                required
              />
            </FieldRow>

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
                  placeholder="MÍNIMO 7 CARACTERES"
                  className={`${fieldInputClass} pr-10`}
                  required
                  minLength={7}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-600 transition-colors hover:text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
              {loading ? 'ENVIANDO...' : 'CONTINUAR'}
            </button>

            <Link
              to="/login/parceiro"
              className="flex w-full items-center justify-center rounded-button border border-primary/30 bg-transparent py-3 text-sm font-normal uppercase tracking-wider text-primary transition-all hover:border-primary hover:text-yellow-500"
            >
              FAZER LOGIN
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
