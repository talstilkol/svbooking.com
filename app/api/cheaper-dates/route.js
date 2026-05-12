import { findCheaperDates } from '@/lib/cheaper-dates';
import { findHotel } from '@/lib/hotels-catalog';
import { ValidationError, errorResponse, parseDate } from '@/lib/validation';
import { kv } from '@/lib/kv';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelKey = searchParams.get('hotelKey');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');

    if (!hotelKey || !checkIn || !checkOut) {
      throw new ValidationError('Missing required params: hotelKey, checkIn, checkOut');
    }

    const checkInDate = parseDate(checkIn, 'checkIn');
    const checkOutDate = parseDate(checkOut, 'checkOut');
    if (checkInDate >= checkOutDate) {
      throw new ValidationError('checkIn must be before checkOut');
    }

    const hotel = findHotel(hotelKey);

    // Route-level cache: full result cached for 15 min to avoid expensive re-computation
    const cacheKey = `cheaper-dates:${hotelKey}:${checkIn}:${checkOut}`;
    try {
      const cached = await kv.get(cacheKey);
      if (cached) {
        return Response.json(
          { hotel: hotel || { hotelKey, name: 'Hotel' }, ...cached, fromCache: true },
          { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' } }
        );
      }
    } catch { /* cache miss */ }

    const result = await findCheaperDates(hotelKey, checkIn, checkOut);

    // Cache the result (fire-and-forget, 15 min TTL)
    kv.setWithTTL(cacheKey, result, 900).catch(() => {});

    return Response.json(
      { hotel: hotel || { hotelKey, name: 'Hotel' }, ...result },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
