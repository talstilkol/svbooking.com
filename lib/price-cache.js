// Price cache layer — KV-backed caching for Xotelo API calls.
// Eliminates redundant 5-30s API calls by caching results.
//
// TTLs:
//   Rates  — 30 min (prices change frequently)
//   Heatmap — 2 hours (broader trends, less volatile)

import { kv } from './kv';
import { getRates, getHeatmap } from './xotelo';

const RATES_TTL = 1800;    // 30 minutes
const HEATMAP_TTL = 7200;  // 2 hours

/**
 * Get rates with KV caching.
 * Cache key: price:{hotelKey}:{checkIn}:{checkOut}:{currency}
 */
export async function getCachedRates({ hotelKey, checkIn, checkOut, currency = 'USD', timeoutMs }) {
  const key = `price:${hotelKey}:${checkIn}:${checkOut}:${currency}`;
  try {
    const cached = await kv.get(key);
    if (cached) return { ...cached, fromCache: true };
  } catch {
    // Cache miss or error — fall through to live fetch
  }

  const result = await getRates({ hotelKey, checkIn, checkOut, currency, timeoutMs });

  // Cache in background (don't block the response)
  kv.setWithTTL(key, result, RATES_TTL).catch(() => {});

  return { ...result, fromCache: false };
}

/**
 * Get heatmap with KV caching.
 * Cache key: heatmap:{hotelKey}:{checkOut}
 */
export async function getCachedHeatmap({ hotelKey, checkOut, timeoutMs }) {
  const key = `heatmap:${hotelKey}:${checkOut}`;
  try {
    const cached = await kv.get(key);
    if (cached) return { ...cached, fromCache: true };
  } catch {
    // Cache miss or error — fall through to live fetch
  }

  const result = await getHeatmap({ hotelKey, checkOut, timeoutMs });

  kv.setWithTTL(key, result, HEATMAP_TTL).catch(() => {});

  return { ...result, fromCache: false };
}

/**
 * Invalidate cached rates for a specific hotel + date combination.
 */
export async function invalidateRates({ hotelKey, checkIn, checkOut, currency = 'USD' }) {
  const key = `price:${hotelKey}:${checkIn}:${checkOut}:${currency}`;
  await kv.del(key);
}

/**
 * Invalidate cached heatmap for a specific hotel.
 */
export async function invalidateHeatmap({ hotelKey, checkOut }) {
  const key = `heatmap:${hotelKey}:${checkOut}`;
  await kv.del(key);
}
