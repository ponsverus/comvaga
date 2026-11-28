import { supabase } from '../../supabase';
import { withAuthRetry } from '../../utils/authSession';
import { mapBusinessRow } from '../../api/negociosApi';

export async function createOwnerBusiness({ nomeNegocio, slug, telefone, tipoNegocio, formData }) {
  return withAuthRetry(() => supabase.rpc('create_owner_business', {
    p_nome_negocio: nomeNegocio,
    p_slug: slug,
    p_telefone: telefone,
    p_tipo_negocio: tipoNegocio,
    p_cep: formData.cep,
    p_rua: formData.rua,
    p_numero: formData.numero,
    p_complemento: formData.complemento,
    p_bairro: formData.bairro,
    p_cidade: formData.cidade,
    p_estado: formData.estado,
  }), 8000, 'create-owner-business');
}

export async function fetchOwnerResumeData(userId) {
  const [userResult, negociosResult] = await Promise.all([
    withAuthRetry(
      () => supabase.from('users').select('name').eq('id', userId).maybeSingle(),
      6000,
      'resume-user-profile'
    ),
    withAuthRetry(
      () => supabase.from('businesses')
        .select('id, name, slug, business_type, phone, zip_code, street, number, complement, neighborhood, city, state, created_at')
        .eq('owner_id', userId)
        .order('created_at', { ascending: true }),
      6000,
      'resume-businesses'
    ),
  ]);
  if (userResult.error) throw userResult.error;
  if (negociosResult.error) throw negociosResult.error;
  return { userData: userResult.data, negocioRows: (negociosResult.data || []).map(mapBusinessRow) };
}

export async function completeOwnerBusinessOnboarding({ negocioId, nome, nomeNegocio, slug, telefone, tipoNegocio, local }) {
  return withAuthRetry(
    () => supabase.rpc('complete_owner_business_onboarding', {
      p_negocio_id: negocioId,
      p_nome_usuario: nome,
      p_nome_negocio: nomeNegocio,
      p_slug: slug,
      p_telefone: telefone,
      p_tipo_negocio: tipoNegocio,
      p_cep: local.cep,
      p_rua: local.rua,
      p_numero: local.numero,
      p_complemento: local.complemento,
      p_bairro: local.bairro,
      p_cidade: local.cidade,
      p_estado: local.estado,
    }),
    8000,
    'complete-owner-onboarding'
  );
}
