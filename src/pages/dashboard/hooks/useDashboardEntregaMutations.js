import { useState } from 'react';
import { toNumberOrNull, toUpperClean } from '../utils';
import {
  ativarEntregaSeguramente,
  excluirEntregaSeguramente,
  inativarEntregaSeguramente,
  insertEntrega,
  updateEntregaById,
} from '../api/dashboardApi';
import { getRequestErrorKey } from '../../../utils/requestError';

export function useDashboardEntregaMutations({
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
}) {
  const [submittingEntrega, setSubmittingEntrega] = useState(false);

  const isEntregaDuplicateNameError = (error) => {
    const raw = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
    return raw.includes('23505')
      || raw.includes('ux_entregas_ativas_profissional_nome_normalizado')
      || raw.includes('duplicate key');
  };

  const resetEntregaForm = () => {
    setShowNovaEntrega(false);
    setEditingEntregaId(null);
    setFormEntrega({ nome: '', duracao_minutos: '', preco: '', preco_promocional: '', profissional_id: '' });
  };

  const createEntrega = async (e) => {
    e.preventDefault();
    if (submittingEntrega || !businessGroup) return;
    try {
      setSubmittingEntrega(true);
      if (!negocio?.id) throw new Error('Erro ao carregar o negocio');
      const profId = formEntrega.profissional_id;
      if (!await checarPermissao(profId)) return;
      const preco = toNumberOrNull(formEntrega.preco);
      const promo = toNumberOrNull(formEntrega.preco_promocional);
      if (preco == null) throw new Error('Preco invalido.');
      if (promo != null && promo >= preco) throw new Error('Preco de oferta deve ser menor.');
      const payload = {
        nome: toUpperClean(formEntrega.nome),
        profissional_id: profId,
        duracao_minutos: toNumberOrNull(formEntrega.duracao_minutos),
        preco,
        preco_promocional: promo,
        ativo: true,
        negocio_id: negocio.id,
      };
      if (!payload.nome) throw new Error('Nome da entrega e obrigatorio.');
      if (!payload.profissional_id) throw new Error('Selecione um profissional.');
      if (!payload.duracao_minutos) throw new Error('Duracao invalida.');
      await insertEntrega(payload);
      await uiAlert(`dashboard.business.${businessGroup}.entrega_created`, 'success');
      resetEntregaForm();
      await reloadEntregas(negocio.id, [profId]);
    } catch (e2) {
      const billingKey = getBillingErrorKey(e2);
      const msg = String(e2?.message || '');
      if (billingKey) await uiAlert(billingKey, 'warning');
      else if (isEntregaDuplicateNameError(e2)) await uiAlert(`dashboard.business.${businessGroup}.entrega_duplicate_name`, 'warning');
      else if (msg.includes('oferta')) await uiAlert('dashboard.entrega_promo_invalid', 'error');
      else if (msg.includes('invalido')) await uiAlert('dashboard.entrega_price_invalid', 'error');
      else if (msg.includes('Duracao')) await uiAlert('dashboard.entrega_duration_invalid', 'error');
      else if (msg.includes('Selecione')) await uiAlert(`dashboard.business.${businessGroup}.entrega_prof_required`, 'error');
      else await uiAlert(`dashboard.business.${businessGroup}.entrega_create_error`, 'error');
    } finally {
      setSubmittingEntrega(false);
    }
  };

  const updateEntrega = async (e) => {
    e.preventDefault();
    if (submittingEntrega || !businessGroup) return;
    try {
      setSubmittingEntrega(true);
      const profId = formEntrega.profissional_id;
      if (!await checarPermissao(profId)) return;
      const preco = toNumberOrNull(formEntrega.preco);
      const promo = toNumberOrNull(formEntrega.preco_promocional);
      if (!toUpperClean(formEntrega.nome)) throw new Error('Nome da entrega e obrigatorio.');
      if (!profId) throw new Error('Selecione um profissional.');
      if (!toNumberOrNull(formEntrega.duracao_minutos)) throw new Error('Duracao invalida.');
      if (preco == null) throw new Error('Preco invalido.');
      if (promo != null && promo >= preco) throw new Error('Preco de oferta deve ser menor.');
      const payload = {
        nome: toUpperClean(formEntrega.nome),
        duracao_minutos: toNumberOrNull(formEntrega.duracao_minutos),
        preco,
        preco_promocional: promo,
        profissional_id: profId,
      };
      const entregaAtual = (entregas || []).find((item) => item.id === editingEntregaId);
      const mudouProfissional = entregaAtual?.profissional_id && entregaAtual.profissional_id !== profId;

      if (mudouProfissional) {
        await insertEntrega({ ...payload, ativo: true, negocio_id: negocio.id });
        await uiAlert(`dashboard.business.${businessGroup}.entrega_created`, 'success');
      } else {
        await updateEntregaById(editingEntregaId, negocio.id, payload);
        await uiAlert(`dashboard.business.${businessGroup}.entrega_updated`, 'success');
      }
      resetEntregaForm();
      await reloadEntregas(
        negocio.id,
        mudouProfissional ? [entregaAtual.profissional_id, profId].filter(Boolean) : [profId]
      );
    } catch (e2) {
      const billingKey = getBillingErrorKey(e2);
      const msg = String(e2?.message || '');
      if (billingKey) await uiAlert(billingKey, 'warning');
      else if (isEntregaDuplicateNameError(e2)) await uiAlert(`dashboard.business.${businessGroup}.entrega_duplicate_name`, 'warning');
      else if (msg.includes('oferta')) await uiAlert('dashboard.entrega_promo_invalid', 'error');
      else if (msg.includes('invalido')) await uiAlert('dashboard.entrega_price_invalid', 'error');
      else if (msg.includes('Duracao')) await uiAlert('dashboard.entrega_duration_invalid', 'error');
      else if (msg.includes('Selecione')) await uiAlert(`dashboard.business.${businessGroup}.entrega_prof_required`, 'error');
      else await uiAlert(`dashboard.business.${businessGroup}.entrega_update_error`, 'error');
    } finally {
      setSubmittingEntrega(false);
    }
  };

  const deleteEntrega = async (entrega) => {
    if (!businessGroup) return;
    const lockKey = `entrega-delete:${entrega?.id || 'item'}`;
    if (!lockAction(lockKey)) return;
    if (!await checarPermissao(entrega.profissional_id)) {
      unlockAction(lockKey);
      return;
    }
    const ok = await uiConfirm(`dashboard.business.${businessGroup}.entrega_delete_confirm`, 'warning');
    if (!ok) {
      unlockAction(lockKey);
      return;
    }
    try {
      await excluirEntregaSeguramente(entrega.id);
      await uiAlert(`dashboard.business.${businessGroup}.entrega_deleted`, 'success');
      await reloadEntregas(negocio.id, [entrega.profissional_id]);
    } catch (error) {
      const requestKey = getRequestErrorKey(error, {
        entregaFutureBookingsKey: `dashboard.business.${businessGroup}.entrega_future_bookings_blocked`,
      });
      if (requestKey) await uiAlert(requestKey, 'warning');
      else await uiAlert(`dashboard.business.${businessGroup}.entrega_delete_error`, 'error');
    } finally {
      unlockAction(lockKey);
    }
  };

  const toggleStatusEntrega = async (entrega) => {
    if (!businessGroup) return;
    const lockKey = `entrega-status:${entrega?.id || 'item'}`;
    if (!lockAction(lockKey)) return;
    if (!await checarPermissao(entrega.profissional_id)) {
      unlockAction(lockKey);
      return;
    }
    try {
      if (entrega.ativo) {
        await inativarEntregaSeguramente(entrega.id);
        await uiAlert(`dashboard.business.${businessGroup}.entrega_inactivated`, 'success');
      } else {
        await ativarEntregaSeguramente(entrega.id);
        await uiAlert(`dashboard.business.${businessGroup}.entrega_activated`, 'success');
      }
      await reloadEntregas(negocio.id, [entrega.profissional_id]);
    } catch (error) {
      const requestKey = getRequestErrorKey(error, {
        entregaFutureBookingsKey: `dashboard.business.${businessGroup}.entrega_future_bookings_blocked`,
      });
      if (requestKey) await uiAlert(requestKey, 'warning');
      else await uiAlert(`dashboard.business.${businessGroup}.entrega_toggle_error`, 'error');
    } finally {
      unlockAction(lockKey);
    }
  };

  return {
    submittingEntrega,
    createEntrega,
    updateEntrega,
    deleteEntrega,
    toggleStatusEntrega,
  };
}
