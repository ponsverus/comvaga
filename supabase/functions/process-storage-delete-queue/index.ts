import { createClient } from 'npm:@supabase/supabase-js@2';
import { timingSafeTokenMatch } from '../_shared/security.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const CRON_SECRET = Deno.env.get('CRON_SECRET');

Deno.serve(async (req: Request) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment configuration');
    return new Response('Server misconfigured', { status: 500 });
  }

  if (!CRON_SECRET) {
    console.error('Missing CRON_SECRET environment configuration');
    return new Response('Server misconfigured', { status: 500 });
  }

  const authHeader = req.headers.get('Authorization') || '';
  if (!(await timingSafeTokenMatch(authHeader, `Bearer ${CRON_SECRET}`))) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: items, error: fetchErr } = await supabase
    .from('storage_delete_queue')
    .select('id, bucket, path')
    .order('created_at', { ascending: true })
    .limit(100);

  if (fetchErr) {
    console.error('Erro ao buscar fila:', fetchErr);
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!items || items.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const item of items) {
    try {
      const { error: storageErr } = await supabase
        .storage
        .from(item.bucket)
        .remove([item.path]);

      const notFound = storageErr?.message?.includes('Not Found') ||
        storageErr?.message?.includes('404') ||
        storageErr?.message?.includes('does not exist');

      if (storageErr && !notFound) {
        results.failed++;
        results.errors.push(`[${item.bucket}/${item.path}]: ${storageErr.message}`);
        continue;
      }

      const { error: delErr } = await supabase
        .from('storage_delete_queue')
        .delete()
        .eq('id', item.id);

      if (delErr) {
        results.failed++;
        results.errors.push(`delete_queue [${item.id}]: ${delErr.message}`);
        continue;
      }

      results.success++;
    } catch (e) {
      results.failed++;
      results.errors.push(`[${item.bucket}/${item.path}]: ${String(e)}`);
    }
  }

  console.log('process-storage-delete-queue resultado:', results);

  return new Response(JSON.stringify({ processed: items.length, ...results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
