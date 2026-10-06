import { Link } from 'react-router-dom';
import AppFooter from '../components/AppFooter';
import { useStaticSeo } from '../hooks/useStaticSeo.js';

const sections = [
  {
    title: 'O que é a Comvaga',
    body: [
      'A Comvaga é uma plataforma para negócios de atendimento por horário que precisam vender serviços, organizar a agenda e apresentar uma vitrine profissional sem depender de conversas manuais para cada marcação.',
      'A proposta é unir vitrine, agendamento, gestão de profissionais, serviços, horários, notificações e relacionamento com clientes em um fluxo só. O cliente escolhe o serviço, o profissional e o horário disponível; o negócio acompanha tudo pelo painel.',
    ],
  },
  {
    title: 'Para quem ela foi criada',
    body: [
      'A plataforma atende negócios como barbearias, estúdios, clínicas, salões e outros serviços que trabalham com agenda, profissionais, horários, pausas, cancelamentos e recorrência de clientes.',
      'Também considera o profissional parceiro, que pode solicitar vínculo com um negócio, aparecer na vitrine quando aprovado e participar do fluxo de atendimento conforme as regras do negócio.',
    ],
  },
  {
    title: 'Como funciona na prática',
    body: [
      'O responsável pelo negócio cadastra a vitrine, serviços, preços, fotos, profissionais, horários e regras operacionais. A vitrine pública mostra as informações necessárias para o cliente decidir e agendar.',
      'O painel administrativo concentra a operação: agenda, profissionais, clientes, histórico, entregas, plano, informações do negócio e dados de conta. A ideia é reduzir trabalho repetitivo e dar mais clareza sobre a rotina do negócio.',
    ],
  },
  {
    title: 'O papel da Comvaga',
    body: [
      'A Comvaga fornece tecnologia para aproximar clientes, negócios e profissionais, mas não executa os serviços anunciados na vitrine. A prestação do serviço, qualidade do atendimento, preços, disponibilidade e regras comerciais são responsabilidade do negócio ou profissional responsável.',
      'Nossa responsabilidade é manter uma plataforma organizada, segura e clara para que cada parte consiga usar o sistema com previsibilidade: o cliente agenda, o profissional acompanha sua participação e o negócio gerencia sua operação.',
    ],
  },
];

export default function About() {
  useStaticSeo('/sobre');
  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
        <Link to="/" className="mb-8 inline-block">
          <img src="/Comvaga Logo.png" alt="Comvaga" className="h-14 w-auto object-contain" />
        </Link>

        <div className="mb-10">
          <p className="mb-3 text-xs uppercase text-primary">Empresa</p>
          <h1 className="text-4xl font-normal uppercase">Sobre a Comvaga</h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-gray-400">
            A Comvaga nasceu para transformar negócios de atendimento em operações mais organizadas, com uma vitrine clara para vender e uma agenda preparada para evitar conflito de horários, excesso de mensagens e perda de oportunidades.
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 text-xl font-normal uppercase text-white">{section.title}</h2>
              <div className="space-y-3 text-sm leading-relaxed text-gray-400">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/cadastro"
            className="inline-flex items-center justify-center rounded-button bg-primary px-6 py-3 text-sm font-normal uppercase text-black transition-colors hover:bg-primary/90"
          >
            Começar agora
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-button border border-white/15 px-6 py-3 text-sm font-normal uppercase text-white transition-colors hover:border-primary hover:text-primary"
          >
            Voltar para home
          </Link>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
