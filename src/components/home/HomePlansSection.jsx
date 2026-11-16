import { Link } from 'react-router-dom';
import { CheckIcon, ZapIcon } from '../icons';
import { getCustomPlanHref } from '../../support';
import { saveSelectedPlanIntent } from '../../utils/plans';
import { HOME_PLANS, formatHomePlanPrice } from '../../data/homePlans';

const planSignupTo = (planCode) => `/cadastro/profissional?plano=${planCode}`;

export default function HomePlansSection({ plansSectionRef }) {
  return (
    <section
      ref={plansSectionRef}
      className="py-0 bg-dark-100 w-full"
    >
      <div className="max-w-7xl mx-auto px-4 text-center mb-16 pt-24">
        <h2 className="text-5xl font-normal mb-4">
          SEM <span className="text-primary">BUROCRACIA</span>
        </h2>
        <p className="text-xl text-gray-400">Teste grátis por 30 dias o plano escolhido. Sem compromisso e sem letras miúdas ;)</p>
      </div>

      <div className="
        w-full bg-gray-800 border-y border-gray-800
        flex md:grid md:grid-cols-2 gap-px
        overflow-x-auto md:overflow-visible
        snap-x snap-mandatory md:snap-none
        [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
      ">
        <div className="shrink-0 w-[85vw] md:w-auto snap-start bg-dark-100 px-4 sm:px-8 md:px-12 lg:px-16 py-12 md:py-16">
          <span className="inline-block text-[10px] font-normal uppercase tracking-widest text-gray-400 bg-gray-800 rounded-full px-3 py-1 mb-4">
            Todos os planos incluem
          </span>
          <h3 className="text-3xl md:text-4xl font-black text-white mb-2">TODOS OS RECURSOS</h3>
          <p className="text-gray-400 mb-8">A mesma inteligência em todos os planos. Nenhum recurso fica bloqueado atrás de um plano mais caro.</p>

          <div>
            <div className="flex flex-col gap-5">
              {[
                {
                  title: 'Reabertura automática de horários cancelados na agenda',
                  text: 'Diante de um cancelamento, o sistema reestrutura a agenda na hora, devolvendo o período vago para a vitrine através do particionamento dinâmico de horários.',
                },
                {
                  title: 'Reserva em lote de múltiplos trabalhos',
                  text: 'O sistema organiza e reserva vários atendimentos em sequência dentro do mesmo período disponível.',
                },
                {
                  title: 'Direcionamento inteligente de novos agendamentos',
                  text: 'Novas reservas seguem para as zonas de calor, os horários mais próximos dos atendimentos já confirmados, compactando a agenda.',
                },
                {
                  title: 'Comprometimento da agenda e receita futura projetada',
                  text: 'Acompanhe quanto da agenda já está preenchido e quanto já está projetado de receita para o dia seguinte.',
                },
                {
                  title: 'Agendamento assistido pelo profissional',
                  text: 'Permite ao profissional registrar horários em nome do cliente quando solicitado, garantindo flexibilidade total para quem prefere suporte direto na hora de agendar.',
                },
                {
                  title: 'Reagendamento inteligente pela área exclusiva do cliente',
                  text: 'Um novo horário pode ser escolhido sem repetir as etapas da reserva.',
                },
                {
                  title: 'Alertas por e-mail em tempo real',
                  text: 'A cada novo agendamento, você é avisado na hora. E se algo for cancelado, o sistema avisa automaticamente quem precisa saber: você, se o cliente cancelar; o cliente, se você cancelar.',
                },
                {
                  title: 'Lembrete automático + WhatsApp',
                  text: 'Um lembrete automático avisa o cliente 30 minutos antes. Se quiser, você também pode enviar uma mensagem complementar pelo WhatsApp direto do seu painel.',
                },
                {
                  title: 'Sincronia com o Google Agenda',
                  text: 'Como um ganho extra, o sistema permite guardar o horário no Google Agenda com um toque, ajudando a lembrar do evento no dia a dia.',
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-2.5">
                  <CheckIcon className="w-4 h-4 text-primary shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-200 leading-snug">{item.title}</p>
                    <p className="text-sm text-gray-500 leading-snug mt-0.5">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="shrink-0 w-[85vw] md:w-auto snap-start bg-dark-200 flex flex-col divide-y divide-gray-800">
          <div className="px-4 sm:px-8 md:px-12 lg:px-16 pt-12 md:pt-16 pb-6">
            <span className="inline-block text-[10px] font-normal uppercase tracking-widest text-primary bg-primary/15 rounded-full px-3 py-1 mb-4">
              Escolha a capacidade
            </span>
            <h3 className="text-3xl md:text-4xl font-black text-white mb-2">QUANTOS PROFISSIONAIS?</h3>
            <p className="text-gray-400">Estrutura flexível para qualquer volume de trabalho. Encontre o limite perfeito para a sua equipe e garanta a capacidade operacional que seu negócio precisa.</p>
          </div>

          {HOME_PLANS.map((plan) => (
            <div
              key={plan.code}
              className={[
                'px-4 sm:px-8 md:px-12 lg:px-16 py-8 flex flex-col gap-6 transition-all',
                plan.code === 'profissional'
                  ? 'bg-primary/10 border-l-4 border-l-primary shadow-lg shadow-primary/10'
                  : '',
              ].join(' ')}
            >
              <div className="flex items-center justify-between w-full">
                <span className="inline-block rounded-full bg-white/10 border border-white/10 px-3 py-1 text-[10px] font-normal uppercase tracking-widest text-gray-300">
                  {plan.name}
                </span>

                {plan.badge && (
                  <span className="inline-flex items-center rounded-full bg-green-500/20 border border-green-500/30 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-green-400">
                    {plan.badge}
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 w-full">
                <div>
                  <p className="text-lg md:text-xl font-normal uppercase text-primary mb-2">
                    {plan.capacity}
                  </p>
                  <div className="flex items-end gap-x-3 gap-y-1 flex-wrap">
                    {plan.oldPriceCents !== null && (
                      <span className="text-base font-normal text-red-500 line-through decoration-red-500 decoration-2">
                        {formatHomePlanPrice(plan.oldPriceCents)}
                      </span>
                    )}
                    <span
                      className={`text-xl font-normal ${
                        plan.code === 'profissional' ? 'text-green-400' : 'text-white'
                      }`}
                    >
                      {formatHomePlanPrice(plan.priceCents)}
                      <span className="text-sm font-normal text-gray-500">/mês</span>
                    </span>
                  </div>
                </div>

                <Link
                  to={planSignupTo(plan.code)}
                  onClick={() => saveSelectedPlanIntent(plan.code)}
                  className={[
                    'shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-normal uppercase tracking-wider rounded-full transition-all',
                    plan.code === 'premium'
                      ? 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-100 hover:shadow-lg hover:shadow-zinc-700/30'
                      : 'bg-gradient-to-r from-primary to-yellow-600 text-black hover:shadow-lg hover:shadow-primary/30',
                  ].join(' ')}
                >
                  Testar o {plan.name} <ZapIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}

          <div className="flex-1 flex flex-col items-start justify-center text-left gap-3 px-4 sm:px-8 md:px-12 lg:px-16 py-10 bg-primary/5">
            <span className="inline-block rounded-full bg-primary/20 border border-primary/30 px-3 py-1 text-[10px] font-normal uppercase tracking-widest text-primary">
              PERSONALIZADO
            </span>
            <p className="text-xl md:text-2xl font-normal text-white">
              Precisa de um plano personalizado?
            </p>
            <p className="text-sm text-gray-400 max-w-sm">
              Precisa de mais limite, recursos específicos ou um formato diferente de atendimento? Fale com nossa equipe e crie um plano pensado exclusivamente para você.
            </p>
            <a
              href={getCustomPlanHref()}
              target="_blank"
              rel="noreferrer"
              className="mt-2 w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-yellow-600 text-black text-xs font-normal uppercase tracking-wider rounded-full hover:shadow-lg hover:shadow-primary/30 transition-all"
            >
              Falar com suporte <ZapIcon className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
