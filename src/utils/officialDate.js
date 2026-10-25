import { isAuthSessionError } from './authSession';
import { isRateLimitError } from './errorUtils';

export const NOW_RPC_SEQUENCE = ['now_sp', 'now_sp_fallback'];

export async function fetchOfficialDatePayload(rpcNames, request) {
  let lastError = null;

  for (const rpcName of rpcNames) {
    try {
      const { data, error } = await request(rpcName);
      if (error) {
        lastError = error;
      } else {
        const payload = data?.[0] ?? data;
        if (payload?.date) return { payload, rpcName };
        lastError = new Error(`${rpcName} vazio`);
      }
    } catch (error) {
      lastError = error;
    }

    if (isAuthSessionError(lastError) || isRateLimitError(lastError)) break;
  }

  throw lastError || new Error('Falha ao obter horario oficial');
}
