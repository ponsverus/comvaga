export function formatDateBR(ymd) {
  if (!ymd) return '';
  const [y, m, d] = String(ymd).split('-');
  if (!y || !m || !d) return String(ymd);
  return `${d}.${m}.${y}`;
}

export function getDowFromDateSP(dateStr) {
  if (!dateStr) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr).trim());
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).getUTCDay();
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function parseSaoPauloDateTime(dateISO, timeValue) {
  const normalizedTime = String(timeValue || '00:00').slice(0, 5);
  return new Date(`${dateISO}T${normalizedTime}:00-03:00`);
}

function formatUtcCalendarDate(date) {
  return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`;
}

function escapeIcsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function slugifyFilePart(value) {
  return String(value || 'evento')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'evento';
}

export function getCalendarPlatformMode() {
  if (typeof navigator === 'undefined') return 'chooser';
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const isAndroid = /Android/i.test(ua);
  const isIPhone = /iPhone/i.test(ua);
  const isIPad = /iPad/i.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
  const isMac = /Mac/i.test(platform) && maxTouchPoints <= 1;

  if (isAndroid) return 'google-with-fallback';
  if (isIPhone || isIPad || isMac) return 'ics';
  return 'ics';
}

function getCalendarEndDate(dataISO, inicioHHMM, fimHHMM, duracaoMin) {
  const inicio = parseSaoPauloDateTime(dataISO, inicioHHMM);
  if (fimHHMM) return parseSaoPauloDateTime(dataISO, fimHHMM);
  return new Date(inicio.getTime() + duracaoMin * 60000);
}

export function gerarLinkGoogle({ titulo, dataISO, inicioHHMM, fimHHMM, duracaoMin, detalhes, local }) {
  const inicio = parseSaoPauloDateTime(dataISO, inicioHHMM);
  const fim = getCalendarEndDate(dataISO, inicioHHMM, fimHHMM, duracaoMin);
  const details = [detalhes, local ? `Local: ${local}` : ''].filter(Boolean).join('\n');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titulo)}&dates=${formatUtcCalendarDate(inicio)}/${formatUtcCalendarDate(fim)}&ctz=America%2FSao_Paulo&details=${encodeURIComponent(details)}&location=${encodeURIComponent(local || '')}&sf=true&output=xml`;
}

export function gerarArquivoICS({ titulo, dataISO, inicioHHMM, fimHHMM, duracaoMin, detalhes, local, uidSeed }) {
  const inicio = parseSaoPauloDateTime(dataISO, inicioHHMM);
  const fim = getCalendarEndDate(dataISO, inicioHHMM, fimHHMM, duracaoMin);
  const dtStamp = formatUtcCalendarDate(new Date());
  const dtStart = formatUtcCalendarDate(inicio);
  const dtEnd = formatUtcCalendarDate(fim);
  const uid = `${slugifyFilePart(uidSeed || titulo)}-${dtStart}@comvaga`;
  const content = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Comvaga//Agenda//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(titulo)}`,
    `DESCRIPTION:${escapeIcsText(detalhes)}`,
    `LOCATION:${escapeIcsText(local)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete de agendamento',
    'TRIGGER:-PT30M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return {
    content,
    filename: `${slugifyFilePart(titulo)}-${String(dataISO || '').replace(/-/g, '')}.ics`,
  };
}

export function getPrecoFinalEntrega(s) {
  const preco = Number(s?.preco ?? 0);
  const promo = Number(s?.preco_promocional ?? 0);
  const temPromo = Number.isFinite(promo) && promo > 0 && promo < preco;
  return temPromo ? promo : preco;
}

export function sanitizeTel(raw) {
  const v = String(raw || '').trim();
  if (!v) return '';
  return v.replace(/[^\d+]/g, '');
}
