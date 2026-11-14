import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PAGE_SIZE, formatDateBRFromISO, moneyBR, getPrecoFinalEntrega, getValorAgendamento,
  mergeById, getStatusText, getStatusColor, sortByDateThenTimeDesc,
} from '../../src/pages/clientArea/utils.js';

test('paginação: valor padrão', () => assert.equal(PAGE_SIZE, 50));
test('preço: promoção menor que o original prevalece', () => assert.equal(getPrecoFinalEntrega({ preco: 100, preco_promocional: 80 }), 80));
test('preço: promoção maior é ignorada', () => assert.equal(getPrecoFinalEntrega({ preco: 100, preco_promocional: 120 }), 100));
test('preço: promoção igual é ignorada', () => assert.equal(getPrecoFinalEntrega({ preco: 100, preco_promocional: 100 }), 100));
test('preço: promoção zero é ignorada', () => assert.equal(getPrecoFinalEntrega({ preco: 100, preco_promocional: 0 }), 100));
test('preço: promoção vazia é ignorada', () => assert.equal(getPrecoFinalEntrega({ preco: '80', preco_promocional: '' }), 80));
test('agendamento: preço final congelado é preservado', () => assert.equal(getValorAgendamento({ preco_final: 25, entregas: { preco: 100 } }), 25));
test('agendamento: zero é um preço final válido', () => assert.equal(getValorAgendamento({ preco_final: 0, entregas: { preco: 100 } }), 0));
test('agendamento: preço congelado inválido usa o valor da entrega', () => assert.equal(getValorAgendamento({ preco_final: 'invalido', entregas: { preco: 100, preco_promocional: 80 } }), 80));
test('agendamento: preço congelado negativo usa o valor da entrega', () => assert.equal(getValorAgendamento({ preco_final: -1, entregas: { preco: 70 } }), 70));
test('moeda: formata duas casas e vírgula', () => assert.equal(moneyBR(12.5), '12,50'));
test('moeda: inválido vira zero', () => assert.equal(moneyBR('inválido'), '0,00'));
test('data: formatação brasileira', () => assert.equal(formatDateBRFromISO('2026-11-14'), '14.11.2026'));
test('data: vazia', () => assert.equal(formatDateBRFromISO(''), ''));
test('lista: combina sem duplicar IDs e mantém a primeira ocorrência', () => assert.deepEqual(mergeById([{ id: 1, valor: 'original' }], [{ id: 1, valor: 'nova' }, { id: 2 }]), [{ id: 1, valor: 'original' }, { id: 2 }]));
test('lista: descarta entradas sem ID', () => assert.deepEqual(mergeById([], [{ nome: 'sem ID' }, { id: 'a' }]), [{ id: 'a' }]));
test('status: cancelamento profissional tem rótulo cancelado', () => assert.equal(getStatusText('cancelado_profissional'), 'CANCELADO'));
test('status: fallback converte para caixa alta', () => assert.equal(getStatusText('pendente'), 'PENDENTE'));
test('status: agendado recebe classe azul', () => assert.match(getStatusColor('agendado'), /blue/));
test('ordenação: data e hora mais recentes primeiro sem mutar original', () => {
  const original = [{ id: 1, data: '2026-01-02', hora_inicio: '09:00' }, { id: 2, data: '2026-01-02', hora_inicio: '11:00' }, { id: 3, data: '2026-01-03', hora_inicio: '08:00' }];
  assert.deepEqual(sortByDateThenTimeDesc(original).map(x => x.id), [3, 2, 1]);
  assert.equal(original[0].id, 1);
});
