
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PLAN_CODE, normalizePlanCode, getPlanFromSearch,
  saveSelectedPlanIntent, getSelectedPlanIntent, clearSelectedPlanIntent,
} from '../../src/utils/plans.js';

test('planos: plano inicial profissional', () => assert.equal(DEFAULT_PLAN_CODE, 'profissional'));
test('planos: normaliza maiúsculas e espaços', () => assert.equal(normalizePlanCode(' PREMIUM '), 'premium'));
test('planos: rejeita plano desconhecido', () => assert.equal(normalizePlanCode('corporativo'), null));
test('planos: aceita parâmetro plano', () => assert.equal(getPlanFromSearch(new URLSearchParams('plano=essencial')), 'essencial'));
test('planos: aceita parâmetro legado plan', () => assert.equal(getPlanFromSearch(new URLSearchParams('plan=premium')), 'premium'));
test('planos: sem parâmetros retorna null', () => assert.equal(getPlanFromSearch(null), null));
test('planos: tentativa de salvar escolha sem navegador retorna null', () => assert.equal(saveSelectedPlanIntent('premium'), null));
test('planos: consulta da escolha sem navegador retorna null', () => assert.equal(getSelectedPlanIntent(), null));
test('planos: sem navegador permite limpar sem erro', () => assert.doesNotThrow(() => clearSelectedPlanIntent()));
