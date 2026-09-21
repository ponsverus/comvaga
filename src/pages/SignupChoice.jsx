import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useFeedback } from '../feedback/useFeedback';
import { UserIcon, ProfessionalIcon } from '../components/icons';

export default function SignupChoice() {
  const navigate = useNavigate();
  const { showMessage } = useFeedback();

  const go = (path) => {
    try {
      navigate(path);
    } catch {
      showMessage('signupChoice.navigate_error');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse animation-delay-1s"></div>
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
          <img
            src="/Comvaga Logo.png"
            alt="COMVAGA"
            className="h-20 w-auto object-contain"
          />
        </div>

        <div className="relative">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-normal mb-3 tracking-wide">QUEM É VOCÊ?</h1>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <button
              onClick={() => go('/cadastro/cliente')}
              className="group relative bg-dark-100/40 border border-gray-800/50 rounded-custom p-8 hover:border-blue-500/50 hover:bg-dark-100/60 transition-all overflow-hidden backdrop-blur-sm"
            >
              <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-all"></div>
              <div className="relative">
                <UserIcon className="mx-auto mb-4 text-blue-400 w-10 h-10 group-hover:scale-110 transition-transform" />
                <div className="font-normal text-lg tracking-wide mb-1">CLIENTE</div>
                <div className="text-xs text-gray-500">AGENDAR TRABALHO</div>
              </div>
            </button>

            <button
              onClick={() => go('/cadastro/profissional')}
              className="group relative bg-dark-100/40 border border-gray-800/50 rounded-custom p-8 hover:border-primary/50 hover:bg-dark-100/60 transition-all overflow-hidden backdrop-blur-sm"
            >
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-all"></div>
              <div className="relative">
                <ProfessionalIcon className="mx-auto mb-4 text-primary w-10 h-10 group-hover:scale-110 transition-transform" />
                <div className="font-normal text-lg tracking-wide mb-1">PROFISSIONAL</div>
                <div className="text-xs text-gray-500">GERENCIAR NEGÓCIO</div>
              </div>
            </button>
          </div>

          <div className="mt-5">
            <Link
              to="/login"
              className="flex w-full items-center justify-center rounded-full border border-primary/30 bg-transparent py-3 text-sm font-normal uppercase tracking-wider text-primary transition-all hover:border-primary hover:text-yellow-500"
            >
              FAZER LOGIN
            </Link>
          </div>
        </div>

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
