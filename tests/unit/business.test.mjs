import test from 'node:test';
import assert from 'node:assert/strict';
import { flattenEntregaPages } from '../../src/utils/entregas.js';
import { businessGroupContext, pendingBusinessGroup, resolveBusinessGroup } from '../../src/utils/businessGroupResolution.js';
import { normalizeSeoText, buildBusinessSeo, SEO_TITLE_LIMIT, SEO_DESCRIPTION_LIMIT } from '../../src/utils/businessSeoRules.js';
import { publicHomeReviewsSnapshot } from '../../src/utils/publicHomeReviews.js';

test('entregas: concatena blocos em ordem crescente', () => {
  const rows = flattenEntregaPages({ x: { pages: { 2: [{ id: 'segundo' }], 1: [{ id: 'primeiro' }] } } });
  assert.deepEqual(rows.map(x => x.id), ['primeiro', 'segundo']);
});
test('entregas: remove IDs repetidos entre profissionais', () => {
  assert.deepEqual(flattenEntregaPages({ a: { pages: { 1: [{ id: 1 }] } }, b: { pages: { 1: [{ id: 1 }, { id: 2 }] } } }).map(x => x.id), [1, 2]);
});
test('entregas: ignora sem id', () => assert.deepEqual(flattenEntregaPages({ a: { pages: { 1: [{ nome: 'sem id' }] } } }), []));
test('grupo: usa categoria base quando tipo ausente', () => assert.equal(businessGroupContext('', null, 'n1').group, 'servicos'));
test('grupo: reconhece consultas', () => assert.equal(businessGroupContext('Consultorio', 'consultas', 'n1').group, 'consultas'));
test('grupo: desconhecido permanece aguardando resposta', () => assert.equal(pendingBusinessGroup(businessGroupContext('Outro', 'invalido', 'n2')).status, 'loading'));
test('grupo: conserva grupo anterior somente com chave igual', () => {
  const ctx = businessGroupContext('Trabalho', null, 'n1');
  assert.equal(pendingBusinessGroup(ctx, { key: ctx.key, group: 'aulas' }).group, 'aulas');
  assert.equal(pendingBusinessGroup(ctx, { key: 'outro', group: 'aulas' }).group, null);
});
test('grupo: resolve com callback sem grupo informado', async () => {
  const ctx = businessGroupContext('Barbearia', null, 'n1');
  const result = await resolveBusinessGroup(ctx, async () => 'servicos');
  assert.equal(result.group, 'servicos');
  assert.equal(result.status, 'ready');
});
test('grupo: recusa grupo externo desconhecido', async () => {
  await assert.rejects(resolveBusinessGroup(businessGroupContext('Outro', null, 'n1'), async () => 'inventado'), /desconhecido/);
});
test('SEO: compacta caracteres em branco', () => assert.equal(normalizeSeoText(' A\n  B \t C '), 'A B C'));
test('SEO: usa nome comercial', () => assert.match(buildBusinessSeo({ nome: 'Studio X', tipo_negocio: 'barbearia', endereco_cidade: 'Campinas' }).title, /Studio X/));
test('SEO: limita tamanho', () => {
  const { title, description } = buildBusinessSeo({ nome: 'A'.repeat(120), descricao: 'B'.repeat(200) });
  assert.ok(Array.from(title).length <= SEO_TITLE_LIMIT);
  assert.ok(Array.from(description).length <= SEO_DESCRIPTION_LIMIT);
});
test('reviews da Home: rejeita contagem incoerente', () => assert.throws(() => publicHomeReviewsSnapshot({ items: [{ id: 1 }], rating_count: 0 }), /Invalid/));
test('reviews da Home: limita a 12 e prepara rating', () => {
  const snap = publicHomeReviewsSnapshot({ items: Array.from({ length: 13 }, (_, i) => ({ id: i })), rating_count: 13, rating_value: 4.5 }, 'https://teste.supabase.co');
  assert.equal(snap.items.length, 12);
  assert.equal(snap.hasMore, true);
  assert.deepEqual(snap.rating, { count: 13, value: 4.5 });
});
