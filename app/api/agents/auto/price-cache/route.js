// Price Cache Agent: pre-warms dated provider rates for priority demand and
// heatmaps as trend signals only. Heatmaps are never treated as booking offers.

import { runAgent, verifyCronAuth, withConcurrency, AGENT_NAMES } from '@/lib/agent-utils';
import { getCachedHeatmap, getCachedRates } from '@/lib/price-cache';
import { HOTELS, findHotel } from '@/lib/hotels-catalog';
import { kv } from '@/lib/kv';
import { addDays } from '@/lib/utils/date';
import { PRICE_ALERT_USER_INDEX_KEY, userDataKey } from '@/lib/user-data';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const DEFAULT_NIGHTS = 2;
const DEFAULT_CATALOG_DATED_HOTEL_LIMIT = 80;
const DEFAULT_HEATMAP_HOTEL_LIMIT = HOTELS.length;
const MAX_CATALOG_DATED_HOTEL_LIMIT = 200;
const MAX_HEATMAP_HOTEL_LIMIT = HOTELS.length;
const MAX_ALERT_DATED_ITEMS = 100;
const DATED_RATE_CHECK_IN_OFFSETS = [7, 14, 30];
const HEATMAP_CHECK_OUT_OFFSETS = DATED_RATE_CHECK_IN_OFFSETS.map((offset) => offset + DEFAULT_NIGHTS);

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

export function selectPriorityCatalogHotels(hotels = HOTELS, limit = DEFAULT_CATALOG_DATED_HOTEL_LIMIT) {
  const cityCounts = new Map();
  for (const hotel of hotels) {
    cityCounts.set(hotel.city, (cityCounts.get(hotel.city) || 0) + 1);
  }

  return [...hotels]
    .sort((a, b) => {
      const countDiff = (cityCounts.get(b.city) || 0) - (cityCounts.get(a.city) || 0);
      if (countDiff !== 0) return countDiff;
      return [
        a.country.localeCompare(b.country),
        a.city.localeCompare(b.city),
        a.name.localeCompare(b.name),
        a.hotelKey.localeCompare(b.hotelKey),
      ].find((result) => result !== 0) || 0;
    })
    .slice(0, limit);
}

export function buildCatalogDatedRateWorkItems({
  today,
  hotels = HOTELS,
  limit = DEFAULT_CATALOG_DATED_HOTEL_LIMIT,
} = {}) {
  const baseDate = today || new Date().toISOString().split('T')[0];
  return selectPriorityCatalogHotels(hotels, limit).flatMap((hotel) =>
    DATED_RATE_CHECK_IN_OFFSETS.map((offset) => {
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
    })
  );
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

async function prewarmDatedRates(workItems) {
  const stats = emptyStats(workItems.length);
  const bySource = {};

  await withConcurrency(workItems, 6, async (item) => {
    bySource[item.source] = (bySource[item.source] || 0) + 1;
    try {
      const result = await getCachedRates({
        hotelKey: item.hotelKey,
        hotelName: item.hotelName,
        city: item.city,
        checkIn: item.checkIn,
        checkOut: item.checkOut,
        currency: item.currency,
        timeoutMs: 8000,
      });
      stats.processed++;
      if (result.fromCache) stats.cacheHits++;
      else stats.cacheMisses++;
      return { ok: true, cached: result.fromCache };
    } catch {
      stats.errors++;
      return { ok: false };
    }
  }, 200);

  return {
    ...stats,
    bySource,
    cacheHitRate: stats.processed > 0 ? `${Math.round((stats.cacheHits / stats.processed) * 100)}%` : '0%',
  };
}

async function prewarmHeatmaps(workItems) {
  const stats = emptyStats(workItems.length);

  await withConcurrency(workItems, 6, async ({ hotel, checkOut }) => {
    try {
      const result = await getCachedHeatmap({
        hotelKey: hotel.hotelKey,
        checkOut,
        timeoutMs: 12000,
      });
      stats.processed++;
      if (result.fromCache) stats.cacheHits++;
      else stats.cacheMisses++;
      return { ok: true, cached: result.fromCache };
    } catch {
      stats.errors++;
      return { ok: false };
    }
  }, 400);

  return {
    ...stats,
    cacheHitRate: stats.processed > 0 ? `${Math.round((stats.cacheHits / stats.processed) * 100)}%` : '0%',
  };
}

async function runPriceCache({
  catalogLimit = DEFAULT_CATALOG_DATED_HOTEL_LIMIT,
  heatmapLimit = DEFAULT_HEATMAP_HOTEL_LIMIT,
} = {}) {
  const today = new Date().toISOString().split('T')[0];
  const catalogDated = buildCatalogDatedRateWorkItems({ today, limit: catalogLimit });
  const alertDated = await collectActiveAlertRateWorkItems();
  const datedWorkItems = dedupeBy([...alertDated, ...catalogDated], rateWorkItemKey);
  const heatmapWorkItems = dedupeBy(buildHeatmapWorkItems({ today, limit: heatmapLimit }), heatmapWorkItemKey);

  const datedRates = await prewarmDatedRates(datedWorkItems);
  const heatmaps = await prewarmHeatmaps(heatmapWorkItems);

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
    const status = await runAgent(
      AGENT_NAMES.PRICE_CACHE,
      () => runPriceCache({ catalogLimit, heatmapLimit })
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
