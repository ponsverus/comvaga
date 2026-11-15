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
