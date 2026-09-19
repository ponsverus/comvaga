import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addFavoritoNegocio,
  createDepoimento,
  fetchCurrentClienteId,
  fetchFavoritoNegocio,
  removeFavoritoNegocio,
} from '../api/vitrineApi';

export function useVitrineInteractions({
  user,
  userType,
  negocioId,
  depoimentoNota,
  depoimentoTexto,
  refreshDepoimentos,
}) {
  const [isFavorito, setIsFavorito] = useState(false);
  const [favoritoLoading, setFavoritoLoading] = useState(false);
  const [depoimentoLoading, setDepoimentoLoading] = useState(false);
  const [clienteId, setClienteId] = useState(null);
  const favoritoLockRef = useRef(false);

  useEffect(() => {
    if (!user || userType !== 'client' || !negocioId) {
      setIsFavorito(false);
      setClienteId(null);
    }
  }, [negocioId, user, userType]);

  const ensureClienteId = useCallback(async () => {
    if (!user || userType !== 'client') return null;
    if (clienteId) return clienteId;
    const currentClienteId = await fetchCurrentClienteId();
    setClienteId(currentClienteId);
    return currentClienteId;
  }, [clienteId, user, userType]);

  const checkFavorito = useCallback(async () => {
    if (!user || userType !== 'client' || !negocioId) {
      setIsFavorito(false);
      return false;
    }
    try {
      const currentClienteId = await ensureClienteId();
      if (!currentClienteId) return false;
      const favorito = await fetchFavoritoNegocio({ clienteId: currentClienteId, negocioId });
      setIsFavorito(favorito);
      return favorito;
    } catch {
      setIsFavorito(false);
      return false;
    }
  }, [ensureClienteId, negocioId, user, userType]);

  const toggleFavorito = useCallback(async () => {
    if (favoritoLockRef.current) return isFavorito;
    if (!user || userType !== 'client' || !negocioId) return false;
    favoritoLockRef.current = true;
    setFavoritoLoading(true);
    try {
      const currentClienteId = await ensureClienteId();
      if (!currentClienteId) return false;
      if (isFavorito) {
        await removeFavoritoNegocio({ clienteId: currentClienteId, negocioId });
        setIsFavorito(false);
        return false;
      }
      await addFavoritoNegocio({ clienteId: currentClienteId, negocioId });
      setIsFavorito(true);
      return true;
    } finally {
      favoritoLockRef.current = false;
      setFavoritoLoading(false);
    }
  }, [ensureClienteId, isFavorito, negocioId, user, userType]);

  const enviarDepoimento = useCallback(async () => {
    if (!user || userType !== 'client' || !negocioId) return false;
    const currentClienteId = await ensureClienteId();
    if (!currentClienteId) return false;
    setDepoimentoLoading(true);
    try {
      await createDepoimento({
        negocioId,
        nota: depoimentoNota,
        comentario: depoimentoTexto || null,
      });
      await refreshDepoimentos(negocioId);
      return true;
    } finally {
      setDepoimentoLoading(false);
    }
  }, [
    depoimentoNota,
    depoimentoTexto,
    negocioId,
    ensureClienteId,
    refreshDepoimentos,
    user,
    userType,
  ]);

  return {
    isFavorito,
    favoritoLoading,
    depoimentoLoading,
    checkFavorito,
    toggleFavorito,
    enviarDepoimento,
  };
}
