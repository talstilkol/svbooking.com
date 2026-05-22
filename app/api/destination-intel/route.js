import { getForecast } from '@/lib/weather';
import { getSummary } from '@/lib/wikipedia';
import { getHolidaysInRange, getUpcomingHolidays, countryToCode } from '@/lib/holidays';
import { getExchangeRates, getCurrencySymbol } from '@/lib/exchange-rates';
import { CITY_COORDINATES } from '@/lib/city-coordinates';
import { getHotelsByCity } from '@/lib/hotels-catalog';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { fetchJsonWithTimeout } from '@/lib/utils/fetch-with-timeout';

const destinationIntelLimiter = rateLimit({ namespace: 'destination-intel', limit: 20, window: 60, failOpen: false });
const SUNRISE_SUNSET_TIMEOUT_MS = 5000;

async function getSunriseSunset({ lat, lon }) {
  const url = new URL('https://api.sunrise-sunset.org/json');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lon));
  url.searchParams.set('formatted', '0');

  const data = await fetchJsonWithTimeout(url.toString(), {
    timeoutMs: SUNRISE_SUNSET_TIMEOUT_MS,
    cache: 'no-store',
  });

  if (data?.status && data.status !== 'OK') return null;
  return data?.results || null;
}

/**
 * GET /api/destination-intel?city=Paris&country=France&checkIn=2026-07-10&checkOut=2026-07-17
 *
 * Aggregated destination intelligence — combines 6 free data sources in a single call:
 *   1. Wikipedia — city description + image
 *   2. Open-Meteo — 7-day weather forecast
 *   3. Nager.Date — public holidays during travel dates
 *   4. Exchange rates — local currency conversion from USD
 *   5. Sunrise-Sunset — daylight hours
 *   6. Hotel catalog — available hotels in city
 *
 * Returns sourced destination context when upstream data is available.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const country = searchParams.get('country');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const baseCurrency = searchParams.get('currency') || 'USD';

    if (!city) {
      return Response.json(
        { error: 'city parameter is required' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const ip = getClientIp(request);
    const { success, reset } = await destinationIntelLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    // Resolve coordinates
    const coords = CITY_COORDINATES.find(
      (c) => c.city.toLowerCase() === city.toLowerCase()
    );
    const lat = coords?.lat || null;
    const lon = coords?.lng || null;

    // Resolve country code for holidays
    const countryCode = country ? countryToCode(country) : null;

    // Get hotel count
    const hotels = getHotelsByCity(city);

    // Fire all requests in parallel (all free, all fast)
    const [wikiResult, weatherResult, holidayResult, ratesResult, sunResult] = await Promise.allSettled([
      // 1. Wikipedia summary
      getSummary(city).catch(() => null),

      // 2. Weather forecast
      lat && lon
        ? getForecast({ lat, lon, days: 7 }).catch(() => null)
        : Promise.resolve(null),

      // 3. Public holidays
      countryCode && checkIn && checkOut
        ? getHolidaysInRange(countryCode, checkIn, checkOut).catch(() => [])
        : countryCode
          ? getUpcomingHolidays(countryCode).catch(() => [])
          : Promise.resolve([]),

      // 4. Exchange rates
      getExchangeRates(baseCurrency).catch(() => null),

      // 5. Sunrise/sunset
      lat && lon
        ? getSunriseSunset({ lat, lon }).catch(() => null)
        : Promise.resolve(null),
    ]);

    // Build local currency info
    let localCurrency = null;
    const rates = ratesResult.status === 'fulfilled' ? ratesResult.value : null;
    if (rates?.rates && country) {
      const COUNTRY_CURRENCIES = {
        France: 'EUR', UK: 'GBP', Japan: 'JPY', Thailand: 'THB', Israel: 'ILS',
        Indonesia: 'IDR', Singapore: 'SGD', Spain: 'EUR', Italy: 'EUR', Netherlands: 'EUR',
        'Czech Republic': 'CZK', Austria: 'EUR', Turkey: 'TRY', UAE: 'AED',
        USA: 'USD', Australia: 'AUD', Germany: 'EUR', Greece: 'EUR', Egypt: 'EGP',
        India: 'INR', 'South Korea': 'KRW', Malaysia: 'MYR', Portugal: 'EUR',
        Brazil: 'BRL', Kenya: 'KES', Finland: 'EUR', Hungary: 'HUF', Croatia: 'EUR',
        'Saudi Arabia': 'SAR', 'Sri Lanka': 'LKR', Canada: 'CAD',
      };
      const code = COUNTRY_CURRENCIES[country];
      if (code && code !== baseCurrency) {
        localCurrency = {
          code,
          symbol: getCurrencySymbol(code),
          rate: rates.rates[code],
          example: rates.rates[code]
            ? `${baseCurrency} 100 = ${getCurrencySymbol(code)}${Math.round(rates.rates[code] * 100)}`
            : null,
        };
      }
    }

    // Compute daylight hours
    const sun = sunResult.status === 'fulfilled' ? sunResult.value : null;
    let daylight = null;
    if (sun?.sunrise && sun?.sunset) {
      const rise = new Date(sun.sunrise);
      const set = new Date(sun.sunset);
      const hrs = (set - rise) / 3600000;
      daylight = {
        sunrise: rise.toISOString().slice(11, 16),
        sunset: set.toISOString().slice(11, 16),
        hours: Math.round(hrs * 10) / 10,
      };
    }

    const wiki = wikiResult.status === 'fulfilled' ? wikiResult.value : null;
    const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
    const holidays = holidayResult.status === 'fulfilled' ? holidayResult.value : [];

    return Response.json({
      city,
      country,
      coordinates: lat && lon ? { lat, lon } : null,
      hotelsAvailable: hotels.length,

      // Wikipedia
      description: wiki?.extract || null,
      image: wiki?.thumbnail || null,
      wikiUrl: wiki?.url || null,

      // Weather
      weather: weather?.daily?.slice(0, 5) || null,

      // Holidays
      holidays: Array.isArray(holidays) ? holidays : [],
      hasHolidayOverlap: Array.isArray(holidays) && holidays.length > 0,

      // Currency
      localCurrency,

      // Daylight
      daylight,

      // Sources used
      sources: ['Wikipedia', 'Open-Meteo', 'Nager.Date', 'Open Exchange Rates', 'Sunrise-Sunset'],
      generatedAt: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    console.error('GET /api/destination-intel error:', err);
    return Response.json(
      { error: 'Destination intelligence unavailable' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
