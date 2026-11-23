export function formatMoneyBR(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return '0,00';
  return number.toFixed(2).replace('.', ',');
}
