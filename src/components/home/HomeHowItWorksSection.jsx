import { useEffect, useRef, useState } from 'react';

function useAnimateOnView(threshold = 0.6) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setActive(true);
        observer.disconnect();
      }
    }, { threshold });

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, active];
}

export default function HomeHowItWorksSection() {
  const [problemTagRef, problemTagActive] = useAnimateOnView();
  const [solvedTagRef, solvedTagActive] = useAnimateOnView();

  return (
    <>
      <section className="pt-20 sm:pt-24 pb-6 sm:pb-8 px-4 bg-dark-100">
        <div className="max-w-4xl mx-auto text-center">
          <span
            ref={problemTagRef}
            className={`inline-block text-[10px] font-normal uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1 mb-6${problemTagActive ? ' home-tag-problem' : ''}`}
          >
            Problema
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-8 leading-tight">
            AGENDA COMUM SÓ REGISTRA.<br />
            <span className="text-primary">ELA NÃO PENSA.</span>
          </h2>
          <div className="space-y-5 text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto">
            <p>
              Agendar um horário é fácil. Difícil é manter a agenda sempre otimizada: sem ter que engessar turnos ignorando a rotina e as pausas de cada profissional, sem ter que somar atendimento por atendimento para prever a receita e o rendimento do dia, sem buracos e horários mortos espalhados entre os atendimentos, sem contas exaustivas toda vez que o cliente escolhe mais de um trabalho, sem um cancelamento virar um intervalo vago o resto do dia em vez de virar novas oportunidades de horário, e sem risco de dois clientes agendados na mesma janela.
            </p>
            <p>
              Cada um desses pequenos problemas, sozinho, parece pequeno. Juntos, ao longo do mês, custam tempo e dinheiro que ninguém percebe estar perdendo.
            </p>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="pt-6 sm:pt-8 pb-0 sm:pb-0 bg-dark-100 w-full">
        <div className="max-w-4xl mx-auto text-center mb-12 px-4">
          <span
            ref={solvedTagRef}
            className={`inline-block text-[10px] font-normal uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1 mb-6${solvedTagActive ? ' home-tag-solved' : ''}`}
          >
            RESOLVIDO
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight">
            É ASSIM QUE A COMVAGA FAZ A SUA AGENDA <br />
            <span className="text-primary">PENSAR POR VOCÊ:</span>
          </h2>
        </div>

        <div className="w-full bg-gray-800 border-y border-gray-800 grid md:grid-cols-2 lg:grid-cols-3 gap-px">
          {[
            {
              num: '01',
              title: 'ROTINA REAL',
              text: 'Cada profissional trabalha com seus próprios dias, horários e pausas. A agenda se adapta à rotina individual de cada um, permitindo fluxos de trabalho independentes.',
            },
            {
              num: '02',
              title: 'FUTURO',
              text: 'Pule a contagem manual de horários para prever seus resultados. A Comvaga calcula automaticamente o volume da sua agenda preenchida e o valor exato em receita.',
            },
            {
              num: '03',
              title: 'ZONA DE CALOR',
              text: 'Em vez de espalhar clientes aleatoriamente pelo dia, o sistema prioriza horários encostados em agendamentos já confirmados, compactando o expediente e eliminando buracos na agenda.',
            },
            {
              num: '04',
              title: 'AGENDAMENTO MÚLTIPLO SEQUENCIAL',
              text: 'Quando o cliente seleciona mais de um trabalho, o sistema soma o tempo de cada um, adiciona a margem operacional entre atendimentos e só confirma se o bloco inteiro couber no turno do profissional.',
            },
            {
              num: '05',
              title: 'REAPROVEITAMENTO INTELIGENTE',
              text: 'Cancelou? O sistema reage em milissegundos e redistribui a janela vaga na vitrine como novas oportunidades: um horário de 60 minutos pode ser reservado inteiro ou virar três de 20 ou dois de 30, sempre identificado com um ícone discreto para o cliente.',
            },
            {
              num: '06',
              title: 'CONTROLE DE CONFLITOS',
              text: 'Por trás de tudo isso está a mesma lógica de integridade usada em bancos de dados relacionais de alta performance, garantindo que dois agendamentos nunca colidam.',
            },
          ].map(({ num, title, text }) => (
            <div key={num} className="bg-dark-100 p-8 md:p-10 flex flex-col px-4 sm:px-8 md:px-10 lg:px-12">
              <div className="w-14 h-14 bg-gradient-to-br from-primary to-yellow-600 rounded-full flex items-center justify-center text-black font-normal text-xl shadow-lg shadow-primary/50 mb-6 shrink-0">
                {num}
              </div>
              <h3 className="text-2xl font-normal mb-3 text-white">{title}</h3>
              <p className="text-gray-400 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
