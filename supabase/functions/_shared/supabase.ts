import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

function readKeyFromJsonEnv(envName: string, keyName = 'default') {
  const raw = Deno.env.get(envName);
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    return String(parsed?.[keyName] || '');
  } catch {
    return '';
  }
}

export function getSupabaseUrl() {
  const url = Deno.env.get('SUPABASE_URL');
  if (!url) throw new Error('missing_supabase_url');
  return url;
}

export function getPublishableKey() {
  return Deno.env.get('SUPABASE_ANON_KEY')
    || readKeyFromJsonEnv('SUPABASE_PUBLISHABLE_KEYS')
    || '';
}

export function getSecretKey() {
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    || readKeyFromJsonEnv('SUPABASE_SECRET_KEYS')
    || '';
}

export function createUserClient(authorization: string) {
  const key = getPublishableKey();
  if (!key) throw new Error('missing_supabase_publishable_key');

  return createClient(getSupabaseUrl(), key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createAdminClient() {
  const key = getSecretKey();
  if (!key) throw new Error('missing_supabase_secret_key');

  return createClient(getSupabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
