export const PAGE_SIZE = 50;
export const maskedPrivateValue = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';

export function formatDateBRFromISO(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = String(dateStr).split('-');
  if (!y || !m || !d) return String(dateStr);
  return `${d}.${m}.${y}`;
}

export const moneyBR = (v) => {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return '0,00';
  return n.toFixed(2).replace('.', ',');
};

export const getPrecoFinalEntrega = (e) => {
  const preco = Number(e?.preco ?? 0);
  const promoRaw = e?.preco_promocional;
  const promo = (promoRaw == null || promoRaw === '') ? 0 : Number(promoRaw);
  const temPromo = Number.isFinite(promo) && promo > 0 && promo < preco;
  return temPromo ? promo : preco;
};

export const getValorAgendamento = (a) => {
  const frozen = Number(a?.preco_final);
  if (Number.isFinite(frozen) && frozen > 0) return frozen;
  return getPrecoFinalEntrega(a?.entregas);
};

export const mergeById = (current, incoming) => {
  const seen = new Set();
  return [...current, ...incoming].filter(item => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'agendado':               return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
    case 'concluido':              return 'bg-green-500/20 border-green-500/50 text-green-400';
    case 'cancelado_cliente':
    case 'cancelado_profissional': return 'bg-red-500/20 border-red-500/50 text-red-400';
    default:                       return 'bg-gray-500/20 border-gray-500/50 text-gray-400';
  }
};

export const getStatusText = (status) => ({
  agendado:               'AGENDADO',
  concluido:              'CONCLU\u00cdDO',
  cancelado_cliente:      'CANCELADO',
  cancelado_profissional: 'CANCELADO',
}[status] || String(status || '').toUpperCase());

export const sortByDateThenTimeDesc = (list) =>
  [...(list || [])].sort((a, b) => {
    const da = String(a?.data || '');
    const db = String(b?.data || '');
    if (da !== db) return db.localeCompare(da);
    return String(b?.hora_inicio || '00:00').localeCompare(String(a?.hora_inicio || '00:00'));
  });
