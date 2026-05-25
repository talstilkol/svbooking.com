/**
 * GET /api/compare/prefetch?hotelKey=... — Speculative cache warming.
 *
 * Called by the hotel detail page on mount (fire-and-forget) to pre-warm
 * the price cache for common date ranges BEFORE the user clicks "Compare".
 *
 * Warms: next weekend (Fri-Sun), +7 days, +14 days (2-night stays).
 * Returns 202 immediately — the warming happens in the background.
 *
 * Rate limited to 20/min/IP to prevent abuse.
 */

import { getCachedRates } from '@/lib/price-cache';
import { findHotel } from '@/lib/hotels-catalog';
import { bumpHotelPopularity } from '@/lib/hotel-popularity';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { addDays, toIsoDate } from '@/lib/utils/date';

const prefetchLimiter = rateLimit({ namespace: 'compare-prefetch', limit: 20, window: 60, failOpen: true });

const DEFAULT_NIGHTS = 2;

/** Get the next Friday from a given date string (for weekend searches) */
function nextFriday(fromDateStr) {
  const date = new Date(fromDateStr);
  const day = date.getDay(); // 0=Sun, 5=Fri
  const daysUntilFriday = (5 - day + 7) % 7 || 7; // next Friday, not today
  return addDays(fromDateStr, daysUntilFriday);
}

/** Build speculative date ranges: next weekend, +7d, +14d */
function buildPrefetchDates(today) {
  const friday = nextFriday(today);
  return [
    { checkIn: friday, checkOut: addDays(friday, DEFAULT_NIGHTS) },
    { checkIn: addDays(today, 7), checkOut: addDays(today, 7 + DEFAULT_NIGHTS) },
    { checkIn: addDays(today, 14), checkOut: addDays(today, 14 + DEFAULT_NIGHTS) },
  ];
}

export async function GET(request) {
  try {
    const ip = getClientIp(request);
    const { success, reset } = await prefetchLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    const { searchParams } = new URL(request.url);
    const hotelKey = searchParams.get('hotelKey');
    if (!hotelKey) {
      return Response.json({ error: 'Missing hotelKey' }, { status: 400 });
    }

    const hotel = findHotel(hotelKey);
    if (!hotel) {
      return Response.json({ error: 'Hotel not found' }, { status: 404 });
    }

    // Fire-and-forget: bump popularity + warm cache
    bumpHotelPopularity(hotelKey);

    const today = toIsoDate();
    const dates = buildPrefetchDates(today);

    // Background warming — don't await, return immediately
    Promise.all(
      dates.map((d) =>
        getCachedRates({
          hotelKey,
          hotelName: hotel.name,
          city: hotel.city,
          checkIn: d.checkIn,
          checkOut: d.checkOut,
          currency: 'USD',
          timeoutMs: 10000,
        }).catch(() => {})
      )
    ).catch(() => {});

    return new Response(null, {
      status: 202,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return new Response(null, { status: 202 });
  }
}

// Exported for testing
export { buildPrefetchDates, nextFriday };
