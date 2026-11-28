import { supabase } from '../supabase';

const domains = {
  create_booking: 'bookings',
  create_multiple_bookings: 'bookings',
  create_assisted_booking: 'bookings',
  create_multiple_assisted_bookings: 'bookings',
  cancel_client_booking: 'bookings',
  cancel_professional_booking: 'bookings',
  complete_professional_booking: 'bookings',
  create_business_review: 'reviews',
  create_professional_review: 'reviews',
  approve_partner_professional: 'management',
  activate_service: 'management',
  deactivate_service: 'management',
  delete_service: 'management',
  delete_partner_professional: 'management',
  delete_business: 'management',
  delete_client_account: 'management',
  delete_professional_account: 'management',
};

export async function invokeProtectedAction(action, params = {}) {
  const domain = domains[action];
  if (!domain) throw new Error('unsupported_protected_action');

  const result = await supabase.functions.invoke(`protected-${domain}`, {
    body: { action, params },
  });
  if (!result.error) return result;

  const response = result.error.context;
  let payload;
  try {
    payload = await response?.clone().json();
  } catch {
    payload = null;
  }
  const error = new Error(payload?.message || payload?.error || result.error.message);
  error.code = payload?.code || result.error.code;
  error.details = payload?.details;
  error.hint = payload?.hint;
  error.status = response?.status || result.error.status;
  error.cause = result.error;
  return { ...result, error };
}
