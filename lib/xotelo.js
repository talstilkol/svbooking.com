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
const HOTEL_KEY_PATTERN = /^g\d+-d\d+$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

/** Whether an error is retryable (transient) */
function isTransient(err) {
  if (err?.message?.includes('timed out')) return true;          // wrapped timeout
  if (err?.message?.includes('fetch failed')) return true;       // network error
  return false;
}

/** Whether an HTTP status code is retryable */
function isRetryableStatus(status) {
  return status >= 500 || status === 429;
}

function normalizeTimeoutMs(timeoutMs) {
  const value = Number(timeoutMs ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Xotelo timeoutMs must be a positive number');
  }
  return Math.trunc(value);
}

function normalizeHotelKey(hotelKey) {
  if (typeof hotelKey !== 'string') {
    throw new Error('Xotelo hotelKey must be a valid TripAdvisor-style key');
  }
  const key = hotelKey.trim();
  if (!HOTEL_KEY_PATTERN.test(key)) {
    throw new Error('Xotelo hotelKey must be a valid TripAdvisor-style key');
  }
  return key;
}

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function normalizeDate(value, name) {
  if (!isIsoDate(value)) {
    throw new Error(`Xotelo ${name} must be a valid YYYY-MM-DD date`);
  }
  return value;
}

function normalizeCurrency(currency) {
  const value = String(currency || 'USD').trim().toUpperCase();
  if (!CURRENCY_PATTERN.test(value)) {
    throw new Error('Xotelo currency must be a valid ISO 4217 code');
  }
  return value;
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
  const budgetMs = normalizeTimeoutMs(timeoutMs);
  const firstAttemptTimeout = Math.round(budgetMs * 0.6);
  const retryTimeout = budgetMs - firstAttemptTimeout - RETRY_DELAY_MS;

  try {
    const res = await fetchWithTimeout(url, { ...opts, timeoutMs: firstAttemptTimeout });
    if (isRetryableStatus(res.status) && retryTimeout > 1000) {
      // Transient server error — retry
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return await fetchWithTimeout(url, { ...opts, timeoutMs: retryTimeout });
    }
    return res;
  } catch (err) {
    if (isTransient(err) && retryTimeout > 1000) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return await fetchWithTimeout(url, { ...opts, timeoutMs: retryTimeout });
    }
    throw err;
  }
}

/**
 * Parse Xotelo response, extracting data even from error responses.
 * Xotelo sometimes returns an error flag but still includes partial rate data.
 * We prefer partial data over no data.
 */
function parseXoteloResponse(data, context) {
  // If there's a result with rates, return it — even if error flag is set.
  // Partial data is better than no data for cache warming.
  if (data?.result?.rates?.length > 0) {
    return data.result;
  }

  // Error with no usable data
  if (data?.error) {
    const err = new Error(`Xotelo: ${context} unavailable`);
    err.code = 'XOTELO_UNAVAILABLE';
    throw err;
  }

  // No error but no rates — return result as-is (may have metadata)
  return data?.result || { rates: [] };
}

export async function getRates({ hotelKey, checkIn, checkOut, currency = 'USD', timeoutMs } = {}) {
  const normalizedHotelKey = normalizeHotelKey(hotelKey);
  const normalizedCheckIn = normalizeDate(checkIn, 'checkIn');
  const normalizedCheckOut = normalizeDate(checkOut, 'checkOut');
  if (normalizedCheckIn >= normalizedCheckOut) {
    throw new Error('Xotelo checkIn must be before checkOut');
  }
  const normalizedCurrency = normalizeCurrency(currency);

  const url = new URL(`${XOTELO_BASE}/rates`);
  url.searchParams.set('hotel_key', normalizedHotelKey);
  url.searchParams.set('chk_in', normalizedCheckIn);
  url.searchParams.set('chk_out', normalizedCheckOut);
  url.searchParams.set('currency', normalizedCurrency);

  const res = await fetchWithRetry(url.toString(), {
    cache: 'no-store',
    timeoutMs,
  });
  if (!res.ok) {
    throw new Error(`Xotelo HTTP ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  return parseXoteloResponse(data, 'rates');
}

export async function getHeatmap({ hotelKey, checkOut, timeoutMs } = {}) {
  const normalizedHotelKey = normalizeHotelKey(hotelKey);
  const normalizedCheckOut = normalizeDate(checkOut, 'checkOut');

  const url = new URL(`${XOTELO_BASE}/heatmap`);
  url.searchParams.set('hotel_key', normalizedHotelKey);
  url.searchParams.set('chk_out', normalizedCheckOut);

  const res = await fetchWithRetry(url.toString(), {
    cache: 'no-store',
    timeoutMs,
  });
  if (!res.ok) {
    throw new Error(`Xotelo HTTP ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  return parseXoteloResponse(data, 'heatmap');
}
