export const vitrine = {
  generic_title: 'Aviso',
  common_ok: 'ENTENDI',

  profile_unconfirmed: {
    title: 'Perfil pendente',
    body: 'Houve falha ao confirmar seu cadastro neste acesso. Atualize a página para tentar novamente.',
    buttonText: 'ENTENDI',
  },

  load_timeout: 'A vitrine demorou demais para carregar. Tente novamente.',
  load_error: 'Erro ao carregar a vitrine.',

  favorite_need_login: {
    title: 'Login necessário',
    body: 'Realize o login para favoritar este negócio.',
    buttonText: 'ENTENDI',
  },
  favorite_only_client: {
    title: 'Acesso restrito',
    body: 'Apenas contas do tipo CLIENTE podem favoritar negócios.',
    buttonText: 'ENTENDI',
  },
  favorite_invalid_business: {
    title: 'Negócio inválido',
    body: 'Negócio inválido.',
    buttonText: 'ENTENDI',
  },
  favorite_toggle_error: {
    title: 'Erro',
    body: 'Erro ao atualizar o favorito agora. Tente novamente.',
    buttonText: 'OK',
  },
  schedule_need_login_confirm: {
    title: 'Login necessário',
    body: 'Você precisa fazer login para agendar. Deseja fazer login agora?',
    confirmText: 'IR PARA LOGIN',
    cancelText: 'TALVEZ DEPOIS',
  },
  schedule_only_client: {
    title: 'Acesso restrito',
    body: 'Você está logado como PROFISSIONAL.\nPara agendar, entre com uma conta CLIENTE.',
    buttonText: 'ENTENDI',
  },
  schedule_blocked: {
    title: 'Agenda indisponível',
    body: 'Agendamentos online suspensos neste canal. Por favor, entre em contato direto com o proprietário deste estabelecimento para reservar seu horário.',
    buttonText: 'ENTENDI',
  },
  schedule_time_unavailable: {
    title: 'Horário oficial indisponível',
    body: 'Houve um erro ao confirmar o horário. Tente novamente.',
    buttonText: 'ENTENDI',
    retryButtonText: 'TENTAR NOVAMENTE',
    retryingButtonText: 'VERIFICANDO...',
  },
  schedule_errors: {
    no_slots: 'Sem vagas para a data escolhida. Selecione outro dia no calendário para continuar o agendamento.',
    slots_load_error: 'Erro ao buscar horários. Tente novamente.',
    plan_blocked: 'Agenda indisponível. Este negócio precisa ativar um plano para receber novos agendamentos.',
    rate_limit: 'Muitas tentativas de agendamento. Aguarde um minuto e tente novamente.',
    slot_expired: 'Esse horário expirou. Escolha outro.',
    slot_conflict: 'Alguém acabou de reservar esse horário. Escolha outro.',
    not_allowed: 'Você só pode criar agendamentos para a sua própria agenda.',
    connection: 'Houve um erro ao confirmar o resultado do agendamento. Acesse Minha Área, na aba Agendamentos, aguarde alguns instantes, atualize a página e verifique se ele aparece antes de escolher outro horário.',
    unexpected: 'Houve um erro ao concluir o agendamento. Tente novamente em alguns instantes.',
  },

  business: {
    section_title: {
      servs:  'Servs',
      consultas: 'Consultas',
      aulas:     'Aulas',
    },
    counter_singular: {
      servs:  'SERV.',
      consultas: 'CONSULTA',
      aulas:     'AULA',
    },
    counter_plural: {
      servs:  'SERVS',
      consultas: 'CONSULTAS',
      aulas:     'AULAS',
    },
    empty_list: {
      servs:  ':(',
      consultas: 'Sem consultas para este profissional.',
      aulas:     'Sem aulas para este profissional.',
    },
    load_more_error: {
      servs:  'Erro ao carregar mais servs. Tente novamente.',
      consultas: 'Erro ao carregar mais consultas. Tente novamente.',
      aulas:     'Erro ao carregar mais aulas. Tente novamente.',
    },
  },

  depoimentos_load_more_error: {
    title: 'Erro ao carregar',
    body: 'Erro ao carregar mais depoimentos. Tente novamente.',
    variant: 'warning',
    screen: 'light',
    buttonText: 'OK',
  },
  depoimento_need_login_confirm: {
    title: 'Login necessário',
    body: 'Você precisa fazer login para deixar um depoimento. Deseja fazer login agora?',
    confirmText: 'IR PARA LOGIN',
    cancelText: 'TALVEZ DEPOIS',
  },
  depoimento_only_client: {
    title: 'Acesso restrito',
    body: 'Apenas contas do tipo CLIENTE podem deixar depoimentos.',
    buttonText: 'ENTENDI',
  },
  depoimento_invalid_business: {
    title: 'Negócio inválido',
    body: 'Negócio inválido.',
    buttonText: 'ENTENDI',
  },
  depoimento_sent: {
    title: 'Depoimento registrado',
    body: 'Seu depoimento foi enviado com sucesso.',
    buttonText: 'OK',
  },
  depoimento_rate_limit: {
    title: 'Limite de depoimentos atingido',
    body: 'Você já enviou muitos depoimentos hoje. Tente novamente mais tarde.',
    buttonText: 'ENTENDI',
  },
  depoimento_send_error_title: 'Erro ao enviar depoimento',
  depoimento_send_error_body: 'Erro ao enviar seu depoimento agora. Tente novamente em instantes.',
};
