import test from 'node:test';
import assert from 'node:assert/strict';
import { flattenEntregaPages } from '../../src/utils/entregas.js';
import { businessGroupContext, pendingBusinessGroup, resolveBusinessGroup } from '../../src/utils/businessGroupResolution.js';
import { normalizeSeoText, buildBusinessSeo, SEO_TITLE_LIMIT, SEO_DESCRIPTION_LIMIT } from '../../src/utils/businessSeoRules.js';
import { publicHomeReviewsSnapshot } from '../../src/utils/publicHomeReviews.js';
import { publicBusinessSnapshot } from '../../src/utils/publicBusinessPage.js';
import { buildBusinessStructuredData } from '../../src/utils/businessSeo.js';

test('entregas: concatena blocos em ordem crescente', () => {
  const rows = flattenEntregaPages({ x: { pages: { 2: [{ id: 'segundo' }], 1: [{ id: 'primeiro' }] } } });
  assert.deepEqual(rows.map(x => x.id), ['primeiro', 'segundo']);
});
test('entregas: remove IDs repetidos entre profissionais', () => {
  assert.deepEqual(flattenEntregaPages({ a: { pages: { 1: [{ id: 1 }] } }, b: { pages: { 1: [{ id: 1 }, { id: 2 }] } } }).map(x => x.id), [1, 2]);
});
test('entregas: ignora sem id', () => assert.deepEqual(flattenEntregaPages({ a: { pages: { 1: [{ nome: 'sem id' }] } } }), []));
test('grupo: usa categoria base quando tipo ausente', () => assert.equal(businessGroupContext('', null, 'n1').group, 'servs'));
test('grupo: reconhece consultas', () => assert.equal(businessGroupContext('Consultorio', 'consultas', 'n1').group, 'consultas'));
test('grupo: desconhecido permanece aguardando resposta', () => assert.equal(pendingBusinessGroup(businessGroupContext('Outro', 'invalido', 'n2')).status, 'loading'));
test('grupo: conserva grupo anterior somente com chave igual', () => {
  const ctx = businessGroupContext('Trabalho', null, 'n1');
  assert.equal(pendingBusinessGroup(ctx, { key: ctx.key, group: 'aulas' }).group, 'aulas');
  assert.equal(pendingBusinessGroup(ctx, { key: 'outro', group: 'aulas' }).group, null);
});
test('grupo: resolve com callback sem grupo informado', async () => {
  const ctx = businessGroupContext('Barbearia', null, 'n1');
  const result = await resolveBusinessGroup(ctx, async () => 'servs');
  assert.equal(result.group, 'servs');
  assert.equal(result.status, 'ready');
});
test('grupo: recusa grupo externo desconhecido', async () => {
  await assert.rejects(resolveBusinessGroup(businessGroupContext('Outro', null, 'n1'), async () => 'inventado'), /desconhecido/);
});
test('SEO: compacta caracteres em branco', () => assert.equal(normalizeSeoText(' A\n  B \t C '), 'A B C'));
test('SEO: usa nome comercial', () => assert.match(buildBusinessSeo({ nome: 'Studio X', tipo_negocio: 'barbearia', cidade: 'Campinas' }).title, /Studio X/));
test('SEO: limita tamanho', () => {
  const { title, description } = buildBusinessSeo({ nome: 'A'.repeat(120), sobre: 'B'.repeat(200) });
  assert.ok(Array.from(title).length <= SEO_TITLE_LIMIT);
  assert.ok(Array.from(description).length <= SEO_DESCRIPTION_LIMIT);
  assert.ok(description.startsWith('B'));
});
test('Vitrine pública: preserva local e publica seus dados estruturados', () => {
  const local = 'Rua A, 10 - Centro, Campinas, SP';
  const sobre = 'Atendimento personalizado.';
  const snapshot = publicBusinessSnapshot({
    slug: 'teste', nome: 'Teste', local, sobre, rua: 'Rua A', numero: '10', cidade: 'Campinas', estado: 'SP',
  });
  assert.equal(snapshot.local, local);
  assert.equal(snapshot.sobre, sobre);
  const schema = buildBusinessStructuredData(snapshot);
  assert.equal(schema.mainEntity['@type'], 'LocalBusiness');
  assert.equal(schema.mainEntity.description, sobre);
  assert.equal(schema.mainEntity.address.streetAddress, 'Rua A, 10');
});
test('reviews da Home: rejeita contagem incoerente', () => assert.throws(() => publicHomeReviewsSnapshot({ items: [{ id: 1 }], rating_count: 0 }), /Invalid/));
test('reviews da Home: limita a 12 e prepara rating', () => {
  const snap = publicHomeReviewsSnapshot({ items: Array.from({ length: 13 }, (_, i) => ({ id: i, public_name: 'Ana', rating: 5, comment: 'Ótimo' })), rating_count: 13, rating_value: 4.5 }, 'https://teste.supabase.co');
  assert.equal(snap.items.length, 12);
  assert.equal(snap.hasMore, true);
  assert.deepEqual(snap.rating, { count: 13, value: 4.5 });
  assert.deepEqual(snap.items[0].users, { nome: 'Ana' });
  assert.equal(snap.items[0].nota, 5);
  assert.equal(snap.items[0].comentario, 'Ótimo');
});
