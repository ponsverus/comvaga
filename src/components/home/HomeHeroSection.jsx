import { Link } from 'react-router-dom';
import { ZapIcon } from '../icons';

export default function HomeHeroSection() {
  return (
    <section className="relative pt-32 pb-12 sm:pt-40 sm:pb-16 lg:pt-48 lg:pb-20 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-yellow-600/10"></div>
      <div className="absolute top-20 right-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>

      <div className="relative z-10 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 border border-primary/30 rounded-button mb-8 backdrop-blur-sm">
          <ZapIcon className="w-4 h-4 text-primary" />
          <span className="text-primary font-bold text-sm">O FIM DA AGENDA COMUM</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-6 leading-tight drop-shadow-lg">
          SUA AGENDA,<br />
          <span className="bg-gradient-to-r from-primary to-yellow-600 bg-clip-text text-transparent">
            MATEMATICAMENTE PERFEITA
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-3xl mx-auto drop-shadow-md">
          A Comvaga organiza agenda, vitrine, equipe e clientes em uma experiência só. O sistema <span className="text-primary">ANTECIPA CONFLITOS</span>, respeita o tempo real de cada trabalho e transforma horários livres em oportunidades reais de atendimento.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-0">
          <Link
            to="/cadastro"
            className="px-10 py-5 bg-gradient-to-r from-primary to-yellow-600 text-black rounded-button font-black text-lg hover:shadow-2xl hover:shadow-primary/50 transition-all hover:scale-105 flex items-center justify-center gap-3"
          >
            TESTAR GRÁTIS POR 30 DIAS <ZapIcon className="w-5 h-5" />
          </Link>
          <button
            type="button"
            onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-10 py-5 bg-white/10 border border-white/20 text-white rounded-button font-bold text-lg hover:bg-white/20 backdrop-blur-sm"
          >
            VER COMO FUNCIONA
          </button>
        </div>
      </div>
    </section>
  );
}
