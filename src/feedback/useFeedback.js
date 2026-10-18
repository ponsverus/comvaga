import { useCallback, useMemo } from 'react';

import { ptBR } from './messages/ptBR.js';
import {
  dismissFeedback,
  enqueueFeedback,
  navigateFeedback,
} from './feedbackStore';

function getByPath(obj, path) {
  const parts = String(path || '').split('.');
  let cur = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return null;
    cur = cur[p];
  }
  return cur || null;
}

function interpolate(str, params) {
  return String(str || '').replace(/\{(\w+)\}/g, (_, k) => {
    const v = params?.[k];
    return (v === undefined || v === null) ? '' : String(v);
  });
}

function buildPayloadFromKey(key, params) {
  const base = getByPath(ptBR, key);
  if (!base) {
    return {
      title: 'Aviso',
      body: `Mensagem não encontrada: ${key}`,
      variant: 'danger',
      screen: 'dark',
      buttonText: 'OK',
    };
  }

  return {
    ...base,
    title: interpolate(base.title, params),
    body: interpolate(base.body, params),
  };
}

export function useFeedback() {
  const showMessage = useCallback((key, params) => {
    const payload = buildPayloadFromKey(key, params);

    enqueueFeedback({ ...payload, type: 'message' });
  }, []);

  const confirm = useCallback((key, { params, variant } = {}) => {
    const payload = buildPayloadFromKey(key, params);

    return new Promise((resolve) => {
      enqueueFeedback({
        ...payload,
        type: 'confirm',
        variant: variant || payload.variant || 'warning',
        confirmText: payload.confirmText || payload.buttonText || 'OK',
        cancelText: payload.cancelText || 'CANCELAR',
        __resolve: resolve,
      });
    });
  }, []);

  const prompt = useCallback((key, { params, variant, placeholder = '', initialValue = '' } = {}) => {
    const payload = buildPayloadFromKey(key, params);

    return new Promise((resolve) => {
      enqueueFeedback({
        ...payload,
        type: 'prompt',
        variant: variant || payload.variant || 'warning',
        placeholder: payload.placeholder || placeholder,
        initialValue: payload.initialValue ?? initialValue,
        confirmText: payload.confirmText || payload.buttonText || 'OK',
        cancelText: payload.cancelText || 'CANCELAR',
        __resolve: resolve,
      });
    });
  }, []);

  const showCustom = useCallback((payload) => {
    enqueueFeedback({ ...payload, type: payload?.type || 'message' });
  }, []);

  const next = useCallback(() => navigateFeedback('next'), []);
  const previous = useCallback(() => navigateFeedback('previous'), []);

  const close = useCallback((result) => {
    dismissFeedback(result);
  }, []);

  return useMemo(
    () => ({ showMessage, confirm, prompt, showCustom, close, next, previous }),
    [showMessage, confirm, prompt, showCustom, close, next, previous]
  );
}
