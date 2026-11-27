import { supabase } from '../supabase';
import { withAuthRetry } from '../utils/authSession';

export const BUSINESS_SELECT_FIELDS = [
  'id',
  'owner_id',
  'name',
  'slug',
  'about',
  'phone',
  'business_type',
  'instagram',
  'facebook',
  'created_at',
  'logo_path',
  'theme',
  'zip_code',
  'street',
  'number',
  'complement',
  'neighborhood',
  'city',
  'state',
  'meta_title',
  'meta_description',
  'announcement',
].join(', ');

const UI_TO_DB_BUSINESS_FIELD = {
  nome: 'name',
  sobre: 'about',
  telefone: 'phone',
  tipo_negocio: 'business_type',
  tema: 'theme',
  cep: 'zip_code',
  rua: 'street',
  numero: 'number',
  complemento: 'complement',
  bairro: 'neighborhood',
  cidade: 'city',
  estado: 'state',
  anuncio: 'announcement',
};

const DB_TO_UI_BUSINESS_FIELD = Object.fromEntries(
  Object.entries(UI_TO_DB_BUSINESS_FIELD).map(([uiKey, dbKey]) => [dbKey, uiKey])
);

export function mapBusinessRow(row) {
  if (!row) return null;
  const mapped = {};
  for (const [key, value] of Object.entries(row)) {
    const uiKey = DB_TO_UI_BUSINESS_FIELD[key] || key;
    mapped[uiKey] = value;
  }
  return mapped;
}

export function toBusinessDbPatch(payload) {
  if (!payload) return {};
  const patch = {};
  for (const [key, value] of Object.entries(payload)) {
    const dbKey = UI_TO_DB_BUSINESS_FIELD[key] || key;
    patch[dbKey] = value;
  }
  return patch;
}

export async function fetchOwnerBusinessCount(ownerId) {
  const { count, error } = await withAuthRetry(
    () => supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId),
    6000,
    'negocios-count'
  );

  if (error) throw error;
  return Number(count || 0);
}

export async function setBusinessPlan(negocioId, planCode, requestLabel = 'set-plan') {
  const { data, error } = await withAuthRetry(
    () => supabase.rpc('set_business_plan', {
      p_negocio_id: negocioId,
      p_plan_code: planCode,
    }),
    6500,
    requestLabel
  );
  if (error) throw error;
  return data || null;
}
