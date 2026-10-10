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
    || raw.includes('limite diário')
    || raw.includes('429');
}
