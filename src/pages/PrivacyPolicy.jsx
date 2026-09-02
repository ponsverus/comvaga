import { Link } from 'react-router-dom';
import AppFooter from '../components/AppFooter';

const sections = [
  {
    title: '1. Quem somos e escopo desta política',
    body: [
      'A Comvaga é uma plataforma de agenda, vitrine, gestão de serviços e relacionamento entre negócios, profissionais parceiros e clientes.',
      'Esta Política explica como tratamos dados pessoais quando você acessa o site, cria uma conta, agenda serviços, gerencia um negócio, atua como profissional parceiro, realiza pagamentos ou entra em contato com a Comvaga.',
      'A Comvaga pode atuar como controladora dos dados usados para operar a plataforma e, em algumas situações, como operadora de dados tratados por negócios e profissionais que usam a plataforma para atender seus clientes.',
    ],
  },
  {
    title: '2. Dados que podemos coletar',
    body: [
      'Dados de cadastro: nome, e-mail, senha criptografada, telefone, tipo de conta, identificadores internos e preferências da conta.',
      'Dados de negócio e profissional: nome do negócio, slug, endereço, telefone, logo, fotos, galeria, serviços, preços, horários, profissionais vinculados, status de parceria e informações de plano.',
      'Dados de cliente e agendamento: nome, e-mail, telefone, negócio escolhido, profissional, serviço, data, horário, status do agendamento, cancelamentos, histórico e valores relacionados.',
      'Conteúdos enviados pelo usuário: fotos, textos, descrições, depoimentos, nomes de serviços, informações de vitrine e demais materiais publicados ou armazenados na plataforma.',
      'Dados técnicos e de segurança: endereço IP, identificadores de sessão, registros de acesso, eventos de erro, tentativas de uso, limites de requisição, informações do navegador e dispositivo.',
      'Dados de pagamento e assinatura: plano escolhido, status da assinatura, eventos de cobrança, identificadores de checkout, cliente ou assinatura no provedor de pagamento. A Comvaga não armazena dados completos de cartão.',
    ],
  },
  {
    title: '3. Para que usamos os dados',
    body: [
      'Criar e proteger contas de clientes, profissionais e negócios.',
      'Permitir agendamentos, cancelamentos, lembretes, notificações transacionais e histórico operacional.',
      'Publicar vitrines, logos, galerias, serviços, preços, horários e depoimentos conforme configurado pelos usuários responsáveis.',
      'Gerenciar vínculos entre negócios e profissionais parceiros, incluindo solicitações pendentes, aprovações, inativações e exclusões.',
      'Processar planos, assinaturas, checkouts, cancelamentos, testes grátis, limites de plano e eventos de pagamento.',
      'Prevenir fraude, abuso, spam, uso automatizado indevido, tentativas excessivas e acessos não autorizados.',
      'Melhorar a plataforma, corrigir erros, medir desempenho, desenvolver recursos e prestar suporte.',
      'Cumprir obrigações legais, regulatórias, fiscais, consumeristas e exercer direitos em processos administrativos, judiciais ou arbitrais.',
    ],
  },
  {
    title: '4. Bases legais',
    body: [
      'Tratamos dados conforme as bases previstas na LGPD, incluindo execução de contrato, procedimentos preliminares relacionados a contrato, cumprimento de obrigação legal ou regulatória, exercício regular de direitos, proteção contra fraude, legítimo interesse e consentimento quando exigido.',
      'Quando a base for legítimo interesse, avaliamos a finalidade, a necessidade do tratamento e os direitos dos titulares. Quando a base for consentimento, o titular poderá revogá-lo pelos canais indicados nesta política.',
    ],
  },
  {
    title: '5. Compartilhamento com terceiros',
    body: [
      'Podemos compartilhar dados com fornecedores necessários para operar a plataforma, como hospedagem, banco de dados, autenticação, armazenamento, e-mail transacional, notificações, meios de pagamento, suporte, segurança e ferramentas de análise.',
      'Atualmente, a plataforma usa serviços como Supabase para infraestrutura, OneSignal para notificações/e-mails transacionais e Asaas para pagamentos e assinaturas.',
      'Também podemos compartilhar dados com negócios e profissionais envolvidos no atendimento solicitado pelo cliente, por exemplo dados necessários para confirmar, executar, cancelar ou remarcar um agendamento.',
      'Não vendemos listas de clientes. Se forem ativadas ferramentas de analytics, pixels de publicidade, mensuração, remarketing ou plataformas como Google e Meta, isso será tratado de forma transparente nesta política e, quando exigido, por mecanismos de consentimento ou configuração de cookies.',
      'Dados poderão ser compartilhados com autoridades públicas, reguladores, tribunais ou terceiros quando necessário para cumprir lei, ordem válida, prevenir fraude, proteger direitos ou responder a reclamações.',
    ],
  },
  {
    title: '6. Cookies, analytics e publicidade',
    body: [
      'Podemos usar cookies e tecnologias semelhantes para manter a sessão ativa, lembrar preferências, proteger a conta, medir desempenho e entender o uso da plataforma.',
      'Cookies essenciais podem ser necessários para login, segurança e funcionamento do serviço.',
      'Cookies analíticos, pixels de publicidade, tags de conversão e remarketing poderão ser usados para medir campanhas, melhorar o produto e divulgar a Comvaga. Quando esses recursos forem ativados, informaremos sua finalidade e adotaremos os controles exigidos pela legislação aplicável.',
      'As configurações do navegador podem permitir bloqueio ou remoção de cookies, mas isso pode afetar recursos essenciais da plataforma.',
    ],
  },
  {
    title: '7. E-mails e comunicações',
    body: [
      'Hoje enviamos principalmente comunicações transacionais, como criação de conta, confirmação de agendamento, novo agendamento, cancelamento, lembrete, recuperação de senha, suporte, segurança e avisos relacionados ao uso do serviço.',
      'E-mails transacionais são necessários para funcionamento da plataforma e não são tratados como e-mail marketing.',
      'Se futuramente enviarmos comunicações promocionais, campanhas ou novidades comerciais, adotaremos identificação clara do remetente, assunto honesto e mecanismo simples de descadastro quando aplicável.',
    ],
  },
  {
    title: '8. Conteúdo público e dados visíveis',
    body: [
      'Algumas informações podem ser exibidas publicamente na vitrine do negócio, como nome do negócio, logo, fotos, serviços, preços, horários, profissionais, depoimentos e dados de contato configurados pelo responsável.',
      'O usuário responsável deve garantir que possui autorização para publicar fotos, marcas, textos, nomes, imagens de pessoas e demais conteúdos enviados para a plataforma.',
    ],
  },
  {
    title: '9. Retenção e exclusão',
    body: [
      'Mantemos dados pelo tempo necessário para operar a conta, prestar o serviço, cumprir obrigações legais, resolver disputas, prevenir fraude, preservar histórico operacional e exercer direitos.',
      'Solicitações de parceria pendentes podem ser removidas sem preservação histórica quando recusadas ou excluídas antes da aprovação.',
      'Registros ligados a agendamentos, pagamentos, histórico de negócio, segurança e auditoria podem ser mantidos mesmo após exclusão ou inativação de determinados itens, quando necessário para finalidade legítima, obrigação legal ou exercício de direitos.',
    ],
  },
  {
    title: '10. Segurança',
    body: [
      'Adotamos medidas técnicas e administrativas para proteger dados pessoais, incluindo autenticação, controle de acesso, políticas de permissão, registros de segurança, limitação de tentativas e segregação de dados conforme o papel do usuário.',
      'Nenhum sistema é totalmente imune a riscos. Se identificarmos incidente relevante que possa afetar titulares, adotaremos as medidas cabíveis conforme a legislação aplicável.',
    ],
  },
  {
    title: '11. Direitos dos titulares',
    body: [
      'Nos termos da LGPD, o titular pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informações sobre compartilhamento, revisão de decisões automatizadas quando aplicável e revogação do consentimento.',
      'Algumas solicitações podem depender de verificação de identidade e podem ser limitadas por obrigações legais, segurança, prevenção a fraude, preservação de contratos ou exercício regular de direitos.',
    ],
  },
  {
    title: '12. Contato',
    body: [
      'Para exercer direitos, tirar dúvidas ou solicitar informações sobre privacidade, use o link de suporte disponível no rodapé desta página.',
      'Antes da publicação definitiva, os dados jurídicos do controlador, como razão social, CNPJ, endereço e e-mail do encarregado ou canal de privacidade, devem ser preenchidos conforme a estrutura formal da empresa. Para falar com a Comvaga sobre privacidade, acesse o link de suporte disponível no rodapé.',
    ],
  },
];

export default function PrivacyPolicyPage() {
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
