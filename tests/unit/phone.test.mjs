import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBrazilPhone, formatPhoneForDisplay, formatPhoneForWhatsAppLink } from '../../src/utils/phone.js';

test('telefone: normaliza celular formatado', () => assert.equal(normalizeBrazilPhone('(31) 99999-8888'), '+5531999998888'));
test('telefone: preserva DDI brasileiro', () => assert.equal(normalizeBrazilPhone('+55 (31) 99999-8888'), '+5531999998888'));
test('telefone: aceita número fixo', () => assert.equal(normalizeBrazilPhone('3133334444'), '+553133334444'));
test('telefone: rejeita número incompleto', () => assert.equal(normalizeBrazilPhone('123'), null));
test('telefone: entrada vazia permanece vazia', () => assert.equal(normalizeBrazilPhone(''), ''));
test('telefone: remove DDI para leitura', () => assert.equal(formatPhoneForDisplay('+5531999998888'), '31999998888'));
test('telefone: WhatsApp recebe apenas dígitos', () => assert.equal(formatPhoneForWhatsAppLink('+55 (31) 99999-8888'), '5531999998888'));
