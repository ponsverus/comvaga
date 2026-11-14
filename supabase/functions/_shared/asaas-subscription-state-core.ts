export type SubscriptionState = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'DELETED';

const LIVE_STATES = new Set<SubscriptionState>(['ACTIVE', 'INACTIVE', 'EXPIRED']);

export function subscriptionState(value: Record<string, unknown>, expectedId: string): SubscriptionState {
  if (String(value.id || '') !== expectedId) throw new Error('asaas_subscription_identity_mismatch');
  if (value.deleted === true) return 'DELETED';
  const status = String(value.status || '').toUpperCase() as SubscriptionState;
  if (!LIVE_STATES.has(status)) throw new Error('asaas_subscription_status_unknown');
  return status;
}

export function requiresSecondObservation(current: unknown, next: SubscriptionState) {
  return next !== 'DELETED' && next !== String(current || '').toUpperCase();
}
