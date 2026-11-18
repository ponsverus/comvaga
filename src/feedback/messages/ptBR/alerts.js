export const alerts = {
  action_failed_support: {
    title: 'Algo fugiu do esperado',
    body:
      'Houve um erro inesperado durante o processamento.\n' +
      'Isso pode ser uma instabilidade temporária.\n' +
      'Se o problema persistir, acesse SUPORTE no rodapé da página para falar com a gente.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  request_timeout: {
    title: 'Demorou demais',
    body: 'O carregamento levou mais tempo que o normal.\nTente novamente em instantes.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  rate_limit_exceeded: {
    title: 'Muitas tentativas',
    body: 'Você realizou muitas tentativas em pouco tempo.\nAguarde um minuto e tente novamente.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  business_not_loaded: {
    title: 'Falha ao ler os dados do negócio',
    body: 'Ocorreu um erro técnico durante o carregamento dos dados.\nRecarregue a página e tente novamente.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  route_load_failed: {
    title: 'Algo deu errado',
    body: 'O carregamento da tela falhou. Por favor, atualize a página e tente novamente.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'TENTAR NOVAMENTE',
  },
};
