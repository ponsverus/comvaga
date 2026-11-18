export const home = {
  app_review_need_login: {
    title: 'Login necessário',
    body: 'Você precisa ter uma conta e fazer login para deixar seu depoimento sobre a Comvaga. Deseja entrar agora?',
    variant: 'warning',
    screen: 'dark',
    confirmText: 'IR PARA LOGIN',
    cancelText: 'MAIS TARDE',
  },
  app_review_invalid_comment: {
    title: 'Comentário muito longo',
    body: 'Se escrever um comentário, use no máximo 1.000 caracteres.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  app_review_publish_confirm: {
    title: 'Publicar depoimento?',
    body: 'Ao prosseguir, você autoriza a Comvaga a exibir seu nome, sua foto de perfil (se houver), sua nota e seu comentário (se houver) publicamente no site, inclusive para leitura por buscadores.',
    variant: 'warning',
    screen: 'dark',
    confirmText: 'AUTORIZAR E PUBLICAR',
    cancelText: 'CANCELAR',
  },
  app_review_sent: {
    title: 'Depoimento publicado',
    body: 'Obrigado por compartilhar sua experiência com a Comvaga.',
    variant: 'success',
    screen: 'light',
    buttonText: 'OK',
  },
  app_review_already_sent: {
    title: 'Depoimento já enviado',
    body: 'Esta conta já enviou um depoimento sobre a Comvaga.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  app_review_send_error: {
    title: 'Erro ao enviar depoimento',
    body: 'Houve um erro ao publicar seu depoimento agora. Tente novamente em instantes.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  app_reviews_load_error: {
    title: 'Erro ao carregar depoimentos',
    body: 'Houve um erro ao carregar os depoimentos agora. Atualize a página e tente novamente.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'OK',
  },
  app_reviews_load_more_error: {
    title: 'Erro ao carregar',
    body: 'Houve um erro ao carregar mais depoimentos. Tente novamente.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'OK',
  },
  search_failed_support: {
    title: 'Houve uma falha ao concluir a busca agora',
    body:
      'Parece que ocorreu uma instabilidade temporária.\n' +
      'Tente novamente em alguns segundos.\n' +
      'Persistindo a dificuldade, utilize o SUPORTE no rodapé da página para falar com a gente.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
};
