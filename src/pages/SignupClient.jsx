import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabase';
import { useFeedback } from '../feedback/useFeedback';
import { UserIcon } from '../components/icons';

const PROFILE_TABLE = 'users';
const isValidType = (t) => t === 'client' || t === 'professional';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isEmailAlreadyExistsError(err) {
  const text = String(err?.message || err?.error_description || err?.details || '').toLowerCase();
  return (
    text.includes('already registered') ||
    text.includes('already exists') ||
    text.includes('email already exists') ||
    text.includes('user already registered')
  );
}

function getEmailAvailabilityMessageKey(checkResult) {
  const reason = String(checkResult?.reason || '').trim();

  if (reason === 'email_invalid') return 'signupClient.email_invalid';
  if (reason === 'rate_limit_exceeded') return 'alerts.rate_limit_exceeded';
  if (reason === 'email_already_registered') return 'signupClient.email_already_exists';

  return 'alerts.action_failed_support';
}

async function fetchProfileTypeWithRetry(userId) {
  const delays = [200, 300, 400, 500, 600, 600];

  for (let i = 0; i < delays.length; i++) {
    const { data, error } = await supabase
      .from(PROFILE_TABLE)
      .select('type')
      .eq('id', userId)
      .maybeSingle();

    if (!error && isValidType(data?.type)) return data.type;
    await sleep(delays[i]);
  }

  return null;
}

export default function SignupClient({ onLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({ nome: '', email: '', password: '' });

  const navigate = useNavigate();
  const { showMessage } = useFeedback();

  const handleSignup = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      const nome = String(formData.nome || '').trim();
      const email = String(formData.email || '').trim().toLowerCase();
      const password = String(formData.password || '');

      if (!nome) { showMessage('signupClient.name_required'); return; }
      if (!email.includes('@')) { showMessage('signupClient.email_invalid'); return; }
      if (password.length < 7) { showMessage('signupClient.password_too_short'); return; }

      const { data: emailStatus, error: emailStatusError } = await supabase.rpc('check_signup_email_availability', {
        p_email: email,
      });

      if (emailStatusError) throw emailStatusError;
      if (emailStatus?.available === false) {
        showMessage(getEmailAvailabilityMessageKey(emailStatus));
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { type: 'client', nome },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (authError) {
        if (isEmailAlreadyExistsError(authError)) {
          showMessage('signupClient.email_already_exists');
          return;
        }
        throw authError;
      }
      if (!authData?.user?.id) throw new Error('Inexistência de usuário no retorno do Supabase.');

      if (!authData.session) {
        showMessage('signupClient.created_confirm_email');
        navigate('/login');
        return;
      }

      const dbType = await fetchProfileTypeWithRetry(authData.user.id);

      if (!dbType) { showMessage('signupClient.profile_not_ready'); return; }

      onLogin(authData.user, dbType);
      navigate('/minha-area');
    } catch (err) {
      try { await supabase.auth.signOut(); } catch (signOutError) {
        console.warn('Falha ao deslogar após erro de cadastro.', signOutError);
      }
      showMessage('alerts.action_failed_support');
      console.error('SignupClient error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fieldRowClass = 'flex items-center gap-3 px-5 py-3 border-b border-gray-800/50';
  const fieldLabelClass = 'w-[76px] shrink-0 text-sm text-white tracking-wide';
  const fieldInputClass = 'w-full bg-transparent px-0 py-2 text-sm text-white placeholder-gray-600 outline-none focus:text-white';

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] animate-pulse animation-delay-1s"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <Link
          to="/cadastro"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-blue-400 mb-12 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-normal tracking-wider">VOLTAR</span>
        </Link>

        <div className="flex justify-center mb-8">
          <img
            src="/Comvaga Logo.png"
            alt="COMVAGA"
            className="h-24 w-auto object-contain"
          />
        </div>

        <form onSubmit={handleSignup} className="relative">
          <div className="text-center mb-10">
            <UserIcon className="mx-auto mb-4 text-blue-400 w-12 h-12" />
            <h1 className="text-4xl font-normal mb-3 tracking-wide">CRIAR CONTA</h1>
            <p className="text-gray-500 text-base font-normal">CADASTRO DE <span className="text-blue-400">CLIENTE</span></p>
          </div>

          <div className="space-y-5">
            <div className="overflow-hidden rounded-custom border border-gray-800/50 bg-dark-100/40 backdrop-blur-sm">
              <div className={fieldRowClass}>
              <label className={fieldLabelClass}>SEU NOME</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="NOME COMPLETO"
                className={`${fieldInputClass} uppercase`}
                required
              />
            </div>

              <div className={fieldRowClass}>
              <label className={fieldLabelClass}>E-MAIL</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="SEU E-MAIL"
                className={`${fieldInputClass} uppercase`}
                required
              />
            </div>

              <div className="flex items-center gap-3 px-5 py-3">
              <label className={fieldLabelClass}>SENHA</label>
              <div className="relative min-w-0 flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="MÍNIMO 7 CARACTERES"
                  className={`${fieldInputClass} pr-10`}
                  required
                  minLength={7}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            </div>

            <div className="space-y-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-500/10 border border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/20 text-blue-400 rounded-full font-normal text-sm tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'CRIANDO CONTA...' : 'CRIAR CONTA'}
              </button>

              <Link
                to="/login"
                className="flex w-full items-center justify-center rounded-full border border-blue-500/30 bg-transparent py-3 text-center text-sm font-normal uppercase tracking-wider text-blue-400 transition-all hover:border-blue-500/60 hover:text-blue-300"
              >
                FAZER LOGIN
              </Link>
            </div>
          </div>
        </form>

        <div className="text-center mt-12">
          <p className="text-xs text-gray-600 font-normal">
            AO CONTINUAR, VOCÊ CONCORDA COM NOSSOS{' '}
            <Link to="/termos" className="text-gray-500 hover:text-blue-400 transition-colors">
              TERMOS DE USO
            </Link>
            {' '}E{' '}
            <Link to="/privacidade" className="text-gray-500 hover:text-blue-400 transition-colors">
              POLÍTICA DE PRIVACIDADE
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
