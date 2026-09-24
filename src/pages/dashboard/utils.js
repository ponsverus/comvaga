import { ptBR } from '../../feedback/messages/ptBR.js';
import { PROFISSIONAL_STATUS_DOT_CLASS } from '../../utils/profissionalStatus.js';
import { SUPPORT_PHONE_E164, getSupportHref } from '../../support.js';

export const STATUS_COLOR_CLASS = PROFISSIONAL_STATUS_DOT_CLASS;

export const SUPORTE_PHONE_E164 = SUPPORT_PHONE_E164;
export const SUPORTE_MSG = 'Olá, sou cadastrado como Profissional e gostaria de uma ajuda especializada para o meu perfil. Pode me orientar?';
export const SUPORTE_HREF = getSupportHref('professional');

export const AG_PAGE_SIZE = 50;
export const IMAGE_EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
export const NOW_RPC_SEQUENCE = ['now_sp', 'now_sp_fallback'];

export const WEEKDAYS = [
  { value: 0, label: 'DOM' },
  { value: 1, label: 'SEG' },
  { value: 2, label: 'TER' },
  { value: 3, label: 'QUA' },
  { value: 4, label: 'QUI' },
  { value: 5, label: 'SEX' },
  { value: 6, label: 'SÁB' },
];

export const DEFAULT_PROFISSIONAL_HORARIOS = WEEKDAYS.map((dia) => ({
  dia_semana: dia.value,
  ativo: [1, 2, 3, 4, 5].includes(dia.value),
  horario_inicio: '08:00',
  horario_fim: '18:00',
  almoco_inicio: '',
  almoco_fim: '',
}));

export function normalizeProfissionalHorarios(profissional = {}) {
  const byDay = new Map();

  if (Array.isArray(profissional?.horarios)) {
    for (const item of profissional.horarios) {
      const dia = Number(item?.dia_semana);
      if (!Number.isInteger(dia) || dia < 0 || dia > 6) continue;
      byDay.set(dia, {
        dia_semana: dia,
        ativo: item?.ativo !== false,
        horario_inicio: String(item?.horario_inicio || '08:00').slice(0, 5),
        horario_fim: String(item?.horario_fim || '18:00').slice(0, 5),
        almoco_inicio: item?.almoco_inicio ? String(item.almoco_inicio).slice(0, 5) : '',
        almoco_fim: item?.almoco_fim ? String(item.almoco_fim).slice(0, 5) : '',
      });
    }
  }

  return WEEKDAYS.map((dia) => byDay.get(dia.value) || {
    dia_semana: dia.value,
    ativo: [1, 2, 3, 4, 5].includes(dia.value),
    horario_inicio: '08:00',
    horario_fim: '18:00',
    almoco_inicio: '',
    almoco_fim: '',
  });
}

export function getHorarioPorDia(horarios, diaSemana) {
  const dia = Number(diaSemana);
  if (!Number.isInteger(dia) || dia < 0 || dia > 6) return null;
  return (Array.isArray(horarios) ? horarios : []).find((h) => Number(h?.dia_semana) === dia) || null;
}

export function getDiasTrabalhoFromHorarios(horarios) {
  return (Array.isArray(horarios) ? horarios : [])
    .filter((h) => h?.ativo !== false)
    .map((h) => Number(h.dia_semana))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    .sort((a, b) => a - b);
}

export function formatHorariosResumo(horarios, diaDestaque = null) {
  const ativos = (Array.isArray(horarios) ? horarios : []).filter((h) => h?.ativo !== false);
  if (!ativos.length) return 'Sem dias ativos';

  const destaque = getHorarioPorDia(ativos, diaDestaque);
  if (destaque) {
    const label = WEEKDAYS.find((w) => w.value === Number(diaDestaque))?.label || '';
    const range = `${String(destaque.horario_inicio || '08:00').slice(0, 5)} - ${String(destaque.horario_fim || '18:00').slice(0, 5)}`;
    return destaque.ativo !== false
      ? `${label} ${range}`
      : `${label} INATIVO`;
  }

  const grupos = new Map();
  for (const h of ativos) {
    const key = `${String(h.horario_inicio || '08:00').slice(0, 5)}-${String(h.horario_fim || '18:00').slice(0, 5)}`;
    grupos.set(key, [...(grupos.get(key) || []), Number(h.dia_semana)]);
  }
  const [range, dias] = [...grupos.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  const labels = dias.map((d) => WEEKDAYS.find((w) => w.value === d)?.label).filter(Boolean).join(' • ');
  return grupos.size === 1 ? `${labels} ${range.replace('-', ' - ')}` : `${labels} ${range.replace('-', ' - ')} + OUTROS`;
}

export function getSemanaResumo(horarios, diaDestaque = null) {
  return WEEKDAYS.map((dia) => {
    const item = (Array.isArray(horarios) ? horarios : []).find((h) => Number(h?.dia_semana) === dia.value);
    const ativo = item?.ativo !== false;
    const destaque = Number(diaDestaque) === dia.value;
    return {
      ...dia,
      ativo,
      destaque,
      item,
    };
  });
}

export const toNumberOrNull = (v) => {
  if (v === '' || v == null) return null;
  const n = Math.round(Number(v) * 100) / 100;
  return Number.isFinite(n) ? n : null;
};

export const sameDay = (a, b) => String(a || '') === String(b || '');

export function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = String(t).split(':').map(Number);
  return (h * 60) + (m || 0);
}

export const getAgDate = (a) => String(a?.data ?? '');
export const getAgInicio = (a) => String(a?.horario_inicio ?? '').slice(0, 5);
export const compareAgendamentoDateTimeDesc = (a, b) => {
  const d = getAgDate(b).localeCompare(getAgDate(a));
  if (d !== 0) return d;
  const h = getAgInicio(b).localeCompare(getAgInicio(a));
  if (h !== 0) return h;
  return String(a?.id || '').localeCompare(String(b?.id || ''));
};

export const normalizeStatus = (s) =>
  String(s || '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const isCancelStatus = (s) => normalizeStatus(s).includes('cancelado');
export const isDoneStatus = (s) => normalizeStatus(s) === 'concluido';
export const computeStatusFromDb = (a) => String(a?.status || '');

export function isCancellationScheduled(status) {
  return Boolean(status?.cancellation_scheduled)
    || (
      String(status?.status || '').toLowerCase() === 'active'
      && Boolean(status?.canceled_at)
      && Boolean(status?.access_ends_label || status?.access_ends_on)
    );
}

export function formatDateBRFromISO(dateStr) {
  if (!dateStr) return 'Selecionar';
  const [y, m, d] = String(dateStr).split('-');
  if (!y || !m || !d) return String(dateStr);
  return `${d}.${m}.${y}`;
}

export function getImageExt(file) {
  return IMAGE_EXT_BY_MIME[file?.type] || null;
}

export const toUpperClean = (s) => String(s || '').trim().replace(/\s+/g, ' ').toUpperCase();
export const isEnderecoPadrao = (s) => /^.+,\s*\d+.*\s-\s.+,\s.+$/.test(String(s || '').trim());

export function getValorEntrega(entrega) {
  const preco = Number(entrega?.preco ?? 0);
  const promoRaw = entrega?.preco_promocional;
  const promo = (promoRaw == null || promoRaw === '') ? null : Number(promoRaw);
  if (promo != null && Number.isFinite(promo) && promo > 0 && promo < preco) return promo;
  return preco;
}

export function getValorAgendamento(a) {
  const frozen = Number(a?.preco_final);
  if (Number.isFinite(frozen) && frozen > 0) return frozen;
  return getValorEntrega(a?.entregas);
}

export const normalizeKey = (s) => String(s || '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const getBizLabel = (group, key) =>
  ptBR?.dashboard?.business?.[key]?.[group] ?? ptBR?.dashboard?.business?.[key]?.servicos ?? '';
