export function getErrorText(error) {
  return [
    error?.code,
    error?.status,
    error?.message,
    error?.error_description,
    error?.details,
    error?.hint,
    typeof error === 'string' ? error : '',
  ].filter(Boolean).join(' ').toLowerCase();
}

export function isRateLimitError(error) {
  const raw = getErrorText(error);
  return raw.includes('rate_limit')
    || raw.includes('too many')
    || raw.includes('muitas tentativas')
    || raw.includes('429');
}

export function isInvalidCredentialsError(error) {
  const raw = getErrorText(error);
  return raw.includes('invalid login credentials')
    || raw.includes('invalid credentials');
}

export function isEmailNotConfirmedError(error) {
  const raw = getErrorText(error);
  return raw.includes('email not confirmed')
    || raw.includes('email_not_confirmed');
}

export function isSessionInvalidOrExpiredError(error) {
  const raw = getErrorText(error);
  return raw.includes('session')
    || raw.includes('token')
    || raw.includes('expired')
    || raw.includes('invalid jwt')
    || raw.includes('jwt expired')
    || raw.includes('auth session missing');
}

export function getLoginAuthAlertKey(error) {
  const raw = getErrorText(error);

  if (isRateLimitError(error)) return 'alerts.rate_limit_exceeded';
  if (isEmailNotConfirmedError(error)) return 'login.email_not_confirmed';
  if (isInvalidCredentialsError(error)) return 'login.credentials_invalid';
  if (raw.includes('perfil inexistente')) return 'login.profile_not_ready';
  if (raw.includes('selecione o tipo de conta')) return 'login.account_type_required';
  if (raw.includes('esta conta e de') || raw.includes('esta conta é de')) return 'login.account_type_mismatch';

  return 'login.auth_error';
}

export function getPasswordResetRequestAlertKey(error) {
  if (isRateLimitError(error)) return 'alerts.rate_limit_exceeded';
  return 'login.reset_error';
}

export function getPasswordUpdateAlertKey(error) {
  const raw = getErrorText(error);
  if (isRateLimitError(error)) return 'alerts.rate_limit_exceeded';
  if (
    raw.includes('new password should be different from the old password')
    || raw.includes('different from the old password')
    || raw.includes('same password')
  ) return 'login.recovery_password_same_as_old';
  if (isSessionInvalidOrExpiredError(error)) return 'login.session_expired_or_invalid';
  return 'login.recovery_password_update_error';
}

export function getParceiroLoginAlert(error, msgs) {
  if (isRateLimitError(error)) return msgs.rate_limit_exceeded || msgs.auth_error;
  if (isEmailNotConfirmedError(error)) return msgs.email_not_confirmed || msgs.auth_error;
  if (isInvalidCredentialsError(error)) return msgs.credentials_invalid || msgs.auth_error;
  return msgs.auth_error;
}

export function getParceiroCadastroAlert(error, msgs) {
  const raw = getErrorText(error);
  if (isRateLimitError(error)) return msgs.email_check_rate_limit || msgs.unexpected_error;
  if (raw.includes('already')) return msgs.access_unavailable || msgs.unexpected_error;
  return msgs.unexpected_error;
}
