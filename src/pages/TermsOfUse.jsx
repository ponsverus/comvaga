import { Link } from 'react-router-dom';
import AppFooter from '../components/AppFooter';

const sections = [
  {
    title: '1. Concordância com os termos',
    body: [
      'Estes Termos de Uso regulam o acesso e uso da Comvaga por clientes, profissionais parceiros, donos de negócio e visitantes.',
      'Ao criar conta, acessar a plataforma, cadastrar negócio, solicitar parceria, realizar agendamento, contratar plano ou publicar conteúdo, você declara que leu e concorda com estes termos.',
      'Se você usa a Comvaga em nome de um negócio, declara possuir aval para vincular esse negócio e assumir compromissos em seu nome.',
    ],
  },
  {
    title: '2. O que a Comvaga oferece',
    body: [
      'A Comvaga fornece tecnologia para vitrine online, agenda, cadastro de trabalhos, gerenciamento de profissionais, agendamentos, lembretes, e-mails, depoimentos, planos e recursos relacionados.',
      'A Comvaga nunca executa os trabalhos anunciados pelos negócios e profissionais. A responsabilidade pela oferta do trabalho, atendimento, qualidade, disponibilidade, dados publicados, valores e cumprimento de normas profissionais é do responsável pelo negócio ou profissional anunciante.',
    ],
  },
  {
    title: '3. Contas e responsabilidades',
    body: [
      'O usuário deve fornecer dados verdadeiros, manter seus registros atualizados e proteger suas credenciais de acesso.',
      'É proibido usar a conta de terceiros, tentar acessar áreas sem aval, burlar limites técnicos, automatizar pedidos abusivos, explorar falhas, praticar fraude ou interferir no funcionamento da plataforma.',
      'A Comvaga pode aplicar medidas de resguardo, bloqueios, rate limits, checagens, pausas ou encerramento de acesso quando houver risco, abuso, fraude, quebra destes termos ou exigência legal.',
    ],
  },
  {
    title: '4. Clientes, agendamentos e cancelamentos',
    body: [
      'O cliente pode usar a plataforma para visualizar vitrines, escolher negócios, profissionais, trabalhos, datas e horários disponíveis.',
      'O agendamento depende da disponibilidade configurada pelo negócio ou profissional e das regras de funcionamento da plataforma.',
      'Cancelamentos, trocas de data, atrasos, ausência, reembolsos de trabalhos presenciais ou conflitos sobre atendimento devem observar as regras informadas pelo negócio e as leis aplicáveis.',
      'A Comvaga pode enviar e-mails transacionais sobre agendamentos, lembretes, cancelamentos e ajustes relacionados ao agendamento.',
    ],
  },
  {
    title: '5. Negócios e profissionais',
    body: [
      'O responsável pelo negócio deve cadastrar dados corretos sobre nome, local, contato, trabalhos, valores, horários, profissionais, fotos, políticas de atendimento e demais dados exibidos na vitrine.',
      'Profissionais parceiros podem solicitar vínculo com negócios. O pedido pode ficar pendente, ser aprovado, recusado, inativado ou excluído conforme a regra do negócio e da plataforma.',
      'O negócio é responsável por aprovar, remover, inativar e gerenciar profissionais vinculados, respeitando direitos de clientes, histórico operacional e regras da plataforma.',
      'É proibido publicar trabalhos ilegais, enganosos, discriminatórios, ofensivos, perigosos ou que exijam registro profissional sem que o responsável cumpra os requisitos legais aplicáveis.',
    ],
  },
  {
    title: '6. Conteúdo enviado por usuários',
    body: [
      'O usuário declara possuir todos os direitos, alvarás e avais necessários para publicar fotos, logos, marcas, nomes, textos, depoimentos, detalhes, imagens de pessoas e qualquer outro conteúdo enviado à Comvaga.',
      'É proibido publicar conteúdo que viole direitos autorais, marcas, imagem, honra, privacidade, segredos comerciais, leis, direitos de terceiros ou estes termos.',
      'A Comvaga pode remover, bloquear ou restringir conteúdo denunciado, ilegal, ofensivo, fraudulento, enganoso, abusivo, com suspeita de quebra de direitos ou incompatível com a finalidade da plataforma.',
      'Caso você identifique conteúdo que viole seus direitos, entre em contato com dados suficientes para localizar o conteúdo, titularidade alegada e justificativa do pedido de retirada.',
    ],
  },
  {
    title: '7. Planos, teste grátis e assinaturas',
    body: [
      'A Comvaga pode oferecer planos gratuitos, testes grátis e planos pagos com recursos, limites, valores, benefícios e regras descritas antes da assinatura.',
      'Antes do checkout, o usuário deve verificar o valor, recorrência, plano escolhido, recursos incluídos, limites de profissionais, regras promocionais, período de teste grátis quando houver e consequências de inadimplência ou cancelamento.',
      'Pagamentos e assinaturas podem ser processados por provedor externo de pagamento. A Comvaga pode receber status, identificadores e eventos de pagamento necessários para ativar, manter, alterar, cancelar ou bloquear recursos do plano.',
      'A assinatura do plano jamais transfere propriedade sobre a plataforma, código, marca, tecnologia ou recursos da Comvaga; ela concede apenas direito de uso conforme o plano ativo.',
    ],
  },
  {
    title: '8. Cancelamento de assinatura e arrependimento',
    body: [
      'O responsável pelo negócio pode cancelar a assinatura pelos caminhos disponibilizados na plataforma ou pelo suporte.',
      'A Comvaga deve informar, de forma clara, os efeitos do cancelamento, incluindo eventual encerramento de recursos pagos, período de acesso remanescente, bloqueio de novos agendamentos online ou ajustes no plano.',
      'Quando aplicável pela lei de consumo, o usuário poderá exercer direito de arrependimento em compras realizadas fora do estabelecimento comercial no prazo legal.',
      'Pedidos de cancelamento, estorno ou ajuste podem depender do status do pagamento, do provedor de pagamento, do uso do sistema, da data da assinatura e das regras legais aplicáveis.',
    ],
  },
  {
    title: '9. E-mails',
    body: [
      'A Comvaga pode enviar e-mails transacionais necessários ao uso da plataforma, como abertura de conta, resgate de senha, lembrete de agendamento, cancelamentos, defesa, suporte, pagamento e avisos operacionais.',
      'A Comvaga nunca realiza e-mail marketing atualmente. Se futuramente enviar e-mails promocionais, adotará rótulo claro, finalidade adequada e mecanismo de descadastro quando aplicável.',
    ],
  },
  {
    title: '10. Privacidade e dados pessoais',
    body: [
      'O tratamento de dados pessoais é explicado na Política de Privacidade da Comvaga.',
      'Ao usar a plataforma, você reconhece que dados podem ser tratados para entrega do sistema, defesa, pagamentos, suporte, avisos, cumprimento legal, melhoria da plataforma e outras finalidades descritas na Política de Privacidade.',
    ],
  },
  {
    title: '11. Propriedade intelectual da Comvaga',
    body: [
      'A marca Comvaga, layout, software, código, fluxos, textos institucionais, componentes, banco de dados, estrutura da plataforma e demais elementos pertencem à Comvaga ou a seus licenciadores.',
      'É proibido copiar, revender, reproduzir, modificar, explorar comercialmente, tentar extrair código-fonte, realizar engenharia reversa ou usar a plataforma sem o devido aval.',
    ],
  },
  {
    title: '12. Alcance da responsabilidade',
    body: [
      'A Comvaga trabalha para manter a plataforma disponível e protegida, mas jamais garante funcionamento ininterrupto, ausência absoluta de erros, disponibilidade permanente de terceiros, internet, meios de pagamento, hospedagem ou avisos.',
      'A Comvaga jamais responde por trabalhos prestados pelos negócios ou profissionais, dados publicados por usuários, conduta de terceiros, indisponibilidades externas, perdas decorrentes de uso indevido da conta ou descumprimento destes termos.',
      'Nada nestes termos exclui direitos protegidos de modo absoluto pela lei brasileira aplicável.',
    ],
  },
  {
    title: '13. Ajustes dos termos',
    body: [
      'Podemos reescrever estes termos para refletir ajustes legais, técnicos, comerciais ou operacionais.',
      'Quando o ajuste for relevante, poderemos comunicar pelos canais disponíveis. O uso continuado da plataforma após o novo texto indica ciência dos novos termos.',
    ],
  },
  {
    title: '14. Lei aplicável e contato',
    body: [
      'Estes termos seguem as leis da República Federativa do Brasil.',
      'Para dúvidas, suporte, pedidos de retirada de conteúdo, cancelamento, privacidade ou queixas, use o link de suporte disponível no rodapé desta página.',
    ],
  },
];

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
        <Link to="/" className="mb-8 inline-block">
          <img src="/Comvaga Logo.png" alt="Comvaga" className="h-14 w-auto object-contain" />
        </Link>

        <div className="mb-10">
          <p className="mb-3 text-xs uppercase text-primary">Legal</p>
          <h1 className="text-4xl font-normal uppercase">Termos de Uso</h1>
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
