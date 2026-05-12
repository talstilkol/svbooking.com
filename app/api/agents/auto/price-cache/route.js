// Price Cache Agent — Pre-warms the price cache for all catalog hotels.
// Fetches heatmaps for strategic checkout dates so user searches are instant.
// Processes in batches of 4 with 1s delay to respect Xotelo rate limits.

import { runAgent, verifyCronAuth, withConcurrency, AGENT_NAMES } from '@/lib/agent-utils';
import { getCachedHeatmap } from '@/lib/price-cache';
import { HOTELS } from '@/lib/hotels-catalog';

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function runPriceCache() {
  const today = new Date().toISOString().split('T')[0];
  const defaultNights = 2;

  // Strategic checkout dates that cover most user search patterns
  const checkOutDates = [
    addDays(today, 14 + defaultNights),  // 2 weeks out
    addDays(today, 30 + defaultNights),  // 1 month out
  ];

  let processed = 0;
  let cacheHits = 0;
  let cacheMisses = 0;
  let errors = 0;

  // Build work items: each hotel × each checkout date
  const workItems = HOTELS.flatMap((hotel) =>
    checkOutDates.map((checkOut) => ({ hotel, checkOut }))
  );

  const results = await withConcurrency(workItems, 4, async ({ hotel, checkOut }) => {
    try {
      const result = await getCachedHeatmap({
        hotelKey: hotel.hotelKey,
        checkOut,
        timeoutMs: 12000,
      });
      processed++;
      if (result.fromCache) {
        cacheHits++;
      } else {
        cacheMisses++;
      }
      return { ok: true, cached: result.fromCache };
    } catch {
      errors++;
      return { ok: false };
    }
  }, 1000); // 1s delay between batches

  return {
    hotelsInCatalog: HOTELS.length,
    checkOutDates,
    totalRequests: workItems.length,
    processed,
    cacheHits,
    cacheMisses,
    errors,
    cacheHitRate: processed > 0 ? `${Math.round((cacheHits / processed) * 100)}%` : '0%',
  };
}

export async function GET(request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const status = await runAgent(AGENT_NAMES.PRICE_CACHE, runPriceCache);
    return Response.json(status);
  } catch (err) {
    return Response.json(
      { status: 'error', error: err.message },
      { status: 500 }
    );
  }
}
