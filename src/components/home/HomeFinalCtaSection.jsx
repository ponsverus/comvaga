import { Link } from 'react-router-dom';
import { ZapIcon } from '../icons';

export default function HomeFinalCtaSection() {
  return (
    <section className="py-24 px-4 bg-gradient-to-r from-primary via-yellow-500 to-yellow-600">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-5xl font-black text-black mb-6">SUA AGENDA PODE TRABALHAR MELHOR</h2>
        <p className="text-2xl text-black/80 mb-8">Uma vitrine para apresentar seu negócio, um painel para operar e uma agenda que pensa antes de confirmar.</p>
        <Link
          to="/cadastro"
          className="inline-flex items-center gap-3 px-12 py-6 bg-black text-primary rounded-button font-black text-xl hover:shadow-2xl transition-all"
        >
          TESTAR AGORA <ZapIcon className="w-6 h-6" />
        </Link>
        <p className="text-black/60 text-sm mt-6">Eficiência comprovada em barbearias, estúdios e clínicas.</p>
      </div>
    </section>
  );
}
