export const PUBLIC_HOME_REVIEWS_ID = 'comvaga-home-reviews';

export function publicHomeReviewsSnapshot(value, supabaseUrl) {
  if (!value || !Array.isArray(value.items)) throw new Error('Invalid public home reviews');
  const count = Number(value.rating_count);
  const ratingValue = value.rating_value == null ? null : Number(value.rating_value);
  if (!Number.isSafeInteger(count) || count < 0 || count < value.items.length
    || (count > 0 && (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5))) {
    throw new Error('Invalid public home reviews rating');
  }
  const base = String(supabaseUrl || '').replace(/\/$/, '');
  return {
    items: value.items.slice(0, 12).map((row) => ({
      id: row.id,
      nota: row.nota,
      comentario: row.comentario,
      created_at: row.created_at,
      users: { nome: row.nome_publico },
      avatarClienteUrl: base && row.avatar_path
        ? `${base}/storage/v1/object/public/avatars/${String(row.avatar_path).replace(/^avatars\//, '')}`
        : null,
    })),
    hasMore: value.items.length > 12,
    rating: count > 0 ? { count, value: ratingValue } : null,
  };
}

export function readPublicHomeReviewsSnapshot(doc = globalThis.document) {
  const element = doc?.getElementById(PUBLIC_HOME_REVIEWS_ID);
  if (!element || element.getAttribute('type') !== 'application/json') return null;
  try {
    const value = JSON.parse(element.textContent);
    return value && Array.isArray(value.items) ? value : null;
  } catch {
    return null;
  }
}
