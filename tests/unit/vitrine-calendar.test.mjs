import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDateBR, getDowFromDateSP, gerarLinkGoogle, gerarArquivoICS,
  getPrecoFinalEntrega, sanitizeTel, getCalendarPlatformMode,
} from '../../src/pages/vitrine/utils.js';

const evento = { titulo: 'Corte, barba', dataISO: '2026-11-16', inicioHHMM: '09:00', duracaoMin: 45, detalhes: 'Linha 1\nLinha 2', local: 'Rua A; 10' };
test('vitrine: data brasileira', () => assert.equal(formatDateBR('2026-11-16'), '16.11.2026'));
test('vitrine: dia da semana em São Paulo', () => assert.equal(getDowFromDateSP('2026-11-16'), 1));
test('vitrine: dia inválido retorna null', () => assert.equal(getDowFromDateSP('16/11/2026'), null));
test('vitrine: preço promocional', () => assert.equal(getPrecoFinalEntrega({ preco: 50, preco_promocional: 30 }), 30));
test('vitrine: promoção inválida não altera preço', () => assert.equal(getPrecoFinalEntrega({ preco: 50, preco_promocional: 65 }), 50));
test('vitrine: remove caracteres externos de telefone', () => assert.equal(sanitizeTel(' +55 (31) 99999-8888 '), '+5531999998888'));
test('vitrine: plataforma de desktop seleciona ICS', () => assert.equal(getCalendarPlatformMode(), 'ics'));
test('Google Agenda: codifica descrição e horário UTC', () => {
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
test('ICS: respeita horário de término explícito', () => {
  const file = gerarArquivoICS({ ...evento, fimHHMM: '10:00' });
  assert.match(file.content, /DTEND:20261116T130000Z/);
});
