import { supabase } from '../../supabase';
import { withAuthRetry } from '../../utils/authSession';
import { mapBusinessRow } from '../../api/negociosApi';

export async function createOwnerBusiness({ nomeNegocio, slug, telefone, tipoNegocio, formData }) {
  return withAuthRetry(() => supabase.rpc('create_owner_business', {
    p_business_name: nomeNegocio,
    p_slug: slug,
    p_phone: telefone,
    p_business_type: tipoNegocio,
    p_zip_code: formData.cep,
    p_street: formData.rua,
    p_number: formData.numero,
    p_complement: formData.complemento,
    p_neighborhood: formData.bairro,
    p_city: formData.cidade,
    p_state: formData.estado,
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
      p_business_id: negocioId,
      p_user_name: nome,
      p_business_name: nomeNegocio,
      p_slug: slug,
      p_phone: telefone,
      p_business_type: tipoNegocio,
      p_zip_code: local.cep,
      p_street: local.rua,
      p_number: local.numero,
      p_complement: local.complemento,
      p_neighborhood: local.bairro,
      p_city: local.cidade,
      p_state: local.estado,
    }),
    8000,
    'complete-owner-onboarding'
  );
}
