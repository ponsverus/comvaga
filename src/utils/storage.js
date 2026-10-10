import { supabase } from '../supabase';

export function getPublicUrl(bucket, path) {
  if (!bucket || !path) return null;
  try {
    const stripped = String(path).replace(new RegExp(`^${bucket}/`), '');
    const { data } = supabase.storage.from(bucket).getPublicUrl(stripped);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}
