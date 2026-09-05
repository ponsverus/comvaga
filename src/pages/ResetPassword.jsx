import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';
import { useFeedback } from '../feedback/useFeedback';
import { clearPasswordRecoveryState } from '../utils/auth';
import { getPasswordUpdateAlertKey } from '../utils/friendlyErrors';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { showMessage } = useFeedback();
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    try {
      setLoading(true);

      if (newPassword.length < 7) {
        showMessage('login.recovery_password_too_short');
        return;
      }

      if (newPassword !== newPassword2) {
        showMessage('login.recovery_password_mismatch');
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      showMessage('login.recovery_password_updated');
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (signOutError) {
        console.warn('ResetPassword signOut warning:', signOutError);
      }
      clearPasswordRecoveryState();
      navigate('/login', { replace: true });
    } catch (error) {
      showMessage(getPasswordUpdateAlertKey(error));
      console.error('ResetPassword update error:', error);
    } finally {
      setLoading(false);
    }
  };

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
          to="/login"
          onClick={() => {
            clearPasswordRecoveryState();
            supabase.auth.signOut();
          }}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-primary mb-12 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-normal tracking-wider">VOLTAR</span>
        </Link>

        <div className="flex justify-center mb-8">
          <img src="/Comvaga Logo.png" alt="COMVAGA" className="h-20 w-auto object-contain" />
        </div>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-normal mb-3 tracking-wide">Definir nova senha</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="overflow-hidden rounded-custom border border-gray-800 bg-dark-100/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-gray-800 px-5 py-3">
              <label className="w-[86px] shrink-0 text-sm tracking-wide text-white-500">SENHA</label>
              <input
                type="password"
                placeholder="NOVA SENHA"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full bg-transparent px-0 py-2 text-sm text-white placeholder-gray-600 outline-none focus:text-white"
                required
              />
            </div>

            <div className="flex items-center gap-3 px-5 py-3">
              <label className="w-[86px] shrink-0 text-sm tracking-wide text-white-500">CONFIRM.</label>
              <input
                type="password"
                placeholder="REPETIR SENHA"
                value={newPassword2}
                onChange={(event) => setNewPassword2(event.target.value)}
                className="w-full bg-transparent px-0 py-2 text-sm text-white placeholder-gray-600 outline-none focus:text-white"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-primary to-yellow-600 text-black font-normal rounded-button hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                SALVANDO...
              </span>
            ) : (
              'SALVAR NOVA SENHA'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
