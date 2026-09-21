import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabase';
import { useFeedback } from '../feedback/useFeedback';
import { ProfessionalIcon } from '../components/icons';
import { DEFAULT_PLAN_CODE, getPlanFromSearch, getSelectedPlanIntent, saveSelectedPlanIntent } from '../utils/plans';
import { fetchUserAccessProfile } from '../utils/profileAccess';

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

  if (reason === 'email_invalid') return 'signupProfessional.email_invalid';
  if (reason === 'rate_limit_exceeded') return 'alerts.rate_limit_exceeded';
  if (reason === 'email_already_registered') return 'signupProfessional.email_already_exists';

  return 'alerts.action_failed_support';
}

async function fetchProfileTypeWithRetry(userId) {
  const delays = [200, 300, 400, 500, 600, 600, 700, 800];

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

function onlyTrim(v) {
  return String(v || '').trim();
}

function SignupFieldRow({ label, children, last = false }) {
  return (
    <div className={`flex items-start gap-3 px-5 py-3 ${last ? '' : 'border-b border-gray-800/50'}`}>
      <label className="w-[96px] shrink-0 py-2 text-sm tracking-wide text-white">{label}</label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const fieldInputClass = 'w-full bg-transparent px-0 py-2 text-sm text-white placeholder-gray-600 outline-none focus:text-white';

export default function SignupProfessional({ onLogin }) {
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
  });

  const navigate = useNavigate();
  const { showMessage } = useFeedback();
  const selectedPlanCode = useMemo(
    () => getPlanFromSearch(searchParams) || getSelectedPlanIntent() || DEFAULT_PLAN_CODE,
    [searchParams]
  );

  useEffect(() => {
    saveSelectedPlanIntent(selectedPlanCode);
  }, [selectedPlanCode]);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      const nome = onlyTrim(formData.nome);
      const email = onlyTrim(formData.email).toLowerCase();
      const password = String(formData.password || '');
      saveSelectedPlanIntent(selectedPlanCode);

      if (!nome) { showMessage('signupProfessional.name_required'); return; }
      if (!email || !email.includes('@')) { showMessage('signupProfessional.email_invalid'); return; }
      if (password.length < 7) { showMessage('signupProfessional.password_too_short'); return; }

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
          data: { type: 'professional', nome, selected_plan: selectedPlanCode },
          emailRedirectTo: `${window.location.origin}/cadastro/profissional/retomada`,
        },
      });

      if (authError) {
        if (isEmailAlreadyExistsError(authError)) {
          showMessage('signupProfessional.email_already_exists');
          return;
        }
        throw authError;
      }
      if (!authData?.user?.id) throw new Error('Inexistência de usuário no retorno do Supabase.');

      if (!authData.session) {
        showMessage('signupProfessional.confirm_email_needed');
        navigate('/login');
        return;
      }

      const sessionUser = authData.user;
      const dbType = await fetchProfileTypeWithRetry(sessionUser.id);

      if (!dbType) { showMessage('signupProfessional.profile_not_created'); return; }
      if (dbType !== 'professional') { showMessage('signupProfessional.profile_wrong_type'); return; }

      const profile = await fetchUserAccessProfile(sessionUser.id);
      if (!profile) { showMessage('signupProfessional.profile_not_created'); return; }

      onLogin(sessionUser, profile.type, profile.onboardingStatus, profile.accessState, profile.professionalRole);
      navigate('/cadastro/profissional/retomada');
    } catch (err) {
      console.error('SignupProfessional error:', err);
      showMessage('alerts.action_failed_support');
      try { await supabase.auth.signOut(); } catch (signOutError) {
        console.warn('Houve um problema no cadastro, mas seu acesso continua ativo. Por favor, atualize a página.', signOutError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse animation-delay-1s" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto">
        <Link
          to="/cadastro"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-primary mb-12 transition-colors group"
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

        <div className="text-center mb-10">
          <ProfessionalIcon className="mx-auto mb-4 text-primary w-12 h-12" />
          <h1 className="text-4xl font-normal mb-3 tracking-wide">CRIAR VITRINE</h1>
          <p className="text-gray-500 text-base font-normal">CADASTRO DE <span className="text-primary">PROFISSIONAL</span></p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div className="overflow-hidden rounded-custom border border-gray-800/50 bg-dark-100/40 backdrop-blur-sm">
            <SignupFieldRow label="SEU NOME">
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className={`${fieldInputClass} uppercase`}
                placeholder="NOME COMPLETO"
                required
              />
            </SignupFieldRow>

            <SignupFieldRow label="E-MAIL">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`${fieldInputClass} uppercase`}
                required
                placeholder="SEU E-MAIL"
              />
            </SignupFieldRow>

            <SignupFieldRow label="SENHA" last>
              <div className="relative min-w-0">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`${fieldInputClass} pr-10`}
                  required
                  minLength={7}
                  placeholder="MÍNIMO 7 CARACTERES"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-600 transition-colors hover:text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </SignupFieldRow>
          </div>

          <div className="space-y-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full border border-yellow-500/70 bg-yellow-500 py-3 text-sm font-normal uppercase tracking-wider text-black transition-all hover:border-yellow-400 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? 'CRIANDO CONTA...' : 'CONTINUAR'}
            </button>

            <Link
              to="/login"
              className="flex w-full items-center justify-center rounded-full border border-yellow-500/40 bg-transparent py-3 text-sm font-normal uppercase tracking-wider text-yellow-400 transition-all hover:border-yellow-500 hover:text-yellow-300"
            >
              FAZER LOGIN
            </Link>
          </div>
        </form>

        <div className="text-center mt-12">
          <p className="text-xs text-gray-600 font-normal">
            AO CONTINUAR, VOCÊ CONCORDA COM NOSSOS{' '}
            <Link to="/termos" className="text-gray-500 hover:text-primary transition-colors">
              TERMOS DE USO
            </Link>
            {' '}E{' '}
            <Link to="/privacidade" className="text-gray-500 hover:text-primary transition-colors">
              POLÍTICA DE PRIVACIDADE
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
