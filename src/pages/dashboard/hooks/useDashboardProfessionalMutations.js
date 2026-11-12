import { useState } from 'react';
import { getDiasTrabalhoFromHorarios, timeToMinutes, toUpperClean } from '../utils';
import {
  aprovarParceiroProfissional,
  excluirProfissionalParceiroSeguramente,
  fetchUserNome,
  insertProfissional,
  updateProfissionalComHorarios,
  updateProfissionalStatus,
} from '../api/dashboardApi';
import { getRequestErrorKey } from '../../../utils/requestError';

export function useDashboardProfessionalMutations({
  userId,
  negocio,
  parceiroProfissional,
  reloadProfissionais,
  reloadEntregas,
  checarPermissao,
  uiAlert,
  uiConfirm,
  formProfissional,
  editingProfissionalId,
  setEditingProfissionalId,
  setShowEditProfissional,
  lockAction,
  unlockAction,
  getBillingErrorKey,
}) {
  const [submittingProfissional, setSubmittingProfissional] = useState(false);
  const [submittingAdminProf, setSubmittingAdminProf] = useState(false);

  const cadastrarAdminComoProfissional = async () => {
    if (!negocio?.id || !userId || submittingAdminProf) return;
    try {
      setSubmittingAdminProf(true);
      const userData = await fetchUserNome(userId);
      const nome = String(userData?.nome || '').trim() || 'PROFISSIONAL';
      await insertProfissional({
        negocio_id: negocio.id,
        user_id: userId,
        nome,
        status: 'ativo',
      });
      await uiAlert('dashboard.professional_updated', 'success');
      await reloadProfissionais();
    } catch (err) {
      const billingKey = getBillingErrorKey(err);
      if (billingKey) await uiAlert(billingKey, 'warning');
      else await uiAlert('dashboard.professional_update_error', 'error');
    } finally {
      setSubmittingAdminProf(false);
    }
  };

  const toggleStatusProfissional = async (p) => {
    const lockKey = `profissional-status:${p?.id || 'item'}`;
    if (!lockAction(lockKey)) return;
    if (!await checarPermissao(p.id)) {
      unlockAction(lockKey);
      return;
    }
    try {
      const novoStatus = p.status === 'ativo' ? 'inativo' : 'ativo';
      if (novoStatus === 'inativo') {
        const confirmed = await uiConfirm('dashboard.professional_inactivate_confirm', 'warning');
        if (!confirmed) return;
      }
      await updateProfissionalStatus(
        p.id,
        negocio.id,
        novoStatus
      );
      await uiAlert(novoStatus === 'ativo' ? 'dashboard.professional_activated' : 'dashboard.professional_inactivated', 'success');
      await reloadProfissionais();
    } catch (error) {
      const msg = String(error?.message || '');
      if (msg.includes('profissional_agendamentos_futuros_bloqueados')) {
        await uiAlert('dashboard.professional_future_bookings_blocked', 'warning');
      } else {
        await uiAlert('dashboard.professional_toggle_error', 'error');
      }
    } finally {
      unlockAction(lockKey);
    }
  };

  const excluirProfissional = async (p) => {
    const lockKey = `profissional-delete:${p?.id || 'item'}`;
    if (!lockAction(lockKey)) return;
    if (!await checarPermissao(p.id)) {
      unlockAction(lockKey);
      return;
    }
    const isSelfProfessional = Boolean(p?.user_id && p.user_id === userId && negocio?.owner_id === userId);
    const ok = await uiConfirm(
      isSelfProfessional ? 'dashboard.professional_self_delete_confirm' : 'dashboard.professional_delete_confirm',
      'warning'
    );
    if (!ok) {
      unlockAction(lockKey);
      return;
    }
    try {
      await excluirProfissionalParceiroSeguramente(p.id);
      await uiAlert(isSelfProfessional ? 'dashboard.professional_self_deleted' : 'dashboard.professional_deleted', 'success');
      const profs = await reloadProfissionais();
      if (profs?.length) await reloadEntregas(negocio.id, profs.map((item) => item.id));
      else await reloadEntregas(negocio.id, []);
    } catch (error) {
      const requestKey = getRequestErrorKey(error);
      const msg = String(error?.message || '');
      if (msg.includes('profissional_agendamentos_futuros_bloqueados')) await uiAlert('dashboard.professional_future_bookings_blocked', 'warning');
      else if (requestKey) await uiAlert(requestKey, 'warning');
      else await uiAlert('dashboard.professional_delete_error', 'error');
    } finally {
      unlockAction(lockKey);
    }
  };

  const updateProfissional = async (e) => {
    e.preventDefault();
    if (submittingProfissional) return;
    try {
      setSubmittingProfissional(true);
      if (!await checarPermissao(editingProfissionalId)) return;
      const horarios = Array.isArray(formProfissional.horarios) ? formProfissional.horarios : [];
      const diasAtivos = getDiasTrabalhoFromHorarios(horarios);
      if (!diasAtivos.length) throw new Error('profissional_horarios_sem_dia_ativo');
      for (const h of horarios) {
        if (h.ativo === false) continue;
        const inicio = timeToMinutes(h.horario_inicio);
        const fim = timeToMinutes(h.horario_fim);
        const pausaInicio = h.pausa_inicio ? timeToMinutes(h.pausa_inicio) : null;
        const pausaFim = h.pausa_fim ? timeToMinutes(h.pausa_fim) : null;
        if (!Number.isFinite(inicio) || !Number.isFinite(fim) || inicio >= fim) throw new Error('profissional_horarios_invalidos');
        if ((pausaInicio == null) !== (pausaFim == null)) throw new Error('profissional_horarios_invalidos');
        if (pausaInicio != null && (pausaInicio >= pausaFim || pausaInicio < inicio || pausaFim > fim)) throw new Error('profissional_horarios_invalidos');
      }
      const payload = {
        nome: String(formProfissional.nome || '').trim(),
        profissao: toUpperClean(formProfissional.profissao) || null,
        anos_experiencia: formProfissional.anos_experiencia !== '' ? Number(formProfissional.anos_experiencia) : null,
        horarios: horarios.map((h) => ({
          dia_semana: Number(h.dia_semana),
          ativo: h.ativo !== false,
          horario_inicio: h.horario_inicio || '08:00',
          horario_fim: h.horario_fim || '18:00',
          pausa_inicio: h.pausa_inicio || null,
          pausa_fim: h.pausa_fim || null,
        })),
      };
      if (!payload.nome) throw new Error('Nome obrigatorio.');
      await updateProfissionalComHorarios(editingProfissionalId, payload);
      await uiAlert('dashboard.professional_updated', 'success');
      setShowEditProfissional(false);
      setEditingProfissionalId(null);
      await reloadProfissionais();
    } catch (e) {
      const msg = String(e?.message || '');
      if (msg.includes('profissional_horarios_invalidos') || msg.includes('profissional_horarios_sem_dia_ativo')) await uiAlert('dashboard.professional_update_error', 'error');
      else if (msg.includes('profissional_pausa_bloqueada')) await uiAlert('dashboard.professional_pausa_blocked', 'error');
      else if (msg.includes('profissional_dia_bloqueado')) await uiAlert('dashboard.professional_dia_blocked', 'error');
      else if (msg.includes('profissional_horario_bloqueado') || msg.includes('profissional_expediente_bloqueado')) await uiAlert('dashboard.professional_schedule_blocked', 'error');
      else await uiAlert('dashboard.professional_update_error', 'error');
    } finally {
      setSubmittingProfissional(false);
    }
  };

  const aprovarParceiro = async (prof) => {
    const lockKey = `parceiro-aprovar:${prof?.id || 'item'}`;
    if (!lockAction(lockKey)) return;
    if (parceiroProfissional) {
      await uiAlert('dashboard.parceiro_acao_proibida', 'warning');
      unlockAction(lockKey);
      return;
    }
    try {
      await aprovarParceiroProfissional(prof.id, negocio.id);
      await uiAlert('dashboard.professional_approved', 'success');
      await reloadProfissionais();
    } catch (err) {
      const billingKey = getBillingErrorKey(err);
      const requestKey = getRequestErrorKey(err);
      if (billingKey) await uiAlert(billingKey, 'warning');
      else if (requestKey) await uiAlert(requestKey, 'warning');
      else await uiAlert('dashboard.partner_approve_error', 'error');
    } finally {
      unlockAction(lockKey);
    }
  };

  return {
    submittingProfissional,
    submittingAdminProf,
    cadastrarAdminComoProfissional,
    toggleStatusProfissional,
    excluirProfissional,
    updateProfissional,
    aprovarParceiro,
  };
}
