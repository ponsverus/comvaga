import { ZapIcon } from '../icons';

export default function HomeVitrineShowcaseSection() {
  return (
    <section className="py-0 bg-black overflow-hidden border-b border-gray-800">
      <div className="w-full bg-dark-200 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse" />

        <div className="bg-gray-800 w-full">
          <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-16 text-center sm:px-8 sm:py-20 md:px-16 lg:px-24">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest">AO VIVO</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
              VEJA COMO FICA A VITRINE DO SEU <br/>
              <span className="text-primary">NEGÓCIO.</span>
            </h2>

            <p className="text-lg text-gray-400 mb-10 leading-relaxed max-w-3xl">
              Seu negócio merece mais do que um link de WhatsApp. Veja como seus clientes podem encontrar seus trabalhos, depoimentos, equipe e horários e chegar ao agendamento em uma experiência só.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://comvaga.com.br/v/vikings"
                target="_blank"
                rel="noreferrer"
                className="px-8 py-4 bg-primary text-black font-black rounded-button hover:shadow-[0_0_30px_rgba(255,209,26,0.3)] transition-all flex items-center justify-center gap-3 group"
              >
                VER VITRINE
                <ZapIcon className="w-5 h-5 group-hover:animate-bounce" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
