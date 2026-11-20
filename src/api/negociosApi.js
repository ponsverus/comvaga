import { supabase } from '../supabase';
import { withAuthRetry } from '../utils/authSession';

export async function fetchOwnerBusinessCount(ownerId) {
  const { count, error } = await withAuthRetry(
    () => supabase
      .from('negocios')
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
