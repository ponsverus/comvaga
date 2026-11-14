import { createAdminClient } from './supabase.ts';

const PAGE_SIZE = 100;
const MAX_PAGES_BY_MODE = { interactive: 5, worker: 100 } as const;

export type ChargeLookupMode = keyof typeof MAX_PAGES_BY_MODE;

export type AsaasCharge = {
  id: string;
  subscription: string;
  status: string;
  dueDate: string;
  valueCents?: number;
  invoiceUrl?: string | null;
};

export function todayInSaoPaulo(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function validCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isDueOpenCharge(charge: AsaasCharge, subscriptionId: string, today: string): boolean {
  return charge.subscription === subscriptionId
    && (charge.status === 'PENDING' || charge.status === 'OVERDUE')
    && validCalendarDate(charge.dueDate)
    && charge.dueDate <= today;
}

export async function listAsaasSubscriptionCharges(
  subscriptionId: string,
  mode: ChargeLookupMode = 'interactive',
): Promise<AsaasCharge[]> {
  const apiKey = Deno.env.get('ASAAS_API_KEY');
  if (!apiKey) throw new Error('missing_asaas_api_key');
  const baseUrl = Deno.env.get('ASAAS_BASE_URL')?.trim().replace(/\/+$/, '');
  if (!baseUrl) throw new Error('missing_asaas_base_url');
  const charges: AsaasCharge[] = [];

  for (let page = 0; page < MAX_PAGES_BY_MODE[mode]; page++) {
    const url = new URL(`${baseUrl}/payments`);
    url.searchParams.set('subscription', subscriptionId);
    url.searchParams.set('limit', String(PAGE_SIZE));
    url.searchParams.set('offset', String(page * PAGE_SIZE));
    const response = await fetch(url, {
      headers: { access_token: apiKey, accept: 'application/json', 'User-Agent': 'Comvaga/1.0' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`asaas_charge_lookup_failed_${response.status}`);
    const body = await response.json();
    if (!Array.isArray(body?.data) || typeof body?.hasMore !== 'boolean') {
      throw new Error('asaas_charge_lookup_invalid_response');
    }
    for (const raw of body.data) {
      if (String(raw?.subscription || '') !== subscriptionId) throw new Error('asaas_charge_subscription_mismatch');
      if (!raw?.id || !raw?.status || !validCalendarDate(raw?.dueDate)) {
        throw new Error('asaas_charge_lookup_invalid_item');
      }
      const value = raw.value == null ? NaN : Number(raw.value);
      charges.push({
        id: String(raw.id),
        subscription: subscriptionId,
        status: String(raw.status).toUpperCase(),
        dueDate: raw.dueDate,
        valueCents: Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : undefined,
        invoiceUrl: raw.invoiceUrl || null,
      });
    }
    if (!body.hasMore) return charges;
    if (body.data.length !== PAGE_SIZE) throw new Error('asaas_charge_lookup_incomplete_page');
  }
  throw new Error('asaas_charge_lookup_too_many_pages');
}

type AdminClient = ReturnType<typeof createAdminClient>;

export async function reconcileAsaasSubscriptionCharges(
  admin: AdminClient,
  negocioId: string,
  subscriptionId: string,
  listedCharges?: AsaasCharge[],
  mode: ChargeLookupMode = 'interactive',
): Promise<AsaasCharge[]> {
  const charges = listedCharges ?? await listAsaasSubscriptionCharges(subscriptionId, mode);
  const { error } = await admin.rpc('reconcile_billing_charges', {
    p_negocio_id: negocioId,
    p_provider_subscription_id: subscriptionId,
    p_charges: charges,
  });
  if (error) throw error;
  return charges;
}
