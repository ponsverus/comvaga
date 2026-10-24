const PLAN_CODES = ['essencial', 'profissional', 'premium'];
export const DEFAULT_PLAN_CODE = 'profissional';
const SELECTED_PLAN_STORAGE_KEY = 'comvaga:selected-plan';

export function normalizePlanCode(value) {
  const code = String(value || '').trim().toLowerCase();
  return PLAN_CODES.includes(code) ? code : null;
}

export function getPlanFromSearch(searchParams) {
  if (!searchParams) return null;
  const value = typeof searchParams.get === 'function'
    ? searchParams.get('plano') || searchParams.get('plan')
    : null;
  return normalizePlanCode(value);
}

export function saveSelectedPlanIntent(planCode) {
  const normalized = normalizePlanCode(planCode);
  if (!normalized || typeof window === 'undefined') return null;
  try {
    window.localStorage.setItem(SELECTED_PLAN_STORAGE_KEY, normalized);
  } catch {
    return null;
  }
  return normalized;
}

export function getSelectedPlanIntent() {
  if (typeof window === 'undefined') return null;
  try {
    return normalizePlanCode(window.localStorage.getItem(SELECTED_PLAN_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function clearSelectedPlanIntent() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SELECTED_PLAN_STORAGE_KEY);
  } catch {
    return;
  }
}
