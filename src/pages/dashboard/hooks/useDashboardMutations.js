import { useRef, useState } from 'react';
import { supabase } from '../../../supabase';
import { getDiasTrabalhoFromHorarios, timeToMinutes, toNumberOrNull, toUpperClean } from '../utils';
import {
  ativarEntregaSeguramente,
  aprovarParceiroProfissional,
  cancelarAgendamentoProfissional,
  concluirAgendamentoProfissional,
  deleteGaleriaItem,
  enqueueGaleriaOrphanDelete,
  inativarEntregaSeguramente,
  insertEntrega,
  insertGaleriaItem,
  insertProfissional,
  excluirEntregaSeguramente,
  excluirNegocioSeguramente,
  excluirProfissionalParceiroSeguramente,
  updateEntregaById,
  updateNegocioInfo,
  updateNegocioLogo,
  updateNegocioTema,
  updateProfissionalComHorarios,
  updateProfissionalStatus,
  fetchUserNome,
} from '../api/dashboardApi';
import { convertImageToWebp, isImageFile } from '../../../utils/media';
import { normalizeBrazilPhone } from '../../../utils/phone';
import { getRequestErrorKey } from '../../../utils/requestError';
import { withAuthRetry } from '../../../utils/authSession';

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
  uiPrompt,
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
  const [logoUploading, setLogoUploading] = useState(false);
  const [infoSaving, setInfoSaving] = useState(false);
  const [temaSaving, setTemaSaving] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [submittingEntrega, setSubmittingEntrega] = useState(false);
  const [submittingProfissional, setSubmittingProfissional] = useState(false);
  const [submittingAdminProf, setSubmittingAdminProf] = useState(false);
  const [deletingBusiness, setDeletingBusiness] = useState(false);
  const actionLocksRef = useRef(new Set());

  const lockAction = (key) => {
    if (actionLocksRef.current.has(key)) return false;
    actionLocksRef.current.add(key);
    return true;
  };

  const unlockAction = (key) => {
    actionLocksRef.current.delete(key);
  };

  const cleanText = (value) => String(value || '').trim();
  const onlyDigits = (value) => cleanText(value).replace(/\D/g, '');

  const isEntregaDuplicateNameError = (error) => {
    const raw = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
    return raw.includes('23505')
      || raw.includes('ux_entregas_ativas_profissional_nome_normalizado')
      || raw.includes('duplicate key');
  };

  const getBillingErrorKey = (error) => {
    const raw = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
    if (raw.includes('future_plan_professional_limit_reached')) return 'dashboard.future_plan_professional_limit_reached';
    if (raw.includes('plan_professional_limit_reached')) return 'dashboard.plan_professional_limit_reached';
    if (raw.includes('partner_plan_unavailable')) return 'dashboard.partner_plan_unavailable';
    return null;
  };

  const ensureOwnerAction = async () => {
    if (!negocio?.id) {
      await uiAlert('alerts.business_not_loaded', 'error');
      return false;
    }
    if (parceiroProfissional) {
      await uiAlert('dashboard.parceiro_acao_proibida', 'warning');
      return false;
    }
    return true;
  };

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

  const uploadLogoNegocio = async (file) => {
    if (!file || !userId || logoUploading) return;
    if (!(await ensureOwnerAction())) return false;
    try {
      setLogoUploading(true);
      if (!isImageFile(file)) throw new Error('Formato invalido.');
      const convertedFile = await convertImageToWebp(file);
      const oldPath = negocio?.logo_path || null;
      const filePath = `${negocio.id}/logo.webp`;
      const { error: upErr } = await withAuthRetry(
        () => supabase.storage.from('logos').upload(filePath, convertedFile, { upsert: true, contentType: convertedFile.type }),
        10000,
        'logo-upload'
      );
      if (upErr) throw upErr;
      await updateNegocioLogo(negocio.id, userId, { logo_path: filePath });
      if (oldPath && String(oldPath).replace(/^logos\//, '') !== filePath) {
        const normalizedOldPath = String(oldPath).replace(/^logos\//, '');
        try {
          await withAuthRetry(
            () => supabase.storage.from('logos').remove([normalizedOldPath]),
            6000,
            'logo-remove-old'
          );
        } catch (removeError) {
          console.warn('Falha ao remover logo antigo imediatamente; limpeza ja foi enfileirada pelo banco.', removeError);
        }
      }
      await uiAlert('dashboard.logo_updated', 'success');
      await reloadNegocio();
      return true;
    } catch {
      await uiAlert('dashboard.logo_update_error', 'error');
    } finally {
      setLogoUploading(false);
    }
  };

  const salvarInfoNegocio = async () => {
    if (infoSaving) return false;
    if (!(await ensureOwnerAction())) return false;
    try {
      setInfoSaving(true);
      const telefone = normalizeBrazilPhone(formInfo.telefone);
      if (telefone === null) {
        await uiAlert('dashboard.business_phone_invalid', 'error');
        return false;
      }
      const descricao = String(formInfo.descricao || '').trim();
      if (descricao.length > 150) {
        await uiAlert('dashboard.business_description_too_long', 'error');
        return false;
      }
      const payload = {
        nome: toUpperClean(formInfo.nome),
        descricao,
        telefone: telefone || null,
        endereco_cep: onlyDigits(formInfo.endereco_cep) || null,
        endereco_rua: cleanText(formInfo.endereco_rua) || null,
        endereco_numero: cleanText(formInfo.endereco_numero) || null,
        endereco_complemento: cleanText(formInfo.endereco_complemento) || null,
        endereco_bairro: cleanText(formInfo.endereco_bairro) || null,
        endereco_cidade: cleanText(formInfo.endereco_cidade) || null,
        endereco_estado: cleanText(formInfo.endereco_estado).toUpperCase() || null,
        instagram: String(formInfo.instagram || '').trim() || null,
        facebook: String(formInfo.facebook || '').trim() || null,
        tema: formInfo.tema || 'dark',
      };
      await updateNegocioInfo(negocio.id, userId, payload);
      await uiAlert('dashboard.business_info_updated', 'success');
      await reloadNegocio();
      return true;
    } catch {
      await uiAlert('dashboard.business_info_update_error', 'error');
      return false;
    } finally {
      setInfoSaving(false);
    }
  };

  const salvarTema = async (novoTema) => {
    if (temaSaving) return;
    if (!(await ensureOwnerAction())) return false;
    setFormInfo((prev) => ({ ...prev, tema: novoTema }));
    try {
      setTemaSaving(true);
      await updateNegocioTema(negocio.id, userId, novoTema);
      setNegocio((prev) => (prev ? { ...prev, tema: novoTema } : prev));
    } catch {
      setFormInfo((prev) => ({ ...prev, tema: negocio?.tema || 'dark' }));
      await uiAlert('dashboard.business_info_update_error', 'error');
      return false;
    } finally {
      setTemaSaving(false);
    }
  };

  const excluirNegocio = async () => {
    if (deletingBusiness) return;
    if (!(await ensureOwnerAction())) return false;
    const ok = await uiConfirm('dashboard.business_delete_confirm', 'warning');
    if (!ok) return;
    try {
      setDeletingBusiness(true);
      const result = await excluirNegocioSeguramente(negocio.id);
      await uiAlert('dashboard.business_deleted', 'success');

      const remaining = Number(result?.remaining_owner_businesses || 0);

      if (remaining > 1) {
        navigate('/selecionar-negocio', { replace: true });
        return;
      }

      if (remaining === 1) {
        navigate('/dashboard', { replace: true });
        return;
      }

      navigate('/conta-profissional', { replace: true });
    } catch (error) {
      const raw = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
      if (raw.includes('business_subscription_active') || raw.includes('subscription_active_before_business_delete')) {
        await uiAlert('dashboard.business_delete_plan_active', 'warning');
        return;
      }
      if (raw.includes('business_future_bookings_blocked')) {
        await uiAlert('dashboard.business_delete_future_bookings', 'warning');
        return;
      }
      const requestKey = getRequestErrorKey(error);
      if (requestKey) await uiAlert(requestKey, 'warning');
      else await uiAlert('dashboard.business_delete_error', 'error');
    } finally {
      setDeletingBusiness(false);
    }
  };

  const uploadGaleria = async (files) => {
    if (!files?.length || galleryUploading) return;
    if (!(await ensureOwnerAction())) return false;
    try {
      setGalleryUploading(true);
      const selectedFiles = Array.from(files);
      let addedCount = 0;
      let invalidFormatCount = 0;
      let tooLargeCount = 0;
      let failedCount = 0;

      for (const file of selectedFiles) {
        if (!isImageFile(file)) {
          invalidFormatCount += 1;
          continue;
        }
        if (file.size > 4 * 1024 * 1024) {
          tooLargeCount += 1;
          continue;
        }

        let convertedFile = null;
        try {
          convertedFile = await convertImageToWebp(file);
        } catch {
          failedCount += 1;
          continue;
        }

        const filePath = `${negocio.id}/${crypto.randomUUID()}.webp`;
        let uploaded = false;
        try {
          const { error: upErr } = await withAuthRetry(
            () => supabase.storage.from('galerias').upload(filePath, convertedFile, { upsert: true, contentType: convertedFile.type }),
            10000,
            'galeria-upload'
          );
          if (upErr) throw upErr;
          uploaded = true;
          await insertGaleriaItem(negocio.id, filePath);
          addedCount += 1;
        } catch (uploadError) {
          failedCount += 1;
          if (!uploaded) continue;
          try {
            await withAuthRetry(
              () => supabase.storage.from('galerias').remove([filePath]),
              6000,
              'galeria-remove-orphan'
            );
          } catch (removeError) {
            try {
              await enqueueGaleriaOrphanDelete(negocio.id, filePath);
            } catch (queueError) {
              console.warn('Falha ao enfileirar limpeza de imagem orfa da galeria.', queueError || removeError || uploadError);
            }
          }
        }
      }

      if (addedCount > 0) await reloadGaleria();

      const rejectedCount = invalidFormatCount + tooLargeCount + failedCount;
      if (addedCount > 0 && rejectedCount > 0) {
        await uiAlert('dashboard.gallery_partial_upload', 'warning');
      } else if (addedCount > 0) {
        await uiAlert('dashboard.gallery_updated', 'success');
      } else if (invalidFormatCount > 0 && tooLargeCount === 0 && failedCount === 0) {
        await uiAlert('dashboard.gallery_invalid_format', 'error');
      } else if (tooLargeCount > 0 && invalidFormatCount === 0 && failedCount === 0) {
        await uiAlert('dashboard.gallery_too_large', 'error');
      } else if (failedCount > 0 && invalidFormatCount === 0 && tooLargeCount === 0) {
        await uiAlert('dashboard.gallery_upload_error', 'error');
      } else {
        await uiAlert('dashboard.gallery_no_images_added', 'error');
      }
    } catch {
      await uiAlert('dashboard.gallery_update_error', 'error');
    } finally {
      setGalleryUploading(false);
    }
  };

  const excluirImagemGaleria = async (item) => {
    const lockKey = `galeria-excluir:${item?.id || item?.path || 'item'}`;
    if (!lockAction(lockKey)) return;
    if (!(await ensureOwnerAction())) {
      unlockAction(lockKey);
      return;
    }
    const ok = await uiConfirm('dashboard.gallery_delete_confirm', 'warning');
    if (!ok) {
      unlockAction(lockKey);
      return;
    }
    try {
      await deleteGaleriaItem(item.id);
      setGaleriaItems((prev) => prev.filter((x) => x.id !== item.id));
      await uiAlert('dashboard.gallery_image_deleted', 'success');
    } catch {
      await uiAlert('dashboard.gallery_delete_error', 'error');
    } finally {
      unlockAction(lockKey);
    }
  };

  const resetEntregaForm = () => {
    setShowNovaEntrega(false);
    setEditingEntregaId(null);
    setFormEntrega({ nome: '', duracao_minutos: '', preco: '', preco_promocional: '', profissional_id: '' });
  };

  const createEntrega = async (e) => {
    e.preventDefault();
    if (submittingEntrega) return;
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
    if (submittingEntrega) return;
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

  const toggleStatusProfissional = async (p) => {
    const lockKey = `profissional-status:${p?.id || 'item'}`;
    if (!lockAction(lockKey)) return;
    if (!await checarPermissao(p.id)) {
      unlockAction(lockKey);
      return;
    }
    try {
      const novoStatus = p.status === 'ativo' ? 'inativo' : 'ativo';
      let motivo = null;
      if (novoStatus === 'inativo') {
        const r = await uiPrompt('dashboard.professional_inactivate_reason', { variant: 'warning' });
        if (r === null) return;
        motivo = r || null;
      }
      await updateProfissionalStatus(
        p.id,
        negocio.id,
        novoStatus,
        novoStatus === 'ativo' ? null : motivo
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
        const almocoInicio = h.almoco_inicio ? timeToMinutes(h.almoco_inicio) : null;
        const almocoFim = h.almoco_fim ? timeToMinutes(h.almoco_fim) : null;
        if (!Number.isFinite(inicio) || !Number.isFinite(fim) || inicio >= fim) throw new Error('profissional_horarios_invalidos');
        if ((almocoInicio == null) !== (almocoFim == null)) throw new Error('profissional_horarios_invalidos');
        if (almocoInicio != null && (almocoInicio >= almocoFim || almocoInicio < inicio || almocoFim > fim)) throw new Error('profissional_horarios_invalidos');
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
          almoco_inicio: h.almoco_inicio || null,
          almoco_fim: h.almoco_fim || null,
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
      else if (msg.includes('profissional_almoco_bloqueado')) await uiAlert('dashboard.professional_almoco_blocked', 'error');
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
