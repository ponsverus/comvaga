import { useEffect, useState } from 'react';
import { supabase } from './supabase';

const DEFAULT_BUSINESS_GROUP = 'servicos';
const VALID_BUSINESS_GROUPS = new Set(['servicos', 'consultas', 'aulas']);

function sanitizeBusinessGroup(value) {
  return VALID_BUSINESS_GROUPS.has(value) ? value : DEFAULT_BUSINESS_GROUP;
}

export function useBusinessGroup(tipoNegocio, publicGroup = null) {
  const [businessGroup, setBusinessGroup] = useState(() => sanitizeBusinessGroup(publicGroup));

  useEffect(() => {
    let active = true;
    const pTipo = typeof tipoNegocio === 'string' ? tipoNegocio : null;

    if (VALID_BUSINESS_GROUPS.has(publicGroup)) {
      setBusinessGroup(publicGroup);
      return () => { active = false; };
    }

    if (!pTipo?.trim()) {
      setBusinessGroup(DEFAULT_BUSINESS_GROUP);
      return () => { active = false; };
    }

    supabase
      .rpc('tipo_negocio_grupo', { p_tipo: pTipo })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) throw error;
        setBusinessGroup(sanitizeBusinessGroup(data));
      })
      .catch((error) => {
        console.warn('Falha ao resolver tipo_negocio_grupo.', error);
        if (active) setBusinessGroup(DEFAULT_BUSINESS_GROUP);
      });

    return () => { active = false; };
  }, [tipoNegocio, publicGroup]);

  return businessGroup;
}
