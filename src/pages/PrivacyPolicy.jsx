import { Link } from 'react-router-dom';
import AppFooter from '../components/AppFooter';
import { useStaticSeo } from '../hooks/useStaticSeo.js';

const sections = [
  {
    title: '1. Quem somos e escopo desta política',
    body: [
      'A Comvaga é uma plataforma de agendamento, vitrine, gerenciamento de trabalhos e relacionamento entre negócios, profissionais parceiros e clientes.',
      'Esta Política explica como tratamos dados pessoais quando você acessa o site, cria uma conta, agenda trabalhos, gerencia um negócio, atua como profissional parceiro, realiza pagamentos ou entra em contato com a Comvaga.',
      'A Comvaga pode atuar como controladora dos dados usados para operar a plataforma e, em algumas hipóteses, como operadora de dados tratados por negócios e profissionais que usam a plataforma para atender seus clientes.',
    ],
  },
  {
    title: '2. Dados que podemos coletar',
    body: [
      'Dados de cadastro: nome, e-mail, senha criptografada, telefone, tipo de conta, identificadores internos e preferências da conta.',
      'Dados de negócio e profissional: nome do negócio, slug, ponto, telefone, logo, fotos, galeria, trabalhos, valores, horários, profissionais vinculados, status de parceria e dados do plano.',
      'Dados de cliente e agendamento: nome, e-mail, telefone, negócio escolhido, profissional, trabalho, data, horário, status do agendamento, cancelamentos, histórico e valores relacionados.',
      'Conteúdos enviados pelo usuário: fotos, textos, depoimentos, nomes de trabalhos, dados de vitrine e demais materiais publicados ou armazenados na plataforma.',
      'Dados técnicos e de blindagem: IP, identificadores de acesso, registros de acesso, eventos de erro, tentativas de uso, limites de chamadas, dados do navegador e dispositivo.',
      'Dados de pagamento e assinatura: plano escolhido, status da assinatura, eventos de faturamento, identificadores de checkout, cliente ou assinatura no provedor de pagamento. A Comvaga nunca guarda dados completos de pagamento.',
    ],
  },
  {
    title: '3. Para que usamos os dados',
    body: [
      'Criar e proteger contas de clientes, profissionais e negócios.',
      'Permitir agendamentos, cancelamentos, lembretes, e-mails transacionais e histórico operacional.',
      'Publicar vitrines, logos, galerias, trabalhos, valores, horários e depoimentos conforme configurado pelos usuários responsáveis.',
      'Gerenciar vínculos entre negócios e profissionais parceiros, incluindo pedidos pendentes, aceites, pausas e desligamentos.',
      'Processar planos, assinaturas, checkouts, cancelamentos, testes grátis, limites de plano e eventos de pagamento.',
      'Prevenir fraude, abuso, spam, uso automatizado indevido, tentativas excessivas e acessos ilegítimos.',
      'Melhorar a plataforma, corrigir erros, medir desempenho, desenvolver recursos e prestar suporte.',
      'Cumprir regras legais, regulatórias, fiscais, consumeristas e exercer direitos em processos administrativos, judiciais ou arbitrais.',
    ],
  },
  {
    title: '4. Bases legais',
    body: [
      'Tratamos dados conforme as bases previstas na LGPD, incluindo o cumprimento de contrato, procedimentos preliminares relacionados a contrato, cumprimento de regra legal ou regulatória, exercício regular de direitos, blindagem contra fraude, legítimo interesse e consentimento quando exigido.',
      'Quando a base for legítimo interesse, avaliamos a finalidade, a necessidade do tratamento e os direitos dos titulares. Quando a base for consentimento, o titular poderá revogá-lo pelos canais indicados nesta política.',
    ],
  },
  {
    title: '5. Compartilhamento com terceiros',
    body: [
      'Podemos compartilhar dados com fornecedores necessários para operar a plataforma, como hospedagem, banco de dados, login, armazenamento, e-mail transacional, meios de pagamento, suporte e ferramentas de análise.',
      'Atualmente, a plataforma usa sistemas como Supabase para infraestrutura, OneSignal para e-mails transacionais e Asaas para pagamentos e assinaturas.',
      'Também podemos compartilhar dados com negócios e profissionais envolvidos no atendimento solicitado pelo cliente, por exemplo dados necessários para confirmar, executar, cancelar ou remarcar um agendamento.',
      'Nunca vendemos listas de clientes. Se forem ativadas ferramentas de analytics, pixels de publicidade, métricas, remarketing ou plataformas como Google e Meta, isso será tratado de forma transparente nesta política e, quando exigido, por mecanismos de consentimento ou controle de cookies.',
      'Dados podem ser compartilhados com autoridades públicas, reguladores, tribunais ou terceiros quando necessário para cumprir lei, ordem válida, prevenir fraude, proteger direitos ou responder a demandas.',
    ],
  },
  {
    title: '6. Cookies, analytics e publicidade',
    body: [
      'Podemos usar cookies e tecnologias semelhantes para manter o login ativo, lembrar preferências, proteger a conta, medir desempenho e entender o uso da plataforma.',
      'Cookies essenciais podem ser necessários para login, blindagem e funcionamento da ferramenta.',
      'Cookies analíticos, pixels de publicidade, tags de metas e remarketing podem ser usados para medir campanhas, melhorar o produto e divulgar a Comvaga. Quando esses recursos forem ativados, informaremos sua finalidade e adotaremos os controles exigidos pela lei aplicável.',
      'Os ajustes do navegador podem permitir bloqueio ou limpeza de cookies, mas isso pode afetar recursos essenciais da plataforma.',
    ],
  },
  {
    title: '7. E-mails e lembretes',
    body: [
      'Hoje enviamos e-mails e lembretes operacionais, como abertura de conta, novo agendamento, cancelamento, lembrete, troca de senha, suporte e avisos do sistema.',
      'E-mails e lembretes servem para o uso da plataforma e ficam fora do escopo de e-mail marketing.',
      'Se futuramente enviarmos e-mails de ofertas ou novidades, adotaremos identificador claro do remetente, assunto direto e meio simples de saída.',
    ],
  },
  {
    title: '8. Conteúdo público e dados visíveis',
    body: [
      'Alguns dados podem ser exibidos publicamente na vitrine do negócio, como nome do negócio, logo, fotos, trabalhos, valores, horários, profissionais, depoimentos e dados de contato configurados pelo responsável.',
      'O usuário responsável deve garantir que possui aval para publicar fotos, marcas, textos, nomes, imagens de pessoas e demais conteúdos enviados para a plataforma.',
    ],
  },
  {
    title: '9. Guarda e desligamento',
    body: [
      'Mantemos dados pelo tempo necessário para operar a conta, prestar o trabalho, cumprir deveres legais, resolver disputas, prevenir fraude, preservar histórico operacional e exercer direitos.',
      'Pedidos de parceria pendentes podem ser removidos sem guarda histórica quando recusados ou excluídos antes do aceite.',
      'Registros ligados a agendamentos, pagamentos, histórico do negócio, blindagem e auditoria podem ser mantidos mesmo após desligamento ou pausa de determinados itens, quando necessário para finalidade legítima, dever legal ou exercício de direitos.',
    ],
  },
  {
    title: '10. Blindagem',
    body: [
      'Adotamos medidas técnicas e administrativas para proteger dados pessoais, incluindo login, controle de acesso, regras de aval, registros de blindagem, limite de tentativas e filtro de dados conforme o papel do usuário.',
      'Nenhum sistema é totalmente imune a riscos. Se identificarmos incidente relevante que possa afetar titulares, adotaremos as medidas cabíveis conforme a lei aplicável.',
    ],
  },
  {
    title: '11. Direitos dos titulares',
    body: [
      'Nos termos da LGPD, o titular pode pedir prova de tratamento, acesso, ajuste, sigilo, bloqueio, retirada, portabilidade, detalhes sobre compartilhamento, reanálise de atos automatizados quando aplicável e retirada do consentimento.',
      'Alguns pedidos podem depender de prova de identidade e podem ser limitados por deveres legais, defesa, combate a fraude, guarda de contratos ou exercício regular de direitos.',
    ],
  },
  {
    title: '12. Contato',
    body: [
      'Para exercer direitos, tirar dúvidas ou pedir detalhes sobre o tratamento de seus dados pessoais, você pode entrar em contato com o nosso Encarregado pelo Tratamento de Dados Pessoais através do canal de suporte disponível no rodapé desta página.',
    ],
  },
];

export default function PrivacyPolicyPage() {
  useStaticSeo('/privacidade');
  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
        <Link to="/" className="mb-8 inline-block">
          <img src="/Comvaga Logo.png" alt="Comvaga" className="h-14 w-auto object-contain" />
        </Link>

        <div className="mb-10">
          <p className="mb-3 text-xs uppercase text-primary">Legal</p>
          <h1 className="text-4xl font-normal uppercase">Política de Privacidade</h1>
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

        <p className="mt-10 text-sm leading-relaxed text-gray-500">
          Política atualizada em: 18 de julho de 2026.
        </p>

      </main>
      <AppFooter />
    </div>
  );
}
