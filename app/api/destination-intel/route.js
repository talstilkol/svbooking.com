import { getForecast } from '@/lib/weather';
import { getSummary } from '@/lib/wikipedia';
import { getHolidaysInRange, getUpcomingHolidays, countryToCode } from '@/lib/holidays';
import { getExchangeRates, getCurrencySymbol } from '@/lib/exchange-rates';
import { CITY_COORDINATES } from '@/lib/city-coordinates';
import { getHotelsByCity } from '@/lib/hotels-catalog';

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
 * All sources are free, no auth required.
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
      return Response.json({ error: 'city parameter is required' }, { status: 400 });
    }

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
        ? fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`)
            .then((r) => r.json())
            .then((d) => d.results)
            .catch(() => null)
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
    return Response.json({ error: err.message }, { status: 500 });
  }
}
