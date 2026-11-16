import { supabase } from '../supabase';
import { withPublicAuthRetry } from './authSession';

export async function searchHome(term, { limit = 10, timeoutMs = 6000 } = {}) {
  const clean = String(term || '').trim();
  if (clean.length < 3) return [];

  const { data, error } = await withPublicAuthRetry(
    () => supabase.rpc('search_home', {
      p_term: clean,
      p_limit: Math.max(1, Number(limit) || 1),
    }),
    timeoutMs,
    'search-home'
  );

  if (error) throw error;
  return (Array.isArray(data) ? data : []).filter((item) => item?.slug);
}
