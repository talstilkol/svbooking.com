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
    const lat = coords?.lat ?? null;
    const lon = coords?.lng ?? null;
    const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lon);

    // Resolve country code for holidays
    const countryCode = country ? countryToCode(country) : null;

    // Get hotel count
    const hotels = getHotelsByCity(city);

    // Fire all requests in parallel (all free, all fast)
    const [wikiResult, weatherResult, holidayResult, ratesResult, sunResult] = await Promise.all([
      // 1. Wikipedia summary
      getSummary(city)
        .then((value) => ({ state: value ? 'available' : 'unavailable', value }))
        .catch(() => ({ state: 'unavailable', value: null })),

      // 2. Weather forecast
      hasCoordinates
        ? getForecast({ lat, lon, days: 7 })
          .then((value) => ({ state: value?.daily?.length ? 'available' : 'unavailable', value }))
          .catch(() => ({ state: 'unavailable', value: null }))
        : Promise.resolve({ state: 'not-requested', value: null }),

      // 3. Public holidays
      countryCode && checkIn && checkOut
        ? getHolidaysInRange(countryCode, checkIn, checkOut)
          .then((value) => ({ state: 'available', value: Array.isArray(value) ? value : [] }))
          .catch(() => ({ state: 'unavailable', value: [] }))
        : countryCode
          ? getUpcomingHolidays(countryCode)
            .then((value) => ({ state: 'available', value: Array.isArray(value) ? value : [] }))
            .catch(() => ({ state: 'unavailable', value: [] }))
          : Promise.resolve({ state: 'not-requested', value: [] }),

      // 4. Exchange rates
      getExchangeRates(baseCurrency)
        .then((value) => ({ state: value?.rates ? 'available' : 'unavailable', value }))
        .catch(() => ({ state: 'unavailable', value: null })),

      // 5. Sunrise/sunset
      hasCoordinates
        ? getSunriseSunset({ lat, lon })
          .then((value) => ({ state: value ? 'available' : 'unavailable', value }))
          .catch(() => ({ state: 'unavailable', value: null }))
        : Promise.resolve({ state: 'not-requested', value: null }),
    ]);

    // Build local currency info
    let localCurrency = null;
    const rates = ratesResult.value;
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
    const sun = sunResult.value;
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

    const wiki = wikiResult.value;
    const weather = weatherResult.value;
    const holidays = holidayResult.value;
    const sourceStates = {
      wikipedia: wikiResult.state,
      weather: weatherResult.state,
      holidays: holidayResult.state,
      exchangeRates: ratesResult.state,
      daylight: sunResult.state,
      catalog: hotels.length > 0 ? 'available' : 'empty',
    };
    const sources = [
      wiki && 'Wikipedia',
      weather?.daily?.length && 'Open-Meteo',
      holidayResult.state === 'available' && 'Nager.Date',
      ratesResult.state === 'available' && 'Open Exchange Rates',
      sunResult.state === 'available' && 'Sunrise-Sunset',
      hotels.length > 0 && 'SV Booking catalog',
    ].filter(Boolean);

    return Response.json({
      city,
      country,
      coordinates: hasCoordinates ? { lat, lon } : null,
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

      // Sources with confirmed available data for this response.
      sources,
      sourceStates,
      dataPolicy: 'available-source-data-only',
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
