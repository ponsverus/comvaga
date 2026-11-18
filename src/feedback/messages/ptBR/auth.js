export const login = {
  auth_error: {
    title: 'Acesso indisponível no momento.',
    body:
      'Confira seu e-mail, sua senha e o tipo selecionado.\n' +
      'Se o problema persistir, acesse SUPORTE no rodapé da página para falar com a gente.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  profile_access_unavailable: {
    title: 'Houve um erro ao carregar seu acesso',
    body:
      'Sua senha foi aceita, mas houve um erro ao confirmar seu perfil agora.\n' +
      'Tente novamente em alguns segundos.\n' +
      'Se persistir, acesse SUPORTE no rodapé da página.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  credentials_invalid: {
    title: 'E-mail ou senha incorretos',
    body:
      'Revise seus dados de acesso e tente novamente.\n' +
      'Se precisar, clique em TROCAR SENHA.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  email_not_confirmed: {
    title: 'Confirme seu e-mail',
    body:
      'Antes de entrar, confirme seu cadastro pelo link enviado ao seu e-mail.\n' +
      'Verifique também a pasta de spam.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  account_type_required: {
    title: 'Escolha o tipo de conta',
    body: 'Selecione CLIENTE ou PROFISSIONAL antes de entrar.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  account_type_mismatch: {
    title: 'Tipo de conta incorreto',
    body:
      'Esta conta pertence a outro tipo de acesso.\n' +
      'Volte e selecione o tipo correto para entrar.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  profile_not_ready: {
    title: 'Cadastro ainda indisponível',
    body:
      'Seu perfil segue em preparo para o acesso.\n' +
      'Aguarde alguns segundos e tente novamente.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  session_expired_or_invalid: {
    title: 'Link expirado ou inválido',
    body:
      'Solicite um novo link e tente novamente.\n' +
      'Por cuidado, links de resgate podem expirar.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  partner_use_partner_login: {
    title: 'Use o Login Parceiro',
    body:
      'Esta conta pertence a um profissional parceiro.\n' +
      'Acesse pelo Login Parceiro para entrar na central de negócios.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  reset_email_required: {
    title: 'Informe seu e-mail',
    body:
      'Digite seu e-mail para receber o link de resgate.\n' +
      'Se precisar, acesse SUPORTE no rodapé da página.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'OK',
  },
  reset_sent: {
    title: 'Link enviado',
    body:
      'Confira sua caixa de entrada para redefinir a senha.\n' +
      'Caso demore, busque o link na pasta de spam.',
    variant: 'success',
    screen: 'light',
    buttonText: 'OK',
  },
  reset_error: {
    title: 'Houve um erro ao enviar o link agora.',
    body:
      'Tente novamente em instantes.\n' +
      'Se persistir, acesse SUPORTE no rodapé da página.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  recovery_password_too_short: {
    title: 'Senha muito curta',
    body: 'A nova senha precisa ter pelo menos 7 caracteres.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  recovery_password_mismatch: {
    title: 'Senhas diferentes',
    body: 'Houve uma divergência nas senhas digitadas. Revise os campos e tente novamente.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  recovery_password_same_as_old: {
    title: 'Escolha uma nova senha',
    body: 'A nova senha precisa ser diferente da senha atual.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  recovery_password_updated: {
    title: 'Senha atualizada',
    body:
      'Sua senha foi atualizada com sucesso.\n' +
      'Agora você pode entrar novamente.',
    variant: 'success',
    screen: 'light',
    buttonText: 'OK',
  },
  recovery_password_update_error: {
    title: 'Erro ao atualizar senha',
    body:
      'Tente novamente.\n' +
      'Se persistir, acesse SUPORTE no rodapé da página.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
};

export const signupChoice = {
  navigate_error: {
    title: 'Houve um erro ao prosseguir. Tente novamente.',
    body:
      'Ocorreu uma falha ao abrir esta fase.\n' +
      'Tente novamente em alguns instantes.\n' +
      'Persistindo o erro, use o SUPORTE no rodapé da página para falar com a gente.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
};

export const signupClient = {
  name_required: {
    title: 'Nome obrigatório',
    body: 'Informe seu nome para continuar.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  email_invalid: {
    title: 'E-mail inválido',
    body: 'Informe um e-mail válido para continuar.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  email_already_exists: {
    title: 'E-mail já cadastrado',
    body:
      'Este e-mail já possui uma conta.\n' +
      'Use a tela de login para entrar ou recupere o acesso, se necessário.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  password_too_short: {
    title: 'Senha muito curta',
    body: 'A senha deve ter no mínimo 7 caracteres.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  created_confirm_email: {
    title: 'Conta criada :)',
    body:
      'Agora confirme seu e-mail para ativar o acesso.\n' +
      'Verifique a caixa de entrada e o spam.\n' +
      'Depois disso, realize o login normalmente.',
    variant: 'success',
    screen: 'light',
    buttonText: 'ENTENDI',
  },
  profile_not_ready: {
    title: 'Quase lá...',
    body:
      'Seu perfil está ausente no sistema.\n' +
      'Aguarde alguns segundos e tente fazer login.\n' +
      'Se persistir, acesse SUPORTE no rodapé da página.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
};

export const signupProfessional = {
  name_required: {
    title: 'Nome obrigatório',
    body: 'Informe seu nome para continuar.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  phone_required: {
    title: 'Telefone obrigatório',
    body: 'Informe seu WhatsApp para continuar.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  phone_invalid: {
    title: 'WhatsApp inválido',
    body: 'Informe um WhatsApp válido para continuar.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  email_invalid: {
    title: 'E-mail inválido',
    body: 'Informe um e-mail válido para continuar.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  email_already_exists: {
    title: 'E-mail já cadastrado',
    body:
      'Este e-mail já possui uma conta.\n' +
      'Use a tela de login para entrar ou recupere o acesso, se necessário.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  password_too_short: {
    title: 'Senha muito curta',
    body: 'A senha deve ter no mínimo 7 caracteres.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  business_name_required: {
    title: 'Nome do negócio obrigatório',
    body: 'Informe o nome do seu negócio para continuar.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  business_slug_invalid: {
    title: 'URL inválida',
    body: 'A URL do negócio precisa ter pelo menos 3 caracteres, usando apenas letras e números.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  business_type_required: {
    title: 'Tipo de negócio obrigatório',
    body: 'Informe o tipo do seu negócio (ex.: barbearia, clínica...).',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  address_street_required: {
    title: 'Endere. incompleto',
    body: 'Informe a rua do negócio.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  address_number_required: {
    title: 'Endere. incompleto',
    body: 'Informe o número do endere.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  address_city_required: {
    title: 'Endere. incompleto',
    body: 'Informe a cidade.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  address_state_required: {
    title: 'Endere. incompleto',
    body: 'Informe o estado.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'OK',
  },
  business_slug_taken: {
    title: 'URL já está em uso',
    body: 'Esta URL já está em uso. Escolha outro nome para o negócio.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  confirm_email_needed: {
    title: 'Confirme seu e-mail',
    body:
      'Sua conta foi criada. Confirme seu e-mail para ativar o acesso.\n' +
      'Verifique a caixa de entrada e o spam.\n' +
      'Depois disso, realize o login normalmente.',
    variant: 'success',
    screen: 'light',
    buttonText: 'ENTENDI',
  },
  profile_not_created: {
    title: 'Perfil ausente',
    body:
      'Seu perfil está ausente no sistema.\n' +
      'Aguarde alguns segundos e tente fazer login.\n' +
      'Se persistir, acesse SUPORTE no rodapé da página.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  profile_wrong_type: {
    title: 'Cadastro inconsistente',
    body:
      'Seu perfil foi criado com tipo incorreto.\n' +
      'Acesse SUPORTE no rodapé da página para resolver.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  partner_cannot_create_business: {
    title: 'Use uma conta administradora',
    body:
      'Esta conta pertence a um profissional parceiro.\n' +
      'Para criar negócios, entre com uma conta administradora.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  business_create_error: {
    title: 'Erro ao criar negócio',
    body:
      'Erro ao criar o negócio agora. ' +
      'Tente novamente em alguns instantes.\n' +
      'Se persistir, acesse SUPORTE no rodapé da página.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  resume_load_error: {
    title: 'Erro ao carregar a retomada',
    body:
      'Houve uma falha ao carregar os dados de retomada.\n' +
      'Recarregue a página e tente novamente.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  resume_error: {
    title: 'Erro na retomada do cadastro',
    body:
      'O processo de retomada falhou neste momento. ' +
      'Tente novamente em alguns instantes.',
    variant: 'danger',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
  plan_selection_failed: {
    title: 'Houve um erro ao aplicar o plano escolhido',
    body:
      'Seu negócio foi criado normalmente, mas houve uma falha ao aplicar o plano ' +
      'que você selecionou. O plano pode ser escolhido novamente em ' +
      'Dashboard > Planos.',
    variant: 'warning',
    screen: 'dark',
    buttonText: 'ENTENDI',
  },
};
