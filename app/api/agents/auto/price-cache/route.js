// Price Cache Agent: pre-warms dated provider rates for priority demand and
// heatmaps as trend signals only. Heatmaps are never treated as booking offers.

import { runAgent, verifyCronAuth, withConcurrency, AGENT_NAMES } from '@/lib/agent-utils';
import { getCachedHeatmap, getCachedRates } from '@/lib/price-cache';
import { HOTELS, findHotel } from '@/lib/hotels-catalog';
import { kv } from '@/lib/kv';
import { addDays } from '@/lib/utils/date';
import { PRICE_ALERT_USER_INDEX_KEY, userDataKey } from '@/lib/user-data';
import { getHotelPopularity } from '@/lib/hotel-popularity';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const DEFAULT_NIGHTS = 2;

/** Regional currencies for multi-currency pre-warming of popular hotels.
 *  Popular hotels in these countries also get pre-warmed in the local currency. */
const REGIONAL_CURRENCIES = {
  France: 'EUR', Italy: 'EUR', Spain: 'EUR', Germany: 'EUR', Greece: 'EUR',
  Portugal: 'EUR', Netherlands: 'EUR', Austria: 'EUR', Belgium: 'EUR',
  Ireland: 'EUR', Finland: 'EUR', Croatia: 'EUR',
  UK: 'GBP', 'United Kingdom': 'GBP',
  Japan: 'JPY', Thailand: 'THB', India: 'INR',
  Turkey: 'EUR', Morocco: 'EUR', Egypt: 'EUR',
};
const DEFAULT_CATALOG_DATED_HOTEL_LIMIT = 80;
/** Top N popular hotels are pre-warmed in EVERY cron run regardless of cohort */
const ALWAYS_WARM_TOP_N = 20;
const DEFAULT_HEATMAP_HOTEL_LIMIT = HOTELS.length;
const MAX_CATALOG_DATED_HOTEL_LIMIT = 200;
const MAX_HEATMAP_HOTEL_LIMIT = HOTELS.length;
const MAX_ALERT_DATED_ITEMS = 100;
const DATED_RATE_CHECK_IN_OFFSETS = [1, 3, 7, 14, 30];
/** Extra offsets for popular hotels — fills gaps to give top hotels broader date coverage */
const POPULAR_EXTRA_OFFSETS = [5, 10, 21];
const HEATMAP_CHECK_OUT_OFFSETS = DATED_RATE_CHECK_IN_OFFSETS.map((offset) => offset + DEFAULT_NIGHTS);

/** Get days until the next Friday from a base date (always > 0, never same day) */
function daysUntilFriday(baseDateStr) {
  const d = new Date(baseDateStr);
  const day = d.getDay(); // 0=Sun, 5=Fri
  return (5 - day + 7) % 7 || 7;
}

/** Get days until the 2nd Friday from a base date */
function daysUntilSecondFriday(baseDateStr) {
  return daysUntilFriday(baseDateStr) + 7;
}

function parseLimit(value, fallback, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(Math.floor(parsed), max));
}

function rateWorkItemKey(item) {
  return [
    item.hotelKey,
    item.checkIn,
    item.checkOut,
    item.currency || 'USD',
  ].join(':');
}

function heatmapWorkItemKey(item) {
  return `${item.hotel.hotelKey}:${item.checkOut}`;
}

function dedupeBy(items, keyFn) {
  const seen = new Set();
  const deduped = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

/**
 * Sort catalog hotels by a composite priority:
 *   1. Popularity (user request count from last 7 days) — higher is better
 *   2. City density (more hotels in city = higher priority)
 *   3. Alphabetical tiebreaker (deterministic)
 *
 * @param {Array} hotels
 * @param {Object} popularity - { [hotelKey]: requestCount } from KV
 */
function sortCatalogByPriority(hotels = HOTELS, popularity = {}) {
  const cityCounts = new Map();
  for (const hotel of hotels) {
    cityCounts.set(hotel.city, (cityCounts.get(hotel.city) || 0) + 1);
  }

  return [...hotels].sort((a, b) => {
    // Popular hotels first (higher request count = higher priority)
    const popDiff = (popularity[b.hotelKey] || 0) - (popularity[a.hotelKey] || 0);
    if (popDiff !== 0) return popDiff;

    // Then by city density
    const countDiff = (cityCounts.get(b.city) || 0) - (cityCounts.get(a.city) || 0);
    if (countDiff !== 0) return countDiff;

    // Deterministic tiebreaker
    return [
      a.country.localeCompare(b.country),
      a.city.localeCompare(b.city),
      a.name.localeCompare(b.name),
      a.hotelKey.localeCompare(b.hotelKey),
    ].find((result) => result !== 0) || 0;
  });
}

/**
 * Select catalog hotels for pre-warming with cohort rotation.
 * Each cron run picks a different slice of the sorted catalog so that
 * over N runs/day, the entire catalog gets covered.
 *
 * @param {Object} opts
 * @param {Array} opts.hotels - Full catalog
 * @param {number} opts.limit - Hotels per run
 * @param {number} opts.cohort - Cohort index (0-based), defaults to hour-based rotation
 */
export function selectPriorityCatalogHotels(hotels = HOTELS, limit = DEFAULT_CATALOG_DATED_HOTEL_LIMIT, cohort = -1, popularity = {}) {
  const sorted = sortCatalogByPriority(hotels, popularity);
  if (limit >= sorted.length) return sorted;

  // Always-warm tier: top N popular hotels are included in EVERY run.
  // This ensures high-demand hotels (those users actually search for) always
  // have fresh data, while lower-demand hotels still rotate through cohorts.
  const hasPopularity = Object.keys(popularity).length > 0;
  const alwaysWarmCount = hasPopularity ? Math.min(ALWAYS_WARM_TOP_N, Math.floor(limit * 0.3), sorted.length) : 0;
  const alwaysWarm = sorted.slice(0, alwaysWarmCount);
  const alwaysWarmKeys = new Set(alwaysWarm.map((h) => h.hotelKey));

  // Remaining catalog (excluding always-warm hotels)
  const remaining = sorted.filter((h) => !alwaysWarmKeys.has(h.hotelKey));
  const cohortSlots = limit - alwaysWarmCount;

  // Determine cohort: how many full cohorts fit in the remaining catalog
  const totalCohorts = Math.max(1, Math.ceil(remaining.length / cohortSlots));
  const cohortIndex = cohort >= 0 ? cohort % totalCohorts : Math.floor(new Date().getUTCHours() / 8) % totalCohorts;
  const offset = cohortIndex * cohortSlots;

  // Fill cohort slots from remaining hotels (wrap around)
  const cohortSlice = [];
  for (let i = 0; i < cohortSlots && i < remaining.length; i++) {
    cohortSlice.push(remaining[(offset + i) % remaining.length]);
  }

  return [...alwaysWarm, ...cohortSlice];
}

export function buildCatalogDatedRateWorkItems({
  today,
  hotels = HOTELS,
  limit = DEFAULT_CATALOG_DATED_HOTEL_LIMIT,
  cohort = -1,
  popularity = {},
} = {}) {
  const baseDate = today || new Date().toISOString().split('T')[0];

  // Weekend offsets: next Friday and Friday after that (Fri-Sun, 2 nights)
  // These are dynamic — they land on actual Fridays regardless of what day today is.
  const weekendOffsets = [
    daysUntilFriday(baseDate),
    daysUntilSecondFriday(baseDate),
  ];

  // Base offsets: static + weekend (deduplication happens via rateWorkItemKey)
  const baseOffsets = [...new Set([...DATED_RATE_CHECK_IN_OFFSETS, ...weekendOffsets])].sort((a, b) => a - b);

  // Popular hotels get extra date offsets to fill gaps (5d, 10d, 21d)
  // This gives high-demand hotels broader cache coverage so users more often
  // hit a cached result regardless of which dates they search.
  const popularKeys = new Set(
    Object.entries(popularity)
      .filter(([, count]) => count >= 5) // At least 5 requests in the last week
      .map(([key]) => key)
  );
  const expandedOffsets = [...new Set([...baseOffsets, ...POPULAR_EXTRA_OFFSETS])].sort((a, b) => a - b);

  return selectPriorityCatalogHotels(hotels, limit, cohort, popularity).flatMap((hotel) => {
    const isPopular = popularKeys.has(hotel.hotelKey);
    const offsets = isPopular ? expandedOffsets : baseOffsets;

    // Base USD items
    const items = offsets.map((offset) => {
      const checkIn = addDays(baseDate, offset);
      return {
        source: 'catalog-priority',
        hotelKey: hotel.hotelKey,
        hotelName: hotel.name,
        city: hotel.city,
        checkIn,
        checkOut: addDays(checkIn, DEFAULT_NIGHTS),
        currency: 'USD',
      };
    });

    // Popular hotels in regions with a local currency also get pre-warmed in
    // that currency (e.g., EUR for Paris hotels). Only 3 key offsets to keep volume manageable.
    if (isPopular) {
      const localCurrency = REGIONAL_CURRENCIES[hotel.country];
      if (localCurrency && localCurrency !== 'USD') {
        const keyOffsets = [3, 7, 14]; // Near-term only for local currency
        for (const offset of keyOffsets) {
          const checkIn = addDays(baseDate, offset);
          items.push({
            source: 'catalog-priority',
            hotelKey: hotel.hotelKey,
            hotelName: hotel.name,
            city: hotel.city,
            checkIn,
            checkOut: addDays(checkIn, DEFAULT_NIGHTS),
            currency: localCurrency,
          });
        }
      }
    }

    return items;
  });
}

export function buildHeatmapWorkItems({
  today,
  hotels = HOTELS,
  limit = DEFAULT_HEATMAP_HOTEL_LIMIT,
} = {}) {
  const baseDate = today || new Date().toISOString().split('T')[0];
  return hotels.slice(0, limit).flatMap((hotel) =>
    HEATMAP_CHECK_OUT_OFFSETS.map((offset) => ({
      hotel,
      checkOut: addDays(baseDate, offset),
    }))
  );
}

async function collectActiveAlertRateWorkItems(limit = MAX_ALERT_DATED_ITEMS) {
  const users = (await kv.get(PRICE_ALERT_USER_INDEX_KEY)) || [];
  const workItems = [];

  for (const uid of users.slice(0, 1000)) {
    const alerts = (await kv.get(userDataKey(uid, 'priceAlerts'))) || [];
    for (const alert of alerts) {
      if (alert?.status !== 'active') continue;
      if (!alert.hotelKey || !alert.checkIn || !alert.checkOut) continue;
      const hotel = findHotel(alert.hotelKey);
      if (!hotel) continue;

      workItems.push({
        source: 'active-price-alert',
        hotelKey: hotel.hotelKey,
        hotelName: hotel.name,
        city: hotel.city,
        checkIn: alert.checkIn,
        checkOut: alert.checkOut,
        currency: alert.currency || 'USD',
      });

      if (workItems.length >= limit) return dedupeBy(workItems, rateWorkItemKey);
    }
  }

  return dedupeBy(workItems, rateWorkItemKey);
}

function emptyStats(totalRequests) {
  return {
    totalRequests,
    processed: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
  };
}

/**
 * Reorder work items so stale/missing cache entries come first.
 * This maximizes value per cron run: if the run is interrupted or rate-limited,
 * the most impactful refreshes have already happened.
 */
async function prioritizeByFreshness(workItems, keyFn) {
  if (workItems.length === 0) return workItems;
  const keys = workItems.map(keyFn);
  let cached;
  try {
    cached = await kv.mget(keys);
  } catch {
    return workItems; // Can't check — keep original order
  }

  // Score: 0 = missing, 1 = stale (has data but old), 2 = fresh (skip-friendly)
  const now = Date.now();
  const scored = workItems.map((item, i) => {
    const entry = cached[i];
    if (!entry) return { item, priority: 0 };
    const cachedAt = entry?.cachedAt || entry?.result?.lastCheckedAt;
    const age = cachedAt ? (now - Date.parse(cachedAt)) / 1000 : Infinity;
    // Treat anything older than 1h as stale, under 1h as fresh
    return { item, priority: age > 3600 ? 1 : 2 };
  });

  // Stable sort: missing → stale → fresh (preserves original order within tiers)
  scored.sort((a, b) => a.priority - b.priority);
  return scored.map((s) => s.item);
}

async function prewarmDatedRates(workItems) {
  const stats = emptyStats(workItems.length);
  const bySource = {};

  // Reorder: stale/missing items first for maximum cron value
  const ordered = await prioritizeByFreshness(workItems, (item) =>
    `price:${item.hotelKey}:${item.checkIn}:${item.checkOut}:${item.currency || 'USD'}`
  );

  // Higher concurrency (12) — Xotelo is free/unlimited so we can push throughput.
  // Adaptive delay: skip delay on cache hits, 80ms between provider calls.
  await withConcurrency(ordered, 12, async (item) => {
    bySource[item.source] = (bySource[item.source] || 0) + 1;
    try {
      const result = await getCachedRates({
        hotelKey: item.hotelKey,
        hotelName: item.hotelName,
        city: item.city,
        checkIn: item.checkIn,
        checkOut: item.checkOut,
        currency: item.currency,
        timeoutMs: 5000, // Tighter than user-facing (10s) — cron has volume priority
      });
      stats.processed++;
      if (result.fromCache) stats.cacheHits++;
      else stats.cacheMisses++;
      return { ok: true, cached: result.fromCache };
    } catch {
      stats.errors++;
      return { ok: false };
    }
  }, (r) => r?.value?.cached ? 0 : 80);

  return {
    ...stats,
    bySource,
    cacheHitRate: stats.processed > 0 ? `${Math.round((stats.cacheHits / stats.processed) * 100)}%` : '0%',
  };
}

async function prewarmHeatmaps(workItems) {
  const stats = emptyStats(workItems.length);

  // Reorder: stale/missing heatmaps first
  const ordered = await prioritizeByFreshness(workItems, (item) =>
    `heatmap:${item.hotel.hotelKey}:${item.checkOut}`
  );

  await withConcurrency(ordered, 12, async ({ hotel, checkOut }) => {
    try {
      const result = await getCachedHeatmap({
        hotelKey: hotel.hotelKey,
        checkOut,
        timeoutMs: 8000, // Tighter for cron (user-facing gets 12s)
      });
      stats.processed++;
      if (result.fromCache) stats.cacheHits++;
      else stats.cacheMisses++;
      return { ok: true, cached: result.fromCache };
    } catch {
      stats.errors++;
      return { ok: false };
    }
  }, (r) => r?.value?.cached ? 0 : 200);

  return {
    ...stats,
    cacheHitRate: stats.processed > 0 ? `${Math.round((stats.cacheHits / stats.processed) * 100)}%` : '0%',
  };
}

async function runPriceCache({
  catalogLimit = DEFAULT_CATALOG_DATED_HOTEL_LIMIT,
  heatmapLimit = DEFAULT_HEATMAP_HOTEL_LIMIT,
  cohort = -1,
} = {}) {
  const today = new Date().toISOString().split('T')[0];
  const popularity = await getHotelPopularity();
  const catalogDated = buildCatalogDatedRateWorkItems({ today, limit: catalogLimit, cohort, popularity });
  const alertDated = await collectActiveAlertRateWorkItems();
  const datedWorkItems = dedupeBy([...alertDated, ...catalogDated], rateWorkItemKey);
  const heatmapWorkItems = dedupeBy(buildHeatmapWorkItems({ today, limit: heatmapLimit }), heatmapWorkItemKey);

  // Run dated rates and heatmaps in parallel — they use different APIs
  const [datedRates, heatmaps] = await Promise.all([
    prewarmDatedRates(datedWorkItems),
    prewarmHeatmaps(heatmapWorkItems),
  ]);

  // Resolve actual cohort index for reporting.
  // With 3 daily runs (every 8 hours), rotate through cohorts automatically.
  const hasPopularity = Object.keys(popularity).length > 0;
  const alwaysWarmCount = hasPopularity ? Math.min(ALWAYS_WARM_TOP_N, Math.floor(catalogLimit * 0.3), HOTELS.length) : 0;
  const cohortSlots = catalogLimit - alwaysWarmCount;
  const remainingHotels = HOTELS.length - alwaysWarmCount;
  const totalCohorts = Math.max(1, Math.ceil(remainingHotels / cohortSlots));
  const resolvedCohort = cohort >= 0
    ? cohort % totalCohorts
    : Math.floor(new Date().getUTCHours() / 8) % totalCohorts;

  return {
    mode: 'dated-provider-rates-plus-heatmap-price-sources',
    hotelsInCatalog: HOTELS.length,
    datedRateCheckInOffsets: DATED_RATE_CHECK_IN_OFFSETS,
    heatmapCheckOutOffsets: HEATMAP_CHECK_OUT_OFFSETS,
    datedRates,
    heatmaps,
    durableCacheRequired: true,
    config: {
      catalogDatedHotelLimit: catalogLimit,
      heatmapHotelLimit: heatmapLimit,
      cohort: resolvedCohort,
      totalCohorts,
      alwaysWarmHotels: alwaysWarmCount,
    },
  };
}

export async function GET(request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const catalogLimit = parseLimit(
      searchParams.get('catalogLimit'),
      DEFAULT_CATALOG_DATED_HOTEL_LIMIT,
      MAX_CATALOG_DATED_HOTEL_LIMIT
    );
    const heatmapLimit = parseLimit(
      searchParams.get('heatmapLimit'),
      DEFAULT_HEATMAP_HOTEL_LIMIT,
      MAX_HEATMAP_HOTEL_LIMIT
    );
    const cohort = searchParams.has('cohort') ? Number(searchParams.get('cohort')) : -1;
    const status = await runAgent(
      AGENT_NAMES.PRICE_CACHE,
      () => runPriceCache({ catalogLimit, heatmapLimit, cohort: Number.isFinite(cohort) ? cohort : -1 })
    );
    return Response.json(status, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('GET /api/agents/auto/price-cache error:', err);
    return Response.json(
      { status: 'error', error: 'Price cache unavailable' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
