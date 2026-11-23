import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PAGE_SIZE, formatDateBRFromISO, getValorFinalEntrega, getValorAgendamento,
  mergeById, getStatusText, getStatusColor, sortByDateThenTimeDesc,
} from '../../src/pages/clientArea/utils.js';
import { formatMoneyBR } from '../../src/utils/money.js';

test('página: limite de itens definido', () => assert.equal(PAGE_SIZE, 50));
test('valor de oferta: menor que o original prevalece', () => assert.equal(getValorFinalEntrega({ valor: 100, valor_oferta: 80 }), 80));
test('valor de oferta: maior que o original é ignorado', () => assert.equal(getValorFinalEntrega({ valor: 100, valor_oferta: 120 }), 100));
test('valor de oferta: igual ao original é ignorado', () => assert.equal(getValorFinalEntrega({ valor: 100, valor_oferta: 100 }), 100));
test('valor de oferta: zero é ignorado', () => assert.equal(getValorFinalEntrega({ valor: 100, valor_oferta: 0 }), 100));
test('valor de oferta: vazio é ignorado', () => assert.equal(getValorFinalEntrega({ valor: '80', valor_oferta: '' }), 80));
test('agendamento: valor final registrado permanece preservado', () => assert.equal(getValorAgendamento({ valor_final: 25, entregas: { valor: 100 } }), 25));
test('agendamento: zero é um valor final válido', () => assert.equal(getValorAgendamento({ valor_final: 0, entregas: { valor: 100 } }), 0));
test('agendamento: valor final inválido usa o valor do trabalho', () => assert.equal(getValorAgendamento({ valor_final: 'invalido', entregas: { valor: 100, valor_oferta: 80 } }), 80));
test('agendamento: valor final negativo usa o valor do trabalho', () => assert.equal(getValorAgendamento({ valor_final: -1, entregas: { valor: 70 } }), 70));
test('moeda: apresenta duas casas e separador decimal', () => assert.equal(formatMoneyBR(12.5), '12,50'));
test('moeda: entrada inválida retorna zero', () => assert.equal(formatMoneyBR('inválido'), '0,00'));
test('data: apresenta no formato brasileiro', () => assert.equal(formatDateBRFromISO('2026-11-14'), '14.11.2026'));
test('data: vazia', () => assert.equal(formatDateBRFromISO(''), ''));
test('lista: combina sem duplicar IDs e preserva o primeiro registro', () => assert.deepEqual(mergeById([{ id: 1, valor: 'original' }], [{ id: 1, valor: 'nova' }, { id: 2 }]), [{ id: 1, valor: 'original' }, { id: 2 }]));
test('lista: descarta entradas sem ID', () => assert.deepEqual(mergeById([], [{ nome: 'sem ID' }, { id: 'a' }]), [{ id: 'a' }]));
test('status: cancelamento profissional retorna cancelado', () => assert.equal(getStatusText('cancelado_profissional'), 'CANCELADO'));
test('status: fallback converte para caixa alta', () => assert.equal(getStatusText('pendente'), 'PENDENTE'));
test('status: agendado recebe classe azul', () => assert.match(getStatusColor('agendado'), /blue/));
test('lista: organiza datas e horas recentes primeiro sem alterar a original', () => {
  const original = [{ id: 1, data: '2026-01-02', hora_inicio: '09:00' }, { id: 2, data: '2026-01-02', hora_inicio: '11:00' }, { id: 3, data: '2026-01-03', hora_inicio: '08:00' }];
  assert.deepEqual(sortByDateThenTimeDesc(original).map(x => x.id), [3, 2, 1]);
  assert.equal(original[0].id, 1);
});
