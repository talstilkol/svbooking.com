// Xotelo - hotel prices API (no auth required)
// Returns provider price observations when the upstream service has data.
// Docs: https://xotelo.com/

const XOTELO_BASE = 'https://data.xotelo.com/api';

/** Default per-request timeout: 15 seconds */
const DEFAULT_TIMEOUT_MS = 15_000;

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

export async function getRates({ hotelKey, checkIn, checkOut, currency = 'USD', timeoutMs }) {
  const url = new URL(`${XOTELO_BASE}/rates`);
  url.searchParams.set('hotel_key', hotelKey);
  url.searchParams.set('chk_in', checkIn);
  url.searchParams.set('chk_out', checkOut);
  if (currency) url.searchParams.set('currency', currency);

  const res = await fetchWithTimeout(url.toString(), {
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

  const res = await fetchWithTimeout(url.toString(), {
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
