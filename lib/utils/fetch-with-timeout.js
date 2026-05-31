const DEFAULT_TIMEOUT_MS = 10000;

function normalizeTimeout(timeoutMs) {
  const value = Number(timeoutMs);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('timeoutMs must be a positive number');
  }
  return value;
}

/**
 * @param {RequestInfo | URL | string} input
 * @param {(RequestInit & { timeoutMs?: number, fetchImpl?: any })} [options]
 */
export async function fetchWithTimeout(input, {
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
  signal,
  ...init
} = {}) {
  const ms = normalizeTimeout(timeoutMs);
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch implementation is unavailable');
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);

  const abortFromCaller = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', abortFromCaller, { once: true });
    }
  }

  try {
    return await fetchImpl(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (timedOut) {
      throw new Error(`External request timed out after ${ms}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', abortFromCaller);
  }
}

export async function fetchJsonWithTimeout(input, options = {}) {
  const response = await fetchWithTimeout(input, options);
  if (!response.ok) {
    throw new Error(`External request failed with HTTP ${response.status}`);
  }
  return response.json();
}
