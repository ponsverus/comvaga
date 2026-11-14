import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PLAN_CODE, normalizePlanCode, getPlanFromSearch,
  saveSelectedPlanIntent, getSelectedPlanIntent, clearSelectedPlanIntent,
} from '../../src/utils/plans.js';

test('planos: padrão profissional', () => assert.equal(DEFAULT_PLAN_CODE, 'profissional'));
test('planos: normaliza maiúsculas e espaços', () => assert.equal(normalizePlanCode(' PREMIUM '), 'premium'));
test('planos: rejeita plano desconhecido', () => assert.equal(normalizePlanCode('corporativo'), null));
test('planos: aceita parâmetro plano', () => assert.equal(getPlanFromSearch(new URLSearchParams('plano=essencial')), 'essencial'));
test('planos: aceita parâmetro legado plan', () => assert.equal(getPlanFromSearch(new URLSearchParams('plan=premium')), 'premium'));
test('planos: sem parâmetros retorna null', () => assert.equal(getPlanFromSearch(null), null));
test('planos: não salva intenção sem navegador', () => assert.equal(saveSelectedPlanIntent('premium'), null));
test('planos: sem navegador não retorna intenção', () => assert.equal(getSelectedPlanIntent(), null));
test('planos: sem navegador pode limpar sem erro', () => assert.doesNotThrow(() => clearSelectedPlanIntent()));
