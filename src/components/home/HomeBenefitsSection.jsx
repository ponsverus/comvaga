import { CheckDoubleIcon } from '../icons';

function MoneyGlyph({ className = '', sizeClass = 'h-8 w-8 text-[32px]' }) {
  return (
    <span
      className={`inline-flex items-center justify-center font-normal leading-none text-primary ${sizeClass} ${className} font-condensed`}
    >
      $
    </span>
  );
}

function SmileGlyph({ className = '', sizeClass = 'h-8 w-8 text-[32px]' }) {
  return (
    <span
      className={`inline-flex items-center justify-center font-normal leading-none text-primary ${sizeClass} ${className} font-condensed`}
    >
      :)
    </span>
  );
}

export default function HomeBenefitsSection() {
  return (
    <section className="py-0 bg-dark-200 w-full">
      <div className="max-w-7xl mx-auto px-4 text-center mb-16 pt-24">
        <h2 className="text-5xl font-black mb-4">
          O QUE VOCÊ <span className="text-primary">GANHA</span>
        </h2>
        <p className="text-xl text-gray-400">Menos atrito na sua rotina, mais praticidade na vida do seu cliente.</p>
      </div>

      <div className="w-full bg-gray-800 border-y border-gray-800 grid sm:grid-cols-2 lg:grid-cols-3 gap-px">
        {[
          { icon: MoneyGlyph, title: 'LUCRO BLINDADO', text: 'Menos buracos e horários mortos na agenda significam mais faturamento no fim do mês.' },
          { icon: SmileGlyph, title: 'CLIENTE SATISFEITO', text: 'Quem agenda tem a certeza de ser atendido no horário marcado, sem atrasos por erro de cálculo.' },
          { icon: CheckDoubleIcon, title: 'FLUXO COMPLETO', text: 'Da descoberta ao pós-atendimento, profissional e cliente continuam dentro do mesmo sistema.' },
        ].map(({ icon: Icon, title, text }, i) => (
          <div
            key={i}
            className="bg-dark-200 p-8 sm:p-10 hover:bg-dark-100 transition-colors flex flex-col px-4 sm:px-8 md:px-16 lg:px-24"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Icon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-normal mb-3 text-white">{title}</h3>
            <p className="text-gray-400 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
