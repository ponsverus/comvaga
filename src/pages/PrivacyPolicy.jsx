```jsx
import { Link } from 'react-router-dom';
import AppFooter from '../components/AppFooter';

const sections = [
  {
    title: '1. Quem somos e escopo desta politica',
    body: [
      'A Comvaga e uma plataforma de agenda, vitrine, controle de trabalhos e relacionamento entre negocios, profissionais parceiros e clientes.',
      'Esta Politica explica como tratamos dados pessoais quando voce acessa o site, faz um cadastro, agenda trabalhos, gerencia um negocio, atua como profissional parceiro, realiza pagamentos ou entra em contato com a Comvaga.',
      'A Comvaga pode atuar como controladora dos dados usados para operar a plataforma e, em alguns casos, como operadora de dados tratados por negocios e profissionais que usam a plataforma para atender seus clientes.',
    ],
  },
  {
    title: '2. Dados que podemos coletar',
    body: [
      'Dados de cadastro: nome, e-mail, senha criptografada, telefone, tipo de conta, identificadores internos e preferencias da conta.',
      'Dados de negocio e profissional: nome do negocio, slug, endereco, telefone, logo, fotos, galeria, trabalhos, valores, horarios, profissionais vinculados, status de parceria e dados de plano.',
      'Dados de cliente e agendamento: nome, e-mail, telefone, negocio escolhido, profissional, trabalho, data, horario, status do agendamento, cancelamentos, historico e valores relacionados.',
      'Conteudos enviados pelo usuario: fotos, textos, textos descritivos, depoimentos, nomes de trabalhos, dados de vitrine e demais materiais publicados ou armazenados na plataforma.',
      'Dados tecnicos e de seguranca: endereco IP, identificadores de acesso, registros de acesso, eventos de erro, tentativas de uso, limites de pedido, dados do navegador e dispositivo.',
      'Dados de pagamento e assinatura: plano escolhido, status da assinatura, eventos de cobranca, identificadores de checkout, cliente ou assinatura no provedor de pagamento. A Comvaga jamais armazena dados completos do meio de pagamento.',
    ],
  },
  {
    title: '3. Para que usamos os dados',
    body: [
      'Criar e proteger contas de clientes, profissionais e negocios.',
      'Permitir agendamentos, cancelamentos, lembretes, avisos transacionais e historico operacional.',
      'Publicar vitrines, logos, galerias, trabalhos, valores, horarios e depoimentos conforme definido pelos usuarios responsaveis.',
      'Gerenciar vinculos entre negocios e profissionais parceiros, incluindo pedidos pendentes, aceites, desativacoes e retiradas.',
      'Processar planos, assinaturas, checkouts, cancelamentos, testes gratis, limites de plano e eventos de pagamento.',
      'Prevenir fraude, abuso, spam, uso automatizado indevido, tentativas excessivas e acessos sem permissao.',
      'Melhorar a plataforma, ajustar erros, medir desempenho, desenvolver recursos e prestar suporte.',
      'Cumprir deveres legais, regras reguladoras, fiscais, consumeristas e exercer direitos em processos administrativos, judiciais ou arbitrais.',
    ],
  },
  {
    title: '4. Bases legais',
    body: [
      'Tratamos dados conforme as bases previstas na LGPD, incluindo cumprimento de contrato, procedimentos preliminares relacionados a contrato, cumprimento de dever legal ou regulatorio, exercicio regular de direitos, seguranca contra fraude, legitimo interesse e consentimento quando exigido.',
      'Quando a base for legitimo interesse, avaliamos a finalidade, a necessidade do tratamento e os direitos dos titulares. Quando a base for consentimento, o titular podera cancela-lo pelos canais indicados nesta politica.',
    ],
  },
  {
    title: '5. Partilha com terceiros',
    body: [
      'Podemos compartilhar dados com fornecedores necessarios para operar a plataforma, como hospedagem, banco de dados, login, armazenamento, e-mail transacional, avisos, meios de pagamento, suporte, seguranca e ferramentas de analise.',
      'Atualmente, a plataforma usa ferramentas como Supabase para infraestrutura, OneSignal para avisos/e-mails transacionais e Asaas para pagamentos e assinaturas.',
      'Tambem podemos compartilhar dados com negocios e profissionais envolvidos no atendimento solicitado pelo cliente, por exemplo dados necessarios para confirmar, executar, cancelar ou remarcar um agendamento.',
      'A Comvaga jamais vende listas de clientes. Se forem ativadas ferramentas de analytics, pixels de publicidade, medicao, remarketing ou plataformas como Google e Meta, isso sera tratado de forma transparente nesta politica e, quando exigido, por mecanismos de consentimento ou ajuste de cookies.',
      'Dados podem ser compartilhados com autoridades publicas, reguladores, tribunais ou terceiros quando necessario para cumprir lei, ordem valida, prevenir fraude, proteger direitos ou responder a queixas.',
    ],
  },
  {
    title: '6. Cookies, analytics e publicidade',
    body: [
      'Podemos usar cookies e tecnologias semelhantes para manter o acesso ativo, lembrar preferencias, proteger a conta, medir desempenho e entender o uso da plataforma.',
      'Cookies essenciais podem ser necessarios para login, seguranca e funcionamento da plataforma.',
      'Cookies analiticos, pixels de publicidade, tags de conversao e remarketing podem ser usados para medir campanhas, melhorar o produto e divulgar a Comvaga. Quando esses recursos forem ativados, informaremos sua finalidade e adotaremos os controles exigidos pela lei aplicavel.',
      'Os ajustes do navegador podem permitir bloqueio ou retirada de cookies, mas isso pode afetar recursos essenciais da plataforma.',
    ],
  },
  {
    title: '7. E-mails e avisos',
    body: [
      'Hoje enviamos principalmente avisos transacionais, como cadastro de conta, validacao de agendamento, novo agendamento, cancelamento, lembrete, redefinicao de senha, suporte, seguranca e avisos relacionados ao uso do trabalho.',
      'E-mails transacionais sao necessarios para o funcionamento da plataforma e ficam fora da categoria de e-mail marketing.',
      'Se futuramente enviarmos avisos promocionais, campanhas ou novidades comerciais, adotaremos identificacao clara do remetente, assunto honesto e mecanismo simples de descadastro quando aplicavel.',
    ],
  },
  {
    title: '8. Conteudo publico e dados visiveis',
    body: [
      'Alguns dados podem ser exibidos publicamente na vitrine do negocio, como nome do negocio, logo, fotos, trabalhos, valores, horarios, profissionais, depoimentos e dados de contato configurados pelo responsavel.',
      'O usuario responsavel deve garantir que possui permissao para publicar fotos, marcas, textos, nomes, imagens de pessoas e demais conteudos enviados para a plataforma.',
    ],
  },
  {
    title: '9. Guarda e retirada',
    body: [
      'Mantemos dados pelo tempo necessario para operar a conta, prestar o trabalho, cumprir deveres legais, resolver disputas, prevenir fraude, manter historico operacional e exercer direitos.',
      'Pedidos de parceria pendentes podem ser retirados sem manter historico quando recusados ou retirados antes do aceite.',
      'Registros ligados a agendamentos, pagamentos, historico de negocio, seguranca e auditoria podem ser mantidos mesmo apos retirada ou desativacao de determinados itens, quando necessario para finalidade legitima, dever legal ou exercicio de direitos.',
    ],
  },
  {
    title: '10. Seguranca',
    body: [
      'Adotamos medidas tecnicas e administrativas para proteger dados pessoais, incluindo login, controle de acesso, politicas de acesso, registros de seguranca, limite de tentativas e separacao de dados conforme o papel do usuario.',
      'Nenhum sistema e totalmente imune a riscos. Se identificarmos incidente relevante que possa afetar titulares, adotaremos as medidas cabiveis conforme a lei aplicavel.',
    ],
  },
  {
    title: '11. Direitos dos titulares',
    body: [
      'Nos termos da LGPD, o titular pode solicitar validacao de tratamento, acesso, ajuste, anonimizacao, bloqueio, retirada, portabilidade, dados sobre partilha, analise de escolhas automatizadas quando aplicavel e cancelamento do consentimento.',
      'Alguns pedidos podem depender de validacao de identidade e podem ser limitados por deveres legais, seguranca, prevencao de fraude, manutencao de contratos ou exercicio regular de direitos.',
    ],
  },
  {
    title: '12. Contato',
    body: [
      'Para exercer direitos, tirar duvidas ou solicitar dados sobre privacidade, use o link de suporte disponivel no rodape desta pagina.',
      'Antes da divulgacao definitiva, os dados juridicos do controlador, como nome empresarial, CNPJ, endereco e e-mail do encarregado ou canal de privacidade, devem ser preenchidos conforme a estrutura formal da empresa. Para falar com a Comvaga sobre privacidade, acesse o link de suporte disponivel no rodape.',
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
          <h1 className="text-4xl font-normal uppercase">Politica de Privacidade</h1>
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
          Politica atualizada em: 18 de julho de 2026.
        </p>

      </main>
      <AppFooter />
    </div>
  );
}
