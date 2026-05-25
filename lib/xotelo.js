// Xotelo - hotel prices API (no auth required, unlimited)
// Returns provider price observations when the upstream service has data.
// Docs: https://xotelo.com/
//
// Since Xotelo is free/unlimited and our highest-priority provider, we retry
// once on transient failures (5xx, timeout, network) to maximize success rate.

const XOTELO_BASE = 'https://data.xotelo.com/api';

/** Default per-request timeout: 10 seconds (reduced from 15s for faster fallback) */
const DEFAULT_TIMEOUT_MS = 10_000;

/** Delay before retrying a transient failure */
const RETRY_DELAY_MS = 500;

/** Whether an error is retryable (transient) */
function isTransient(err) {
  if (err?.name === 'AbortError') return true;                  // raw timeout
  if (err?.message?.includes('timed out')) return true;          // wrapped timeout
  if (err?.message?.includes('fetch failed')) return true;       // network error
  return false;
}

/** Whether an HTTP status code is retryable */
function isRetryableStatus(status) {
  return status >= 500 || status === 429;
}

/**
 * Fetch with AbortController timeout.
 * Prevents hanging requests from blocking the entire chain.
 */
async function fetchWithTimeout(url, { timeoutMs = DEFAULT_TIMEOUT_MS, ...opts } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Xotelo request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch with a single retry on transient failure.
 * First attempt uses most of the timeout budget; retry gets the remainder.
 * Total wall time stays within the original timeout.
 */
async function fetchWithRetry(url, { timeoutMs = DEFAULT_TIMEOUT_MS, ...opts } = {}) {
  const firstAttemptTimeout = Math.round(timeoutMs * 0.6);
  const retryTimeout = timeoutMs - firstAttemptTimeout - RETRY_DELAY_MS;

  try {
    const res = await fetchWithTimeout(url, { ...opts, timeoutMs: firstAttemptTimeout });
    if (isRetryableStatus(res.status)) {
      // Transient server error — retry
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return await fetchWithTimeout(url, { ...opts, timeoutMs: Math.max(retryTimeout, 2000) });
    }
    return res;
  } catch (err) {
    if (isTransient(err) && retryTimeout > 1000) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return await fetchWithTimeout(url, { ...opts, timeoutMs: Math.max(retryTimeout, 2000) });
    }
    throw err;
  }
}

export async function getRates({ hotelKey, checkIn, checkOut, currency = 'USD', timeoutMs }) {
  const url = new URL(`${XOTELO_BASE}/rates`);
  url.searchParams.set('hotel_key', hotelKey);
  url.searchParams.set('chk_in', checkIn);
  url.searchParams.set('chk_out', checkOut);
  if (currency) url.searchParams.set('currency', currency);

  const res = await fetchWithRetry(url.toString(), {
    cache: 'no-store',
    timeoutMs: timeoutMs || DEFAULT_TIMEOUT_MS,
  });
  if (!res.ok) {
    throw new Error(`Xotelo HTTP ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  if (data.error) {
    throw new Error('Xotelo returned an unavailable result');
  }
  return data.result;
}

export async function getHeatmap({ hotelKey, checkOut, timeoutMs }) {
  const url = new URL(`${XOTELO_BASE}/heatmap`);
  url.searchParams.set('hotel_key', hotelKey);
  url.searchParams.set('chk_out', checkOut);

  const res = await fetchWithRetry(url.toString(), {
    cache: 'no-store',
    timeoutMs: timeoutMs || DEFAULT_TIMEOUT_MS,
  });
  if (!res.ok) {
    throw new Error(`Xotelo HTTP ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  if (data.error) {
    throw new Error('Xotelo returned an unavailable result');
  }
  return data.result;
}
