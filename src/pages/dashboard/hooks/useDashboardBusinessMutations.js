import { useState } from 'react';
import { SEO_TITLE_LIMIT, SEO_DESCRIPTION_LIMIT, normalizeSeoText } from '../../../utils/businessSeoRules';
import { supabase } from '../../../supabase';
import { toUpperClean } from '../utils';
import {
  deleteGaleriaItem,
  enqueueGaleriaOrphanDelete,
  excluirNegocioSeguramente,
  insertGaleriaItem,
  updateNegocioInfo,
  updateNegocioLogo,
  updateNegocioTema,
} from '../api/dashboardApi';
import { convertImageToWebp, isImageFile, MEDIA_LIMITS } from '../../../utils/media';
import { normalizeBrazilPhone } from '../../../utils/phone';
import { getRequestErrorKey } from '../../../utils/requestError';
import { withAuthRetry } from '../../../utils/authSession';

export function useDashboardBusinessMutations({
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
}) {
  const [logoUploading, setLogoUploading] = useState(false);
  const [infoSaving, setInfoSaving] = useState(false);
  const [temaSaving, setTemaSaving] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [deletingBusiness, setDeletingBusiness] = useState(false);

  const cleanText = (value) => String(value || '').trim();
  const onlyDigits = (value) => cleanText(value).replace(/\D/g, '');

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

  const uploadLogoNegocio = async (file) => {
    if (!file || !userId || logoUploading) return;
    if (!(await ensureOwnerAction())) return false;
    let uploadedLogoPath = null;
    try {
      setLogoUploading(true);
      if (!isImageFile(file)) throw new Error('Formato invalido.');
      if (file.size > MEDIA_LIMITS.logoInputBytes) {
        await uiAlert('dashboard.logo_too_large', 'error', { maxMb: 3 });
        return false;
      }
      const convertedFile = await convertImageToWebp(file, { maxDimension: MEDIA_LIMITS.logoMaxDimension });
      const oldPath = negocio?.logo_path || null;
      const filePath = `${negocio.id}/logo.webp`;
      const { error: upErr } = await withAuthRetry(
        () => supabase.storage.from('logos').upload(filePath, convertedFile, { upsert: true, contentType: convertedFile.type }),
        10000,
        'logo-upload'
      );
      if (upErr) throw upErr;
      uploadedLogoPath = filePath;
      await updateNegocioLogo(negocio.id, userId, { logo_path: filePath });
      uploadedLogoPath = null;
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
      if (uploadedLogoPath) {
        try {
          const { error: queueError } = await withAuthRetry(
            () => supabase.rpc('enqueue_owned_orphan_storage_delete', {
              p_bucket: 'logos',
              p_path: uploadedLogoPath,
            }),
            6000,
            'logo-enqueue-orphan-delete'
          );
          if (queueError) throw queueError;
        } catch (queueError) {
          console.warn('Falha ao enfileirar limpeza de logo sem vinculo.', queueError);
        }
      }
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
      const seoTitle = normalizeSeoText(formInfo.meta_title);
      const seoDescription = normalizeSeoText(formInfo.meta_description);
      if (Array.from(seoTitle).length > SEO_TITLE_LIMIT || Array.from(seoDescription).length > SEO_DESCRIPTION_LIMIT) {
        await uiAlert('dashboard.business_seo_too_long', 'error');
        return false;
      }
      const payload = {
        nome: toUpperClean(formInfo.nome),
        meta_title: seoTitle || null,
        meta_description: seoDescription || null,
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
      const temaSalvo = await updateNegocioTema(negocio.id, userId, novoTema);
      setNegocio((prev) => (prev ? { ...prev, tema: temaSalvo } : prev));
      setFormInfo((prev) => ({ ...prev, tema: temaSalvo }));
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
        if (file.size > MEDIA_LIMITS.galleryInputBytes) {
          tooLargeCount += 1;
          continue;
        }

        let convertedFile = null;
        try {
          convertedFile = await convertImageToWebp(file, { maxDimension: MEDIA_LIMITS.galleryMaxDimension });
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
            const { error: removeError } = await withAuthRetry(
              () => supabase.storage.from('galerias').remove([filePath]),
              6000,
              'galeria-remove-orphan'
            );
            if (removeError) throw removeError;
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

  return {
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
  };
}
