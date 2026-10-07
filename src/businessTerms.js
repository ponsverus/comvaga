import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import { withAuthRetry } from './utils/authSession';
import { businessGroupContext, pendingBusinessGroup, resolveBusinessGroup } from './utils/businessGroupResolution.js';

export function useBusinessGroup(tipoNegocio, publicGroup = null, businessId = null) {
  const context = useMemo(() => businessGroupContext(tipoNegocio, publicGroup, businessId),
    [tipoNegocio, publicGroup, businessId]);
  const [resolution, setResolution] = useState(() => pendingBusinessGroup(context));
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setResolution((previous) => pendingBusinessGroup(context, previous));
    setAttempt((value) => value + 1);
  }, [context]);

  useEffect(() => {
    let active = true;
    setResolution((previous) => pendingBusinessGroup(context, previous));
    resolveBusinessGroup(context, async (type) => {
      const { data, error } = await withAuthRetry(
        () => supabase.rpc('tipo_negocio_grupo', { p_tipo: type }),
        6000,
        'grupo-do-negocio'
      );
      if (error) throw error;
      return data;
    })
      .then((value) => {
        if (active) setResolution(value);
      })
      .catch((error) => {
        if (!active) return;
        console.warn('Falha ao resolver tipo_negocio_grupo.', error);
        setResolution((previous) => ({ ...pendingBusinessGroup(context, previous), status: 'error', error }));
      });

    return () => { active = false; };
  }, [context, attempt]);

  const current = context.group
    ? { key: context.key, group: context.group, status: 'ready', error: null }
    : resolution.key === context.key ? resolution : pendingBusinessGroup(context);
  return { ...current, retry };
}
