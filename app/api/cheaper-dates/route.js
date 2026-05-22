import { findCheaperDates, getHeatmapCalendar } from '@/lib/cheaper-dates';
import { findHotel } from '@/lib/hotels-catalog';
import { ValidationError, errorResponse, parseDate } from '@/lib/validation';
import { kv } from '@/lib/kv';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const cheaperDatesLimiter = rateLimit({ namespace: 'cheaper-dates', limit: 20, window: 60, failOpen: false });

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelKey = searchParams.get('hotelKey');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const mode = searchParams.get('mode');

    if (!hotelKey || !checkIn || !checkOut) {
      throw new ValidationError('Missing required params: hotelKey, checkIn, checkOut');
    }

    const checkInDate = parseDate(checkIn, 'checkIn');
    const checkOutDate = parseDate(checkOut, 'checkOut');
    if (checkInDate >= checkOutDate) {
      throw new ValidationError('checkIn must be before checkOut');
    }

    const hotel = findHotel(hotelKey);
    if (!hotel) {
      throw new ValidationError('Hotel not found', 404);
    }

    // Route-level cache: full result cached for 15 min to avoid expensive re-computation
    const cacheKey = `cheaper-dates:${mode || 'alternatives'}:${hotelKey}:${checkIn}:${checkOut}`;
    try {
      const cached = await kv.get(cacheKey);
      if (cached) {
        return Response.json(
          { hotel, ...cached, fromCache: true },
          { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' } }
        );
      }
    } catch { /* cache miss */ }

    const ip = getClientIp(request);
    const { success, reset } = await cheaperDatesLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    if (mode === 'heatmap' || mode === 'calendar') {
      const heatmap = await getHeatmapCalendar({ hotelKey, checkOut });
      const result = {
        heatmap,
        hasRealData: heatmap.length > 0,
        dataPolicy: 'verified-provider-or-source-observations-only',
        priceSource: 'xotelo-heatmap',
        priceSourceLabel: 'Xotelo heatmap observation',
        bookingProvider: false,
      };
      kv.setWithTTL(cacheKey, result, 900).catch(() => {});

      return Response.json(
        { hotel, ...result },
        { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
      );
    }

    const result = await findCheaperDates(hotelKey, checkIn, checkOut);

    // Cache the result (fire-and-forget, 15 min TTL)
    kv.setWithTTL(cacheKey, result, 900).catch(() => {});

    return Response.json(
      { hotel, ...result },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
