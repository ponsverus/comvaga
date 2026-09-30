function createTimeoutError(ms, label) {
  const error = new Error(`Timeout (${label}) em ${ms}ms`);
  error.code = 'REQUEST_TIMEOUT';
  return error;
}

function isAbortError(error) {
  const name = String(error?.name || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return name === 'aborterror'
    || message.includes('aborted')
    || message.includes('signal is aborted');
}

export function withTimeout(request, ms, label = 'timeout') {
  const controller = typeof AbortController !== 'undefined' && typeof request?.abortSignal === 'function'
    ? new AbortController()
    : null;

  let didTimeout = false;
  let timeoutError = null;
  let timeoutId;

  const promise = Promise.resolve(controller ? request.abortSignal(controller.signal) : request)
    .catch((error) => {
      if (didTimeout && isAbortError(error)) throw timeoutError;
      throw error;
    });

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      timeoutError = createTimeoutError(ms, label);
      if (controller) controller.abort(timeoutError);
      reject(timeoutError);
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}
