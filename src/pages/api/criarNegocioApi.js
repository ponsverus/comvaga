import { supabase } from '../../supabase';
import { withAuthRetry } from '../../utils/authSession';

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
