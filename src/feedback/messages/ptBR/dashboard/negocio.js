export const negocio = {
  business_delete_confirm: {
    title: 'Excluir negócio?',
    body:
      'Tem certeza que deseja excluir este negócio?\n' +
      'Este comando encerra e apaga os registros do negócio para sempre.',
    variant: 'warning',
    screen: 'dark',
    confirmText: 'EXCLUIR',
    cancelText: 'CANCELAR',
    buttonText: 'EXCLUIR',
  },
  business_deleted: {
    title: 'Negócio excluído',
    body: 'O negócio foi excluído com sucesso.',
    variant: 'success',
    screen: 'light',
    buttonText: 'OK',
  },
  business_delete_error: {
    title: 'Erro ao excluir',
    body: 'Erro ao excluir negócio. Tente novamente.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  business_delete_plan_active: {
    title: 'Plano ativo',
    body:
      'Para este negócio, primeiro cancele o plano ativo.\n' +
      'Depois que a assinatura ficar cancelada, será possível excluí-lo.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  business_delete_future_bookings: {
    title: 'Agendamentos futuros',
    body:
      'Este negócio possui agendamentos de hoje ou futuros.\n' +
      'Cancele ou reagende esses agendamentos antes de excluir o negócio.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  logo_updated: {
    title: 'Logo atualizada',
    body: 'Sua logo foi atualizada com sucesso.',
    variant: 'success',
    screen: 'light',
    buttonText: 'OK',
  },
  logo_update_error: {
    title: 'Erro ao atualizar logo',
    body: 'Tente atualizar sua logo novamente em instantes.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  logo_too_large: {
    title: 'Logo muito grande',
    body: 'A logo original pode ter no máximo 3 MB.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },

  business_info_updated: {
    title: 'Salvo',
    body: 'Os dados do negócio foram salvos com sucesso.',
    variant: 'success',
    screen: 'light',
    buttonText: 'OK',
  },
  business_info_update_error: {
    title: 'Erro ao salvar',
    body: 'Erro ao salvar os dados do negócio agora. Tente novamente.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  business_phone_invalid: {
    title: 'WhatsApp inválido',
    body: 'Informe um WhatsApp válido para continuar.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  business_seo_too_long: {
    title: 'Texto muito longo',
    body: 'Use até 50 caracteres no título e até 130 na meta description do Google.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  business_description_too_long: {
    title: 'Muito longo',
    body: 'O texto do campo "Sobre" ultrapassou o limite de 150 caracteres. Reduza o texto e tente novamente.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  business_announcement_too_long: {
    title: 'Anúncio muito longo',
    body: 'Escreva uma frase de até 30 caracteres para o anúncio da Vitrine.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },

  gallery_invalid_format: {
    title: 'Formato inválido',
    body: 'Envie apenas PNG, JPG ou WEBP.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  gallery_too_large: {
    title: 'Arquivo grande',
    body: 'Cada imagem pode ter no máximo 15 MB.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  gallery_upload_error: {
    title: 'Erro no upload',
    body: 'Erro ao enviar uma das imagens. Tente novamente.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  gallery_updated: {
    title: 'Galeria atualizada',
    body: 'As imagens foram adicionadas.',
    variant: 'success',
    screen: 'light',
    buttonText: 'OK',
  },
  gallery_partial_upload: {
    title: 'Galeria atualizada parcialmente',
    body: 'Algumas imagens foram adicionadas, mas outras falharam ao ser enviadas. Tente novamente com as imagens que faltaram.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'OK',
  },
  gallery_no_images_added: {
    title: 'Nenhuma imagem adicionada',
    body: 'Nenhuma imagem foi adicionada à galeria. Verifique os arquivos e tente novamente.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  gallery_update_error: {
    title: 'Erro',
    body: 'Erro ao concluir o envio das imagens. Tente novamente.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  gallery_load_warning: {
    title: 'Galeria indisponível no momento',
    body:
      'Erro ao carregar as imagens da galeria agora.\n' +
      'O restante do painel continua disponível.\n' +
      'Tente novamente em instantes.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  gallery_delete_confirm: {
    title: 'Excluir imagem?',
    body: 'Tem certeza que deseja excluir esta imagem da galeria?',
    variant: 'warning',
    screen: 'dark',
    confirmText: 'EXCLUIR',
    cancelText: 'CANCELAR',
    buttonText: 'EXCLUIR',
  },
  gallery_image_deleted: {
    title: 'Imagem excluída',
    body: 'A imagem foi excluída da galeria.',
    variant: 'success',
    screen: 'light',
    buttonText: 'OK',
  },
  gallery_delete_error: {
    title: 'Erro',
    body: 'Erro ao excluir esta imagem agora. Tente novamente.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },

  entrega_promo_invalid: {
    title: 'Oferta inválida',
    body: 'O valor promocional precisa ser menor que o valor original.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  entrega_price_invalid: {
    title: 'Valor inválido',
    body: 'Informe um valor válido para continuar.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  entrega_duration_invalid: {
    title: 'Tempo inválido',
    body: 'Informe o tempo em minutos.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  business: {

    tab_title: {
      servs:  'SERVS',
      consultas: 'Consultas',
      aulas:     'Aulas',
    },

    button_add: {
      servs:  'ADD SERV.',
      consultas: 'CONSULTA',
      aulas:     'AULA',
    },

    modal_new: {
      servs:  'NOVO SERV.',
      consultas: 'NOVA CONSULTA',
      aulas:     'NOVA AULA',
    },

    modal_edit: {
      servs:  'EDITAR SERV.',
      consultas: 'EDITAR CONSULTA',
      aulas:     'EDITAR AULA',
    },

    item_singular: {
      servs:  'Serv.',
      consultas: 'Consulta',
      aulas:     'Aula',
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

    servs: {
      entrega_created: {
        title: 'Serv. criado',
        body: 'O novo serv. já está disponível para agendamento.',
        variant: 'success', screen: 'light', buttonText: 'OK',
      },
      entrega_updated: {
        title: 'Serv. atualizado',
        body: 'Os ajustes foram salvos com sucesso.',
        variant: 'success', screen: 'light', buttonText: 'OK',
      },
      entrega_create_error: {
        title: 'Erro ao criar',
        body: 'Ocorreu uma falha ao criar este serv. Tente novamente.',
        variant: 'danger', screen: 'dark', buttonText: 'OK',
      },
      entrega_update_error: {
        title: 'Erro ao salvar',
        body: 'Ocorreu uma falha ao atualizar este serv. Tente novamente.',
        variant: 'danger', screen: 'dark', buttonText: 'OK',
      },
      entrega_duplicate_name: {
        title: 'Nome repetido',
        body: 'Este profissional já possui um serv. com este nome.',
        variant: 'warning', screen: 'dark', buttonText: 'OK',
      },
      entrega_delete_confirm: {
        title: 'Excluir serv?',
        body: 'Tem certeza que deseja excluir este serv?',
        variant: 'warning', screen: 'dark',
        confirmText: 'EXCLUIR', cancelText: 'CANCELAR', buttonText: 'EXCLUIR',
      },
      entrega_deleted: {
        title: 'Serv. excluído',
        body: 'O serv. foi excluído da lista.',
        variant: 'success', screen: 'light', buttonText: 'OK',
      },
      entrega_activated: {
        title: 'Serv. ativado',
        body: 'O serv. foi ativado com sucesso.',
        variant: 'success', screen: 'light', buttonText: 'OK',
      },
      entrega_inactivated: {
        title: 'Serv. inativado',
        body: 'O serv. foi inativado com sucesso.',
        variant: 'danger', screen: 'dark', buttonText: 'OK',
      },
      entrega_toggle_error: {
        title: 'Erro',
        body: 'Erro ao alterar o status do serv. agora. Tente novamente.',
        variant: 'danger', screen: 'dark', buttonText: 'OK',
      },
      load_more_error: {
        title: 'Erro ao carregar',
        body: 'Erro ao carregar esta página. Tente novamente.',
        variant: 'warning', screen: 'dark', buttonText: 'OK',
      },
      entrega_delete_error: {
        title: 'Erro',
        body: 'Houve um erro ao excluir o serv. Tente novamente.',
        variant: 'danger', screen: 'dark', buttonText: 'OK',
      },
      entrega_future_bookings_blocked: {
        title: 'Serv. com agendamentos',
        body:
          'Este serv. possui agendamentos marcados para hoje ou para uma data futura.\n' +
          'Cancele ou reagende esses agendamentos antes de inativar ou excluir.',
        variant: 'warning', screen: 'dark', buttonText: 'ENTENDI',
      },
      entrega_prof_required: {
        title: 'Selecione um profissional',
        body: 'Escolha um profissional para o serv.',
        variant: 'danger', screen: 'dark', buttonText: 'OK',
      },
    },

    consultas: {
      entrega_created: {
        title: 'Consulta criada',
        body: 'A nova consulta já está disponível para agendamento.',
        variant: 'success', screen: 'light', buttonText: 'OK',
      },
      entrega_updated: {
        title: 'Consulta atualizada',
        body: 'Os ajustes foram salvos com sucesso.',
        variant: 'success', screen: 'light', buttonText: 'OK',
      },
      entrega_create_error: {
        title: 'Erro ao criar',
        body: 'Ocorreu uma falha ao criar esta consulta. Tente novamente.',
        variant: 'danger', screen: 'dark', buttonText: 'OK',
      },
      entrega_update_error: {
        title: 'Erro ao salvar',
        body: 'Ocorreu uma falha ao atualizar esta consulta. Tente novamente.',
        variant: 'danger', screen: 'dark', buttonText: 'OK',
      },
      entrega_duplicate_name: {
        title: 'Nome repetido',
        body: 'Este profissional já possui uma consulta com este nome.',
        variant: 'warning', screen: 'dark', buttonText: 'OK',
      },
      entrega_delete_confirm: {
        title: 'Excluir consulta?',
        body: 'Tem certeza que deseja excluir esta consulta?',
        variant: 'warning', screen: 'dark',
        confirmText: 'EXCLUIR', cancelText: 'CANCELAR', buttonText: 'EXCLUIR',
      },
      entrega_deleted: {
        title: 'Consulta excluída',
        body: 'A consulta foi removida da lista.',
        variant: 'success', screen: 'light', buttonText: 'OK',
      },
      entrega_activated: {
        title: 'Consulta ativada',
        body: 'A consulta foi ativada com sucesso.',
        variant: 'success', screen: 'light', buttonText: 'OK',
      },
      entrega_inactivated: {
        title: 'Consulta inativada',
        body: 'A consulta foi inativada com sucesso.',
        variant: 'danger', screen: 'dark', buttonText: 'OK',
      },
      entrega_toggle_error: {
        title: 'Erro',
        body: 'Erro ao alterar o status da consulta agora. Tente novamente.',
        variant: 'danger', screen: 'dark', buttonText: 'OK',
      },
      load_more_error: {
        title: 'Erro ao carregar',
        body: 'Erro ao carregar mais consultas. Tente novamente.',
        variant: 'warning', screen: 'dark', buttonText: 'OK',
      },
      entrega_delete_error: {
        title: 'Erro',
        body: 'Houve um erro ao excluir a consulta. Tente novamente.',
        variant: 'danger', screen: 'dark', buttonText: 'OK',
      },
      entrega_future_bookings_blocked: {
        title: 'Consulta com agendamentos',
        body:
          'Esta consulta possui agendamentos marcados para hoje ou para uma data futura.\n' +
          'Cancele ou reagende esses agendamentos antes de inativar ou excluir.',
        variant: 'warning', screen: 'dark', buttonText: 'ENTENDI',
      },
      entrega_prof_required: {
        title: 'Selecione um profissional',
        body: 'Escolha um profissional para esta consulta.',
        variant: 'danger', screen: 'dark', buttonText: 'OK',
      },
    },

    aulas: {
      entrega_created: {
        title: 'Aula criada',
        body: 'A nova aula já está disponível para agendamento.',
        variant: 'success', screen: 'light', buttonText: 'OK',
      },
      entrega_updated: {
        title: 'Aula atualizada',
        body: 'Os ajustes foram salvos com sucesso.',
        variant: 'success', screen: 'light', buttonText: 'OK',
      },
      entrega_create_error: {
        title: 'Erro ao criar',
        body: 'Ocorreu uma falha ao criar esta aula. Tente novamente.',
        variant: 'danger', screen: 'dark', buttonText: 'OK',
      },
      entrega_update_error: {
        title: 'Erro ao salvar',
        body: 'Ocorreu uma falha ao atualizar esta aula. Tente novamente.',
        variant: 'danger', screen: 'dark', buttonText: 'OK',
      },
      entrega_duplicate_name: {
        title: 'Nome repetido',
        body: 'Este profissional já possui uma aula com este nome.',
        variant: 'warning', screen: 'dark', buttonText: 'OK',
      },
      entrega_delete_confirm: {
        title: 'Excluir aula?',
        body: 'Tem certeza que deseja excluir esta aula?',
        variant: 'warning', screen: 'dark',
        confirmText: 'EXCLUIR', cancelText: 'CANCELAR', buttonText: 'EXCLUIR',
      },
      entrega_deleted: {
        title: 'Aula excluída',
        body: 'A aula foi removida da lista.',
        variant: 'success', screen: 'light', buttonText: 'OK',
      },
      entrega_activated: {
        title: 'Aula ativada',
        body: 'A aula foi ativada com sucesso.',
        variant: 'success', screen: 'light', buttonText: 'OK',
      },
      entrega_inactivated: {
        title: 'Aula inativada',
        body: 'A aula foi inativada com sucesso.',
        variant: 'danger', screen: 'dark', buttonText: 'OK',
      },
      entrega_toggle_error: {
        title: 'Erro',
        body: 'Erro ao alterar o status da aula agora. Tente novamente.',
        variant: 'danger', screen: 'dark', buttonText: 'OK',
      },
      load_more_error: {
        title: 'Erro ao carregar',
        body: 'Erro ao carregar mais aulas. Tente novamente.',
        variant: 'warning', screen: 'dark', buttonText: 'OK',
      },
      entrega_delete_error: {
        title: 'Erro',
        body: 'Houve um erro ao excluir a aula. Tente novamente.',
        variant: 'danger', screen: 'dark', buttonText: 'OK',
      },
      entrega_future_bookings_blocked: {
        title: 'Aula com agendamentos',
        body:
          'Esta aula possui agendamentos marcados para hoje ou para uma data futura.\n' +
          'Cancele ou reagende esses agendamentos antes de inativar ou excluir.',
        variant: 'warning', screen: 'dark', buttonText: 'ENTENDI',
      },
      entrega_prof_required: {
        title: 'Selecione um profissional',
        body: 'Escolha um profissional para esta aula.',
        variant: 'danger', screen: 'dark', buttonText: 'OK',
      },
    },
  },

};
