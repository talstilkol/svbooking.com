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

const RATES_TTL = 3600;    // 60 minutes fresh window
const RATES_STALE_TTL = RETENTION_SECONDS.priceRatesCache;
const HEATMAP_TTL = RETENTION_SECONDS.priceHeatmapCache;

/** Max days difference for fuzzy date matching (nearby cached dates) */
const FUZZY_DATE_MAX_DAYS = 7;

/** Add ±15% random jitter to a TTL value to prevent thundering herd */
function jitteredTTL(baseTTL) {
  const jitter = baseTTL * 0.15;
  return Math.round(baseTTL + (Math.random() * 2 - 1) * jitter);
}

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

// Request coalescing: dedup concurrent in-flight fetches for the same cache key
const inflightRates = new Map();

async function fetchAndCacheRates(key, params) {
  // If an identical fetch is already in-flight, piggyback on it
  if (inflightRates.has(key)) {
    return inflightRates.get(key);
  }

  const promise = (async () => {
    const checkedAt = nowIso();
    const result = await getHotelRates(params);
    const normalized = normalizeRatesResult(result, {
      fromCache: false,
      freshness: 'live',
      partial: false,
      checkedAt,
    });

    // Cache the exact dated result
    kv.setWithTTL(key, { result: normalized, cachedAt: checkedAt }, jitteredTTL(RATES_STALE_TTL)).catch(() => {});

    // Also update the per-hotel "latest rates" for fuzzy date matching.
    // This lets nearby date searches return approximate data immediately.
    if (params.hotelKey && normalized.rates?.length > 0) {
      const latestKey = `latest-rates:${params.hotelKey}:${params.currency || 'USD'}`;
      kv.setWithTTL(latestKey, {
        result: normalized,
        cachedAt: checkedAt,
        forDates: { checkIn: params.checkIn, checkOut: params.checkOut },
      }, jitteredTTL(RATES_STALE_TTL * 2)).catch(() => {});
    }

    return normalized;
  })();

  inflightRates.set(key, promise);
  try {
    return await promise;
  } finally {
    inflightRates.delete(key);
  }
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
    // Cache miss or error — fall through to fuzzy or live fetch
  }

  // Fuzzy date match: check if we have cached rates for nearby dates.
  // If so, return them as "estimated" immediately while fetching live in background.
  try {
    const latestKey = `latest-rates:${hotelKey}:${currency}`;
    const latest = await kv.get(latestKey);
    if (latest?.result?.rates?.length > 0 && latest.forDates) {
      const requestedDate = Date.parse(checkIn);
      const cachedDate = Date.parse(latest.forDates.checkIn);
      if (Number.isFinite(requestedDate) && Number.isFinite(cachedDate)) {
        const daysDiff = Math.abs(requestedDate - cachedDate) / 86400000;
        if (daysDiff <= FUZZY_DATE_MAX_DAYS) {
          const estimated = normalizeRatesResult(latest.result, {
            fromCache: true,
            freshness: 'estimated',
            partial: true,
            checkedAt: latest.result?.lastCheckedAt || latest.cachedAt,
          });
          estimated.estimatedFromDates = latest.forDates;
          // Fire-and-forget: fetch exact dates in background
          fetchAndCacheRates(key, { hotelKey, hotelName, city, checkIn, checkOut, currency, timeoutMs }).catch(() => {});
          return estimated;
        }
      }
    }
  } catch {
    // Fuzzy lookup failed — fall through to live fetch
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

  kv.setWithTTL(key, normalized, jitteredTTL(HEATMAP_TTL)).catch(() => {});

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
