import { jsonResponse } from './cors.ts';

export type ProtectedDomain = 'agendamentos' | 'depoimentos' | 'gestao' | 'cadastros';
type DatabaseError = { code?: string; message: string; details?: string; hint?: string };
type AttemptResult = { allowed: boolean; action_allowed: boolean; retry_after: number };
type Dependencies = {
  authenticate: (authorization: string) => Promise<string | null>;
  consume: (actor: string, domain: ProtectedDomain, action: string | null) => Promise<{ data: AttemptResult | null; error: DatabaseError | null }>;
  execute: (actor: string, action: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: DatabaseError | null }>;
};

const maxBodyBytes = 32768;

async function readBody(req: Request) {
  const reader = req.body?.getReader();
  if (!reader) return { payload: null, invalid: true, tooLarge: false };
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBodyBytes) {
        await reader.cancel();
        return { payload: null, invalid: true, tooLarge: true };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    return { payload, invalid: false, tooLarge: false };
  } catch {
    return { payload: null, invalid: true, tooLarge: false };
  } finally {
    reader.releaseLock();
  }
}

export function createProtectedActionHandler(domain: ProtectedDomain, deps: Dependencies) {
  return async (req: Request) => {
    if (req.method === 'OPTIONS') return jsonResponse({}, 200, req);
    if (req.method !== 'POST') return jsonResponse({ message: 'method_not_allowed' }, 405, req);

    try {
      const authorization = req.headers.get('authorization') || '';
      if (!/^Bearer\s+\S+$/i.test(authorization)) {
        return jsonResponse({ code: 'not_authenticated', message: 'not_authenticated' }, 401, req);
      }
      const actor = await deps.authenticate(authorization);
      if (!actor) return jsonResponse({ code: 'not_authenticated', message: 'not_authenticated' }, 401, req);

      const { payload, invalid, tooLarge } = await readBody(req);
      const action = typeof payload?.action === 'string' ? payload.action : null;

      const attempt = await deps.consume(actor, domain, action);
      if (attempt.error || !attempt.data) {
        return jsonResponse({ code: 'attempt_counter_unavailable', message: 'Controle de tentativas temporariamente indisponível. Tente novamente.' }, 503, req);
      }
      if (!attempt.data.allowed) {
        const response = jsonResponse({
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
        }, 429, req);
        response.headers.set('Retry-After', String(attempt.data.retry_after));
        return response;
      }
      if (tooLarge) return jsonResponse({ code: 'request_too_large', message: 'request_too_large' }, 413, req);
      if (invalid || !action || !attempt.data.action_allowed) {
        return jsonResponse({ code: 'invalid_action', message: 'invalid_action' }, 400, req);
      }
      const params = payload.params === undefined ? {} : payload.params;
      if (typeof params !== 'object' || params === null || Array.isArray(params)
        || Object.keys(payload).some((key) => key !== 'action' && key !== 'params')) {
        return jsonResponse({ code: 'invalid_action_parameters', message: 'invalid_action_parameters' }, 400, req);
      }

      const result = await deps.execute(actor, action, params);
      if (result.error) {
        const error = result.error;
        let status = error.code === 'RATE_LIMIT_EXCEEDED' ? 429 : error.code === '42501' ? 403 : 400;
        if (error.code === 'PGRST') {
          try {
            const structured = JSON.parse(error.message);
            const detail = JSON.parse(error.details || '{}');
            if (detail.status === 429) return jsonResponse(structured, 429, req);
          } catch {
            status = 400;
          }
        }
        return jsonResponse(error, status, req);
      }
      return jsonResponse(result.data, 200, req);
    } catch {
      return jsonResponse({ code: 'protected_action_unavailable', message: 'Etapa temporariamente indisponível. Tente novamente.' }, 503, req);
    }
  };
}
