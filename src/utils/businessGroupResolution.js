const GROUPS = new Set(['servicos', 'consultas', 'aulas']);

export function businessGroupContext(tipoNegocio, publicGroup, businessId) {
  const type = typeof tipoNegocio === 'string' ? tipoNegocio.trim() : '';
  return {
    key: JSON.stringify([businessId || null, type]),
    type,
    group: !type ? 'servicos' : GROUPS.has(publicGroup) ? publicGroup : null,
  };
}

export function pendingBusinessGroup(context, previous = null) {
  const confirmed = previous?.key === context.key && GROUPS.has(previous.group) ? previous.group : null;
  return { key: context.key, group: context.group || confirmed,
    status: context.group ? 'ready' : 'loading', error: null };
}

export async function resolveBusinessGroup(context, request) {
  const group = context.group || await request(context.type);
  if (!GROUPS.has(group)) throw new Error('Grupo de atendimento desconhecido');
  return { key: context.key, group, status: 'ready', error: null };
}
