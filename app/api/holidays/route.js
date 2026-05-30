import {
  HolidayDateRangeError,
  HolidayProviderUnavailableError,
  getPublicHolidays,
  getHolidaysInRange,
  getUpcomingHolidays,
  countryToCode,
} from '@/lib/holidays';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const holidaysLimiter = rateLimit({ namespace: 'holidays', limit: 30, window: 60, failOpen: false });

/**
 * GET /api/holidays?country=France
 * GET /api/holidays?country=France&year=2026
 * GET /api/holidays?country=France&checkIn=2026-07-10&checkOut=2026-07-17
 * GET /api/holidays?countryCode=FR&upcoming=true
 *
 * Returns public holidays for travel planning.
 * Helps users avoid expensive holiday weekends.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    let countryCode = searchParams.get('countryCode');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const upcoming = searchParams.get('upcoming') === 'true';
    const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined;

    // Resolve country name to code
    if (!countryCode && country) {
      countryCode = countryToCode(country);
    }

    if (!countryCode) {
      return Response.json(
        { error: 'Provide country name or countryCode (ISO 3166-1 alpha-2)' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const ip = getClientIp(request);
    const { success, reset } = await holidaysLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    // Check if holidays overlap with travel dates
    if (checkIn && checkOut) {
      let overlapping;
      try {
        overlapping = await getHolidaysInRange(countryCode, checkIn, checkOut);
      } catch (error) {
        if (!(error instanceof HolidayDateRangeError)) throw error;
        return Response.json(
          { error: error.message },
          { status: 400, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      return Response.json({
        countryCode,
        checkIn,
        checkOut,
        holidays: overlapping,
        hasHoliday: overlapping.length > 0,
        warning: overlapping.length > 0
          ? `Your stay overlaps with ${overlapping.length} public holiday(s). Prices may be higher.`
          : null,
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=86400' },
      });
    }

    // Upcoming holidays (next 90 days)
    if (upcoming) {
      const holidays = await getUpcomingHolidays(countryCode);
      return Response.json({
        countryCode,
        upcoming: holidays,
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=86400' },
      });
    }

    // Full year holidays
    const holidays = await getPublicHolidays(countryCode, year);
    return Response.json({
      countryCode,
      year: year || new Date().getFullYear(),
      holidays,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    });
  } catch (err) {
    if (err instanceof HolidayProviderUnavailableError) {
      return Response.json(
        {
          error: 'Holiday data unavailable',
          holidays: [],
          upcoming: [],
          hasHoliday: null,
          warning: null,
          source: 'Nager.Date',
          sourceStatus: 'unavailable',
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    console.error('GET /api/holidays error:', err);
    return Response.json(
      { error: 'Holiday data unavailable' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
