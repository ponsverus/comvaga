import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const PASSWORD_RECOVERY_STORAGE_KEY = 'comvaga-password-recovery';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

try {
  const url = new URL(window.location.href);
  const hashRaw = (url.hash || '').replace(/^#/, '');
  const hashParams = new URLSearchParams(
    hashRaw.startsWith('?') ? hashRaw.slice(1) : hashRaw
  );
  const type = url.searchParams.get('type') || hashParams.get('type');

  if (url.pathname === '/reset-password' || type === 'recovery') {
    window.sessionStorage?.setItem(PASSWORD_RECOVERY_STORAGE_KEY, '1');
  }
} catch (error) {
  console.warn('Falha ao marcar troca de senha.', error);
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'comvaga-auth'
    },
    global: {
      headers: {
        'X-Client-Info': 'comvaga-web'
      }
    }
  }
);
