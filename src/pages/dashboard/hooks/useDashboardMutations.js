import { useRef } from 'react';
import {
  cancelarAgendamentoProfissional,
  concluirAgendamentoProfissional,
} from '../api/dashboardApi';
import { getRequestErrorKey } from '../../../utils/requestError';
import { useDashboardBusinessMutations } from './useDashboardBusinessMutations';
import { useDashboardEntregaMutations } from './useDashboardEntregaMutations';
import { useDashboardProfessionalMutations } from './useDashboardProfessionalMutations';

export function useDashboardMutations({
  userId,
  negocio,
  businessGroup,
  parceiroProfissional,
  reloadNegocio,
  reloadProfissionais,
  reloadEntregas,
  reloadAgendamentos,
  reloadGaleria,
  loadOverview,
  navigate,
  checarPermissao,
  uiAlert,
  uiConfirm,
  setNegocio,
  setGaleriaItems,
  formInfo,
  setFormInfo,
  formEntrega,
  setFormEntrega,
  entregas,
  editingEntregaId,
  setEditingEntregaId,
  setShowNovaEntrega,
  formProfissional,
  editingProfissionalId,
  setEditingProfissionalId,
  setShowEditProfissional,
}) {
  const actionLocksRef = useRef(new Set());

  const lockAction = (key) => {
    if (actionLocksRef.current.has(key)) return false;
    actionLocksRef.current.add(key);
    return true;
  };

  const unlockAction = (key) => {
    actionLocksRef.current.delete(key);
  };

  const getBillingErrorKey = (error) => {
    const raw = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
    if (raw.includes('future_plan_professional_limit_reached')) return 'dashboard.future_plan_professional_limit_reached';
    if (raw.includes('plan_professional_limit_reached')) return 'dashboard.plan_professional_limit_reached';
    if (raw.includes('partner_plan_unavailable')) return 'dashboard.partner_plan_unavailable';
    return null;
  };

  const {
    logoUploading,
    infoSaving,
    temaSaving,
    galleryUploading,
    deletingBusiness,
    uploadLogoNegocio,
    salvarInfoNegocio,
    salvarTema,
    excluirNegocio,
    uploadGaleria,
    excluirImagemGaleria,
  } = useDashboardBusinessMutations({
    userId,
    negocio,
    parceiroProfissional,
    reloadNegocio,
    reloadGaleria,
    navigate,
    uiAlert,
    uiConfirm,
    setNegocio,
    setGaleriaItems,
    formInfo,
    setFormInfo,
    lockAction,
    unlockAction,
  });

  const {
    submittingEntrega,
    createEntrega,
    updateEntrega,
    deleteEntrega,
    toggleStatusEntrega,
  } = useDashboardEntregaMutations({
    negocio,
    businessGroup,
    reloadEntregas,
    checarPermissao,
    uiAlert,
    uiConfirm,
    formEntrega,
    setFormEntrega,
    entregas,
    editingEntregaId,
    setEditingEntregaId,
    setShowNovaEntrega,
    lockAction,
    unlockAction,
    getBillingErrorKey,
  });

  const {
    submittingProfissional,
    submittingAdminProf,
    cadastrarAdminComoProfissional,
    toggleStatusProfissional,
    excluirProfissional,
    updateProfissional,
    aprovarParceiro,
  } = useDashboardProfessionalMutations({
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
  });

  const confirmarAtendimento = async (a) => {
    const lockKey = `agendamento-confirmar:${a?.id || 'item'}`;
    if (!lockAction(lockKey)) return;
    if (!await checarPermissao(a.profissional_id)) {
      unlockAction(lockKey);
      return;
    }
    try {
      await concluirAgendamentoProfissional(a.id);
      await uiAlert('dashboard.booking_confirmed', 'success');
      await reloadAgendamentos();
      await loadOverview(negocio.id, undefined, undefined, undefined, parceiroProfissional?.id ?? null, { silent: true });
    } catch (error) {
      const requestKey = getRequestErrorKey(error);
      if (requestKey) await uiAlert(requestKey, 'warning');
      else await uiAlert('dashboard.booking_confirm_error', 'error');
    } finally {
      unlockAction(lockKey);
    }
  };

  const cancelarAgendamento = async (a) => {
    const lockKey = `agendamento-cancelar:${a?.id || 'item'}`;
    if (!lockAction(lockKey)) return;
    if (!await checarPermissao(a.profissional_id)) {
      unlockAction(lockKey);
      return;
    }
    const ok = await uiConfirm('dashboard.booking_cancel_confirm', 'warning');
    if (!ok) {
      unlockAction(lockKey);
      return;
    }
    try {
      await cancelarAgendamentoProfissional(a.id);
      await uiAlert('dashboard.booking_canceled', 'error');
      await reloadAgendamentos();
      await loadOverview(negocio.id, undefined, undefined, undefined, parceiroProfissional?.id ?? null, { silent: true });
    } catch (error) {
      const requestKey = getRequestErrorKey(error);
      if (requestKey) await uiAlert(requestKey, 'warning');
      else await uiAlert('dashboard.booking_cancel_error', 'error');
    } finally {
      unlockAction(lockKey);
    }
  };

  return {
    logoUploading,
    infoSaving,
    temaSaving,
    galleryUploading,
    submittingEntrega,
    submittingProfissional,
    submittingAdminProf,
    deletingBusiness,
    cadastrarAdminComoProfissional,
    uploadLogoNegocio,
    salvarInfoNegocio,
    salvarTema,
    excluirNegocio,
    uploadGaleria,
    excluirImagemGaleria,
    createEntrega,
    updateEntrega,
    deleteEntrega,
    toggleStatusEntrega,
    toggleStatusProfissional,
    excluirProfissional,
    updateProfissional,
    aprovarParceiro,
    confirmarAtendimento,
    cancelarAgendamento,
  };
}
