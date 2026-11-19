import test from 'node:test';
import assert from 'node:assert/strict';
import { getRequestErrorKey } from '../../src/utils/requestError.js';
import { isRateLimitError, getErrorText } from '../../src/utils/errorUtils.js';

test('erros: identifica limite de requisições', () => assert.equal(getRequestErrorKey({ code: 'RATE_LIMIT_EXCEEDED' }), 'alerts.rate_limit_exceeded'));
test('erros: identifica timeout', () => assert.equal(getRequestErrorKey({ code: '57014' }), 'alerts.request_timeout'));
test('erros: bloqueio futuro usa chave personalizada', () => assert.equal(getRequestErrorKey({ code: 'entrega_agendamentos_futuros_bloqueados' }, { entregaFutureBookingsKey: 'meu_erro' }), 'meu_erro'));
test('erros: retorna null para erro sem mapeamento', () => assert.equal(getRequestErrorKey({ message: 'desconhecido' }), null));
test('erros: considera 429 rate limit', () => assert.equal(isRateLimitError({ status: 429 }), true));
test('erros: erro comum fica fora da categoria rate limit', () => assert.equal(isRateLimitError({ code: 'OTHER' }), false));
test('erros: extrai campos padronizados', () => assert.match(getErrorText({ code: 'ABC', message: 'Falha' }), /abc.*falha/));
