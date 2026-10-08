export const PROFISSIONAL_STATUS_DOT_CLASS = {
  ABERTO: 'bg-green-500',
  FECHADO: 'bg-red-500',
  PAUSA: 'bg-yellow-400',
  PENDENTE: 'bg-yellow-400',
  INATIVO: 'bg-gray-600',
};

export function normalizeProfissionalStatusKey(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function resolveProfissionalStatusKey(profissional) {
  return normalizeProfissionalStatusKey(
    profissional?.status_key || profissional?.status_label || profissional?.status
  );
}

export function getProfissionalStatusLabel(value, fallback = 'FECHADO') {
  const key = normalizeProfissionalStatusKey(value);
  return key || fallback;
}

export function getProfissionalStatusDotClass(value) {
  const key = normalizeProfissionalStatusKey(value);
  return PROFISSIONAL_STATUS_DOT_CLASS[key] || 'bg-gray-500';
}
