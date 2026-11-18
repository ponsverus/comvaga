export const professionalAccount = {
  account_delete_confirm: {
    title: 'Excluir conta',
    body:
      'Tem certeza que deseja excluir sua conta profissional?\n' +
      'Este processo é irreversível. Você perderá o acesso imediatamente.',
    variant: 'danger',
    screen: 'dark',
    confirmText: 'EXCLUIR CONTA',
    cancelText: 'VOLTAR',
    buttonText: 'EXCLUIR CONTA',
  },
  account_deleted: {
    title: 'Conta excluída',
    body: 'Sua conta profissional foi excluída com sucesso.',
    variant: 'success',
    screen: 'light',
    buttonText: 'OK',
  },
  account_delete_owned_businesses: {
    title: 'Negócios ativos',
    body:
      'Você ainda possui negócios vinculados a esta conta.\n' +
      'Exclua seus negócios pelo dashboard antes de excluir sua conta.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  account_delete_future_bookings: {
    title: 'Agendamentos futuros',
    body: 'Cancele ou reagende seus agendamentos de hoje ou futuros antes de excluir a conta.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  account_delete_error: {
    title: 'Erro ao excluir conta',
    body: 'Houve um erro ao tentar excluir sua conta. Tente novamente em instantes.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
};
