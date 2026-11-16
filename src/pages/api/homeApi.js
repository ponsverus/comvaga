import { supabase } from '../../supabase';
import { withAuthRetry, withPublicAuthRetry } from '../../utils/authSession.js';

export const APP_REVIEWS_PAGE_SIZE = 12;

export async function fetchAppReviews(cursor = null) {
  const { data, error } = await withPublicAuthRetry(
    () => supabase.rpc('get_depoimentos_app', {
      p_limit: APP_REVIEWS_PAGE_SIZE + 1,
      p_cursor_created_at: cursor?.created_at ?? null,
      p_cursor_id: cursor?.id ?? null,
    }),
    7000,
    'depoimentos-app'
  );
  if (error) throw error;
  return data || [];
}

export async function fetchAppReviewsHome() {
  const { data, error } = await withPublicAuthRetry(
    () => supabase.rpc('get_depoimentos_app_home'),
    7000,
    'depoimentos-app-home'
  );
  if (error) throw error;
  if (!data || !Array.isArray(data.items)) throw new Error('Resposta inválida de depoimentos da Comvaga');

  const count = Number(data.rating_count);
  const value = data.rating_value == null ? null : Number(data.rating_value);
  if (!Number.isSafeInteger(count) || count < 0 || count < data.items.length
    || (count > 0 && (!Number.isFinite(value) || value < 1 || value > 5))
    || (count === 0 && data.items.length > 0)) {
    throw new Error('Resumo inválido de depoimentos da Comvaga');
  }
  return { items: data.items, rating: count > 0 ? { count, value } : null };
}

export async function createAppReview(nota, comentario) {
  return withAuthRetry(
    () => supabase.rpc('create_depoimento_app', {
      p_nota: nota,
      p_comentario: comentario || null,
      p_consentimento: true,
    }),
    7000,
    'enviar-depoimento-app'
  );
}

export function getBusinessLogoUrl(path) {
  if (!path) return null;
  try {
    const normalizedPath = String(path).trim();
    if (!normalizedPath || /^https?:\/\//i.test(normalizedPath)) return null;

    const stripped = normalizedPath.replace(/^logos\//, '');
    const { data } = supabase.storage.from('logos').getPublicUrl(stripped);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}
