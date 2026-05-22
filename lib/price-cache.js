// Price cache layer — KV-backed caching for multi-provider dated rates and Xotelo heatmaps.
// Dated rates use the provider registry; heatmaps remain Xotelo-only because they are
// a price-source signal, not a booking provider.
//
// TTLs:
//   Rates  — 30 min (prices change frequently)
//   Heatmap — 2 hours (broader trends, less volatile)

import { kv } from './kv';
import { getHotelRates } from './hotel-pricing';
import { getHeatmap } from './xotelo';
import { RETENTION_SECONDS } from './data-retention';

const RATES_TTL = 1800;    // 30 minutes fresh window
const RATES_STALE_TTL = RETENTION_SECONDS.priceRatesCache;
const HEATMAP_TTL = RETENTION_SECONDS.priceHeatmapCache;

function nowIso() {
  return new Date().toISOString();
}

function toNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeRate(rate, result, { checkedAt, fromCache, freshness, partial }) {
  const baseRate = toNumberOrNull(rate?.rate);
  const tax = toNumberOrNull(rate?.tax);
  const total = toNumberOrNull(rate?.total) ?? (
    baseRate !== null && tax !== null ? baseRate + tax : baseRate
  );
  const provider = rate?.provider || rate?.name || result?.provider || result?.source || 'none';
  const source = rate?.source || result?.source || result?.provider || provider;

  return {
    ...rate,
    provider,
    source,
    total,
    currency: rate?.currency || result?.currency || 'USD',
    taxesIncluded: rate?.taxesIncluded ?? result?.taxesIncluded ?? null,
    cancellationPolicy: rate?.cancellationPolicy || null,
    roomName: rate?.roomName || null,
    deepLink: rate?.deepLink || rate?.url || null,
    lastCheckedAt: rate?.lastCheckedAt || result?.lastCheckedAt || checkedAt,
    fromCache,
    freshness,
    partial,
    priceAccuracyState: rate?.priceAccuracyState || 'unobserved',
  };
}

function normalizeRatesResult(result, { fromCache, freshness, partial, checkedAt = nowIso() }) {
  const rates = Array.isArray(result?.rates)
    ? result.rates.map((rate) => normalizeRate(rate, result, { checkedAt, fromCache, freshness, partial }))
    : [];

  return {
    ...result,
    rates,
    currency: result?.currency || 'USD',
    provider: result?.provider || result?.source || 'none',
    source: result?.source || result?.provider || 'none',
    lastCheckedAt: result?.lastCheckedAt || checkedAt,
    taxesIncluded: result?.taxesIncluded ?? null,
    fromCache,
    freshness,
    partial,
  };
}

function readCachedEnvelope(cached) {
  if (!cached) return null;
  if (cached.result && cached.cachedAt) return cached;
  const cachedAt = cached.lastCheckedAt || cached.cachedAt || nowIso();
  return {
    result: cached,
    cachedAt,
  };
}

function isFresh(cachedAt) {
  const cachedTime = Date.parse(cachedAt);
  if (!Number.isFinite(cachedTime)) return false;
  return Date.now() - cachedTime <= RATES_TTL * 1000;
}

async function fetchAndCacheRates(key, params) {
  const checkedAt = nowIso();
  const result = await getHotelRates(params);
  const normalized = normalizeRatesResult(result, {
    fromCache: false,
    freshness: 'live',
    partial: false,
    checkedAt,
  });

  kv.setWithTTL(key, { result: normalized, cachedAt: checkedAt }, RATES_STALE_TTL).catch(() => {});
  return normalized;
}

/**
 * Get rates with KV caching.
 * Cache key: price:{hotelKey}:{checkIn}:{checkOut}:{currency}
 */
export async function getCachedRates({ hotelKey, hotelName, city, checkIn, checkOut, currency = 'USD', timeoutMs }) {
  const key = `price:${hotelKey}:${checkIn}:${checkOut}:${currency}`;
  try {
    const cached = await kv.get(key);
    const envelope = readCachedEnvelope(cached);
    if (envelope) {
      const fresh = isFresh(envelope.cachedAt);
      const normalized = normalizeRatesResult(envelope.result, {
        fromCache: true,
        freshness: fresh ? 'fresh' : 'stale',
        partial: !fresh,
        checkedAt: envelope.result?.lastCheckedAt || envelope.cachedAt,
      });

      if (!fresh) {
        fetchAndCacheRates(key, { hotelKey, hotelName, city, checkIn, checkOut, currency, timeoutMs }).catch(() => {});
      }

      return normalized;
    }
  } catch {
    // Cache miss or error — fall through to live fetch
  }

  return await fetchAndCacheRates(key, { hotelKey, hotelName, city, checkIn, checkOut, currency, timeoutMs });
}

/**
 * Get heatmap with KV caching.
 * Cache key: heatmap:{hotelKey}:{checkOut}
 */
export async function getCachedHeatmap({ hotelKey, checkOut, timeoutMs }) {
  const key = `heatmap:${hotelKey}:${checkOut}`;
  try {
    const cached = await kv.get(key);
    if (cached) {
      return {
        ...cached,
        provider: cached.provider || 'xotelo',
        source: cached.source || 'xotelo',
        priceSource: cached.priceSource || 'heatmap',
        freshness: cached.freshness || 'fresh',
        partial: cached.partial || false,
        fromCache: true,
      };
    }
  } catch {
    // Cache miss or error — fall through to live fetch
  }

  const result = await getHeatmap({ hotelKey, checkOut, timeoutMs });
  const normalized = {
    ...result,
    provider: 'xotelo',
    source: 'xotelo',
    priceSource: 'heatmap',
    lastCheckedAt: nowIso(),
    freshness: 'live',
    partial: false,
  };

  kv.setWithTTL(key, normalized, HEATMAP_TTL).catch(() => {});

  return { ...normalized, fromCache: false };
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
