import { getCachedRates, invalidateRates } from '@/lib/price-cache';
import { listCities, getHotelsByCity, findHotel, getFullCatalog } from '@/lib/hotels-catalog';
import { kv } from '@/lib/kv';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { bumpHotelPopularity } from '@/lib/hotel-popularity';

// Rate limiter: 30 price comparisons per minute per IP
const compareLimiter = rateLimit({ namespace: 'compare', limit: 30, window: 60, failOpen: false });
// Stricter limiter for refresh: 5 per minute per IP (forces live fetch)
const refreshLimiter = rateLimit({ namespace: 'compare-refresh', limit: 5, window: 60, failOpen: false });
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function fallbackCode(provider, index) {
  return String(provider || `provider-${index + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, '-') || `provider-${index + 1}`;
}

/**
 * Compute a quality score (0-100) for a rate based on data completeness and freshness.
 * Higher score = more reliable price observation.
 */
function computeRateScore(rate, result) {
  let score = 50; // Base score for having a total price

  // Freshness bonus
  const freshness = rate?.freshness || result?.freshness;
  if (freshness === 'live') score += 20;
  else if (freshness === 'fresh') score += 10;
  else if (freshness === 'stale') score -= 10;

  // Tax clarity bonus
  if (rate?.taxesIncluded === true || rate?.taxesIncluded === false) score += 10;

  // Has separate tax amount
  if (toNumber(rate?.tax) > 0) score += 5;

  // Deep link available (verifiable)
  if (rate?.deepLink) score += 5;

  // Room name specified
  if (rate?.roomName) score += 5;

  // Not partial
  if (!rate?.partial && !result?.partial) score += 5;

  return Math.max(0, Math.min(100, score));
}

function normalizePublicRate(rate, result, index) {
  const provider = rate?.provider || rate?.name || result?.provider || result?.source || 'Unknown provider';
  const baseRate = toNumber(rate?.rate);
  const tax = toNumber(rate?.tax);
  const total = toNumber(rate?.total) || baseRate + tax;

  const normalized = {
    provider,
    code: rate?.code || fallbackCode(provider, index),
    rate: baseRate,
    tax,
    total,
    currency: rate?.currency || result?.currency || 'USD',
    source: rate?.source || result?.source || null,
    freshness: rate?.freshness || result?.freshness || 'unknown',
    partial: Boolean(rate?.partial ?? result?.partial),
    deepLink: rate?.deepLink || null,
    taxesIncluded: rate?.taxesIncluded ?? result?.taxesIncluded ?? null,
    cancellationPolicy: rate?.cancellationPolicy || null,
    roomName: rate?.roomName || null,
    lastCheckedAt: rate?.lastCheckedAt || result?.lastCheckedAt || null,
    priceAccuracyState: rate?.priceAccuracyState || 'unobserved',
  };

  normalized.score = computeRateScore(normalized, result);
  normalized.scoreBasis = normalized.score >= 70 ? 'high' : normalized.score >= 40 ? 'medium' : 'low';

  return normalized;
}

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
      const rates = (result?.rates || [])
        .map((r, index) => normalizePublicRate(r, result, index))
        .filter((r) => r.total > 0)
        .sort((a, b) => a.total - b.total);

      const cheapest = rates[0] || null;
      const mostExpensive = rates[rates.length - 1] || null;
      const savingsPct =
        cheapest && mostExpensive && mostExpensive.total > 0
          ? Math.round(((mostExpensive.total - cheapest.total) / mostExpensive.total) * 100)
          : 0;

      const responseData = {
        hotel,
        checkIn: result?.chk_in || checkIn,
        checkOut: result?.chk_out || checkOut,
        currency: result?.currency || currency,
        rates,
        cheapest,
        mostExpensive,
        savingsPct,
        savingsAmount: cheapest && mostExpensive ? Number((mostExpensive.total - cheapest.total).toFixed(2)) : 0,
        providerCount: rates.length,
        fromCache: Boolean(result?.fromCache),
        freshness: result?.freshness || 'unknown',
        partial: Boolean(result?.partial),
        source: result?.source || null,
        providerSource: result?.provider || null,
        lastCheckedAt: result?.lastCheckedAt || null,
      };

      // Store price history only for fresh live observations, never for stale cache replays.
      if (cheapest && result?.freshness === 'live' && !result?.fromCache) {
        (async () => {
          try {
            const snapshot = {
              date: new Date().toISOString().split('T')[0],
              price: cheapest.total,
              provider: cheapest.provider,
              source: cheapest.source,
              lastCheckedAt: cheapest.lastCheckedAt,
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

    const rates = (result?.rates || [])
      .map((r, index) => normalizePublicRate(r, result, index))
      .filter((r) => r.total > 0)
      .sort((a, b) => a.total - b.total);

    const cheapest = rates[0] || null;
    const mostExpensive = rates[rates.length - 1] || null;
    const savingsPct =
      cheapest && mostExpensive && mostExpensive.total > 0
        ? Math.round(((mostExpensive.total - cheapest.total) / mostExpensive.total) * 100)
        : 0;

    return Response.json({
      hotel,
      checkIn: result?.chk_in || checkIn,
      checkOut: result?.chk_out || checkOut,
      currency: result?.currency || currency,
      rates,
      cheapest,
      mostExpensive,
      savingsPct,
      savingsAmount: cheapest && mostExpensive ? Number((mostExpensive.total - cheapest.total).toFixed(2)) : 0,
      providerCount: rates.length,
      fromCache: false,
      freshness: 'live',
      partial: false,
      source: result?.source || null,
      providerSource: result?.provider || null,
      lastCheckedAt: result?.lastCheckedAt || null,
    }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('POST /api/compare error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
