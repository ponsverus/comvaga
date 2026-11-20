import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDateBR, getDowFromDateSP, gerarLinkGoogle, gerarArquivoICS,
  getValorFinalEntrega, sanitizeTel, getCalendarPlatformMode,
} from '../../src/pages/vitrine/utils.js';

const evento = { titulo: 'Corte, barba', dataISO: '2026-11-16', inicioHHMM: '09:00', tempoMin: 45, detalhes: 'Linha 1\nLinha 2', local: 'Rua A; 10' };

test('vitrine: data brasileira', () => assert.equal(formatDateBR('2026-11-16'), '16.11.2026'));
test('vitrine: dia da semana em Campinas', () => assert.equal(getDowFromDateSP('2026-11-16'), 1));
test('vitrine: data inválida retorna null', () => assert.equal(getDowFromDateSP('16/11/2026'), null));
test('vitrine: valor de oferta inferior prevalece', () => assert.equal(getValorFinalEntrega({ valor: 50, valor_oferta: 30 }), 30));
test('vitrine: valor de oferta superior mantém o valor original', () => assert.equal(getValorFinalEntrega({ valor: 50, valor_oferta: 65 }), 50));
test('vitrine: remove caracteres externos de telefone', () => assert.equal(sanitizeTel(' +55 (31) 99999-8888 '), '+5531999998888'));
test('vitrine: plataforma de desktop seleciona ICS', () => assert.equal(getCalendarPlatformMode(), 'ics'));
test('Google Agenda: codifica detalhes e horário UTC', () => {
  const link = new URL(gerarLinkGoogle(evento));
  assert.equal(link.hostname, 'calendar.google.com');
  assert.equal(link.searchParams.get('text'), 'Corte, barba');
  assert.equal(link.searchParams.get('dates'), '20261116T120000Z/20261116T124500Z');
  assert.match(link.searchParams.get('details'), /Linha 1/);
});
test('ICS: inclui horários, escape e identificador estável', () => {
  const file = gerarArquivoICS({ ...evento, uidSeed: 'cliente-001' });
  assert.match(file.filename, /^corte-barba-20261116\.ics$/);
  assert.match(file.content, /DTSTART:20261116T120000Z/);
  assert.match(file.content, /DTEND:20261116T124500Z/);
  assert.match(file.content, /SUMMARY:Corte\\, barba/);
  assert.match(file.content, /LOCATION:Rua A\\; 10/);
  assert.match(file.content, /UID:cliente-001-/);
});
test('ICS: respeita horário final informado', () => {
  const file = gerarArquivoICS({ ...evento, fimHHMM: '10:00' });
  assert.match(file.content, /DTEND:20261116T130000Z/);
});
