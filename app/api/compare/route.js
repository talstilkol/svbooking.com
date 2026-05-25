import { getCachedRates, invalidateRates } from '@/lib/price-cache';
import { listCities, getHotelsByCity, findHotel, getFullCatalog } from '@/lib/hotels-catalog';
import { kv } from '@/lib/kv';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { bumpHotelPopularity } from '@/lib/hotel-popularity';
import { buildComparisonResponse } from './helpers';

// Rate limiter: 30 price comparisons per minute per IP
const compareLimiter = rateLimit({ namespace: 'compare', limit: 30, window: 60, failOpen: false });
// Stricter limiter for refresh: 5 per minute per IP (forces live fetch)
const refreshLimiter = rateLimit({ namespace: 'compare-refresh', limit: 5, window: 60, failOpen: false });
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

// GET /api/compare
//   ?city=Paris                                      -> list hotels in city
//   ?hotelKey=g187147-d188728&checkIn=...&checkOut=...  -> compare prices across OTAs
//   (no params)                                      -> list all cities + all hotels
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const hotelKey = searchParams.get('hotelKey');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const currency = searchParams.get('currency') || 'USD';

    // Mode 1: compare prices for a specific hotel
    if (hotelKey) {
      // If no dates, return just hotel catalog info (for detail page header)
      if (!checkIn || !checkOut) {
        const hotel = findHotel(hotelKey);
        if (!hotel) return Response.json({ error: 'Hotel not found' }, { status: 404, headers: NO_STORE_HEADERS });
        return Response.json({ hotel }, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
      }

      // Rate limit dated comparison requests before they can reach external providers.
      const ip = getClientIp(request);
      const { success, reset } = await compareLimiter.check(ip);
      if (!success) return rateLimitResponse(reset);

      const hotel = findHotel(hotelKey);
      if (!hotel) return Response.json({ error: 'Hotel not found' }, { status: 404, headers: NO_STORE_HEADERS });

      // Fire-and-forget: bump popularity counter for pre-warm prioritization
      bumpHotelPopularity(hotelKey);

      const result = await getCachedRates({
        hotelKey,
        hotelName: hotel.name,
        city: hotel.city,
        checkIn,
        checkOut,
        currency,
      });

      const responseData = buildComparisonResponse({ result, hotel, checkIn, checkOut, currency,
        nights: Math.max(1, Math.round(
          (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
        )),
      });

      // Store price history only for fresh live observations, never for stale cache replays.
      if (responseData.cheapest && result?.freshness === 'live' && !result?.fromCache) {
        (async () => {
          try {
            const snapshot = {
              date: new Date().toISOString().split('T')[0],
              price: responseData.cheapest.total,
              provider: responseData.cheapest.provider,
              source: responseData.cheapest.source,
              lastCheckedAt: responseData.cheapest.lastCheckedAt,
            };
            const historyKey = `price-history:${hotelKey}`;
            const history = (await kv.get(historyKey)) || [];
            // Dedup: only one entry per day
            if (!history.length || history[history.length - 1].date !== snapshot.date) {
              history.push(snapshot);
              const trimmed = history.slice(-90); // keep last 90 days
              await kv.setWithTTL(historyKey, trimmed, 90 * 86400);
            }
          } catch { /* non-critical */ }
        })();
      }

      return Response.json(
        responseData,
        { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } }
      );
    }

    // Mode 2: list hotels in a city (static catalog data)
    if (city) {
      return Response.json(
        { city, hotels: getHotelsByCity(city) },
        { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' } }
      );
    }

    // Mode 3: catalog (cacheable for 5 minutes) — includes KV-discovered hotels
    const fullCatalog = await getFullCatalog();
    return Response.json(
      { cities: listCities(), hotels: fullCatalog },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (err) {
    console.error('GET /api/compare error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

// POST /api/compare — Force-refresh prices (invalidate cache, then fetch live)
// Body: { hotelKey, checkIn, checkOut, currency? }
export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const { success, reset } = await refreshLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    const body = await request.json();
    const { hotelKey, checkIn, checkOut, currency = 'USD' } = body || {};

    if (!hotelKey || !checkIn || !checkOut) {
      return Response.json(
        { error: 'Missing required fields: hotelKey, checkIn, checkOut' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const hotel = findHotel(hotelKey);
    if (!hotel) {
      return Response.json({ error: 'Hotel not found' }, { status: 404, headers: NO_STORE_HEADERS });
    }

    // Invalidate cached entry so getCachedRates fetches live
    await invalidateRates({ hotelKey, checkIn, checkOut, currency }).catch(() => {});

    // Fetch fresh rates (will go to providers since cache is now empty)
    const result = await getCachedRates({
      hotelKey,
      hotelName: hotel.name,
      city: hotel.city,
      checkIn,
      checkOut,
      currency,
    });

    const responseData = buildComparisonResponse({ result, hotel, checkIn, checkOut, currency,
      nights: Math.max(1, Math.round(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
      )),
    });

    // Ensure live fetch metadata even if price cache layer has a stale envelope
    responseData.fromCache = false;
    responseData.freshness = 'live';
    responseData.partial = false;

    return Response.json(responseData, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('POST /api/compare error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
