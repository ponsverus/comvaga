import { getCorsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase.ts';

const ASAAS_PROVIDER = 'asaas';
const DEFAULT_ASAAS_BASE_URL = 'https://api-sandbox.asaas.com/v3';

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function asText(value: unknown) {
  return String(value || '').trim();
}

async function callAsaas(path: string, body: Record<string, unknown>, method = 'POST') {
  const apiKey = requiredEnv('ASAAS_API_KEY');
  const baseUrl = (Deno.env.get('ASAAS_BASE_URL') || DEFAULT_ASAAS_BASE_URL).replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      access_token: apiKey,
      accept: 'application/json',
      'content-type': 'application/json',
      'User-Agent': 'Comvaga/1.0',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  const responseText = await response.text().catch(() => '');
  let data: Record<string, unknown> = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    const asaasError = Array.isArray(data?.errors)
      ? data.errors
        .map((item: Record<string, unknown>) => item.description || item.message || item.code)
        .filter(Boolean)
        .join(' | ')
      : data?.description || data?.message || responseText || JSON.stringify(data);
    throw new Error(`asaas_checkout_cancel_failed (${response.status}): ${String(asaasError || '').trim() || 'empty_response'}`);
  }

  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405, req);

  try {
    const authorization = req.headers.get('authorization') || '';
    if (!authorization.toLowerCase().startsWith('bearer ')) {
      return jsonResponse({ error: 'not_authenticated' }, 401, req);
    }

    const body = await req.json().catch(() => ({}));
    const negocioId = asText(body?.negocio_id);
    if (!negocioId) return jsonResponse({ error: 'missing_required_fields' }, 400, req);

    const userClient = createUserClient(authorization);
    const admin = createAdminClient();
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user?.id) return jsonResponse({ error: 'not_authenticated' }, 401, req);

    const { data: negocio, error: negocioError } = await admin
      .from('negocios')
      .select('id, owner_id')
      .eq('id', negocioId)
      .maybeSingle();
    if (negocioError) throw negocioError;
    if (!negocio || negocio.owner_id !== authData.user.id) {
      return jsonResponse({ error: 'acao_nao_permitida' }, 403, req);
    }

    const { data: session, error: sessionError } = await admin
      .from('billing_checkout_sessions')
      .select('id, status, provider, provider_checkout_id, action, plan_code, expires_at')
      .eq('negocio_id', negocioId)
      .in('action', ['subscription', 'upgrade_proration'])
      .in('status', ['creating', 'active', 'unknown', 'paid'])
      .gt('expires_at', new Date().toISOString())
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) return jsonResponse({ error: 'checkout_not_found' }, 404, req);
    if (session.status === 'paid') return jsonResponse({ error: 'payment_already_confirmed' }, 409, req);
    if (session.status === 'creating' || !session.provider_checkout_id) {
      return jsonResponse({ error: 'checkout_creation_in_progress', retry_after_creation: true }, 409, req);
    }

    let providerResponse: Record<string, unknown> = { skipped: true, reason: 'provider_not_asaas' };
    if (String(session.provider || '').toLowerCase() === ASAAS_PROVIDER) {
      providerResponse = await callAsaas(`/checkouts/${encodeURIComponent(String(session.provider_checkout_id))}/cancel`, {}, 'POST');
    }

    const { data: billingStatus, error: cancelError } = await admin.rpc('cancel_pending_billing_checkout', {
      p_negocio_id: negocioId,
      p_actor_id: authData.user.id,
      p_provider_payload: {
        source: 'owner_dashboard',
        provider_response: providerResponse,
        canceled_checkout_session_id: session.id,
      },
    });
    if (cancelError) throw cancelError;

    return jsonResponse({
      action: 'checkout_canceled',
      billing_status: billingStatus,
    }, 200, req);
  } catch (error) {
    console.error('asaas-cancel-checkout failed:', error);
    return jsonResponse({ error: error?.message || 'checkout_cancel_failed' }, 400, req);
  }
});
