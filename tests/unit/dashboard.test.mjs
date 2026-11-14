import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PROFISSIONAL_HORARIOS, normalizeProfissionalHorarios, getHorarioPorDia,
  getDiasTrabalhoFromHorarios, formatHorariosResumo, timeToMinutes,
  toNumberOrNull, compareAgendamentoDateTimeDesc, normalizeStatus,
  isCancelStatus, isDoneStatus, isCancellationScheduled, isScheduledDowngradeSync,
} from '../../src/pages/dashboard/utils.js';

test('dashboard: horários padrão têm 7 dias', () => assert.equal(DEFAULT_PROFISSIONAL_HORARIOS.length, 7));
test('dashboard: horário padrão só ativa dias úteis', () => assert.deepEqual(getDiasTrabalhoFromHorarios(DEFAULT_PROFISSIONAL_HORARIOS), [1, 2, 3, 4, 5]));
test('dashboard: normaliza intervalos', () => {
  const horarios = normalizeProfissionalHorarios({ horarios: [{ dia_semana: 1, ativo: true, horario_inicio: '09:30:00', horario_fim: '17:30:00' }] });
  assert.equal(getHorarioPorDia(horarios, 1).horario_inicio, '09:30');
  assert.equal(horarios.length, 7);
});
test('dashboard: ignora dia inexistente', () => assert.equal(getHorarioPorDia([], 9), null));
test('dashboard: resumo sem dias ativos', () => assert.equal(formatHorariosResumo([]), 'Sem dias ativos'));
test('dashboard: converte horário para minutos', () => assert.equal(timeToMinutes('09:45'), 585));
test('dashboard: arredonda valor monetário a centavos', () => assert.equal(toNumberOrNull('10.257'), 10.26));
test('dashboard: valor vazio vira null', () => assert.equal(toNumberOrNull(''), null));
test('dashboard: compara agendamentos por hora decrescente', () => {
  const a = { id: 'a', data: '2026-01-01', horario_inicio: '09:00' };
  const b = { id: 'b', data: '2026-01-01', horario_inicio: '10:00' };
  assert.ok(compareAgendamentoDateTimeDesc(a, b) > 0);
});
test('dashboard: status sem acento', () => assert.equal(normalizeStatus(' CONCLUÍDO '), 'concluido'));
test('dashboard: identifica cancelamento e conclusão', () => { assert.equal(isCancelStatus('CANCELADO_CLIENTE'), true); assert.equal(isDoneStatus('Concluído'), true); });
test('dashboard: cancelamento programado', () => assert.equal(isCancellationScheduled({ cancellation_scheduled: true }), true));
test('dashboard: downgrade pendente exige todos os campos', () => {
  assert.equal(isScheduledDowngradeSync({ plan_change_scheduled: true, pending_plan_change_type: 'downgrade', provider_sync_operation: 'apply_downgrade', provider_sync_status: 'pending' }), true);
  assert.equal(isScheduledDowngradeSync({ plan_change_scheduled: true }), false);
});
