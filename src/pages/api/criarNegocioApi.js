import { supabase } from '../../supabase';
import { withAuthRetry } from '../../utils/authSession';

export async function fetchOwnerBusinessCount(userId) {
  return withAuthRetry(() => supabase
    .from('negocios')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId), 6000, 'owner-business-count');
}

export async function createOwnerBusiness({ nomeNegocio, slug, telefone, tipoNegocio, formData }) {
  return withAuthRetry(() => supabase.rpc('create_owner_business', {
    p_nome_negocio: nomeNegocio,
    p_slug: slug,
    p_telefone: telefone,
    p_tipo_negocio: tipoNegocio,
    p_endereco_cep: formData.cep,
    p_endereco_rua: formData.rua,
    p_endereco_numero: formData.numero,
    p_endereco_complemento: formData.complemento,
    p_endereco_bairro: formData.bairro,
    p_endereco_cidade: formData.cidade,
    p_endereco_estado: formData.estado,
  }), 8000, 'create-owner-business');
}
