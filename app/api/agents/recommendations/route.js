import { findHotel, getHotelsByCountry } from '@/lib/hotels-catalog';
import { getCachedRates } from '@/lib/price-cache';
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { addDays } from '@/lib/utils/date';
import { assertSameOrigin } from '@/lib/request-origin';
import { errorResponse } from '@/lib/validation';
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  getDictionary,
  resolveLocale,
} from '@/lib/i18n';

const recommendationsLimiter = rateLimit({
  namespace: 'agents-recommendations',
  limit: 20,
  window: 60,
  failOpen: false,
});
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

function fillTemplate(template, values) {
  return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => (
    values[key] === undefined || values[key] === null ? match : String(values[key])
  ));
}

function buildRecommendationCopy({ locale, acceptLanguage }) {
  const resolved = resolveLocale({ locale, acceptLanguage }).code;
  const dictionary = getDictionary(resolved);
  const t = (key, values = {}) => fillTemplate(dictionary[key] || key, values);
  const money = (amount) => formatLocalizedCurrency(amount, resolved, 'USD') || `$${Number(amount || 0).toFixed(0)}`;
  const date = (value) => formatLocalizedDate(value, resolved, { year: undefined }) || value;
  return { t, money, date };
}

async function checkPriceForHotel(hotelKey, checkIn, checkOut) {
  try {
    const result = await getCachedRates({ hotelKey, checkIn, checkOut });
    const rates = (result?.rates || [])
      .map((r) => ({ provider: r.name, total: Number(r.rate || 0) + Number(r.tax || 0) }))
      .filter((r) => r.total > 0)
      .sort((a, b) => a.total - b.total);
    return rates.length > 0 ? rates[0] : null;
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const ip = getClientIp(request);
    const { success, reset } = await recommendationsLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    const body = await request.json();
    const { favorites = [], trips = [], locale } = body;
    const copy = buildRecommendationCopy({
      locale,
      acceptLanguage: request.headers.get('accept-language') || '',
    });

    const recommendations = [];
    const today = new Date().toISOString().split('T')[0];

    // ── Trip-based recommendations (parallel price checks) ──
    const validTrips = trips
      .slice(0, 3)
      .filter((t) => t.hotelKey && t.checkIn && t.checkOut && t.checkIn >= today);

    // Build all price check tasks upfront, then run in parallel
    const tripPriceTasks = [];
    for (const trip of validTrips) {
      const hotel = findHotel(trip.hotelKey);
      if (!hotel) continue;
      const altCheckIn = addDays(trip.checkIn, -3);
      const altCheckOut = addDays(trip.checkOut, -3);

      tripPriceTasks.push({
        type: 'current',
        hotel,
        trip,
        promise: checkPriceForHotel(trip.hotelKey, trip.checkIn, trip.checkOut),
      });
      if (altCheckIn >= today) {
        tripPriceTasks.push({
          type: 'alt',
          hotel,
          trip,
          altCheckIn,
          altCheckOut,
          promise: checkPriceForHotel(trip.hotelKey, altCheckIn, altCheckOut),
        });
      }
    }

    // Run ALL trip price checks in parallel (instead of sequential)
    const tripResults = await Promise.allSettled(tripPriceTasks.map((t) => t.promise));
    const priceMap = new Map();
    tripPriceTasks.forEach((task, i) => {
      const result = tripResults[i];
      const price = result.status === 'fulfilled' ? result.value : null;
      const key = `${task.trip.hotelKey}:${task.type}`;
      priceMap.set(key, { ...task, price });
    });

    // Build timing suggestions from parallel results
    for (const trip of validTrips) {
      const hotel = findHotel(trip.hotelKey);
      if (!hotel) continue;
      const current = priceMap.get(`${trip.hotelKey}:current`);
      const alt = priceMap.get(`${trip.hotelKey}:alt`);

      if (current?.price && alt?.price && alt.price.total < current.price.total * 0.9) {
        const savingsPct = Math.round(((current.price.total - alt.price.total) / current.price.total) * 100);
        recommendations.push({
          type: 'timing_suggestion',
          title: copy.t('recTimingTitle', { percent: savingsPct, hotelName: hotel.name }),
          description: copy.t('recTimingDescription', {
            amount: copy.money(current.price.total - alt.price.total),
            checkIn: copy.date(alt.altCheckIn),
            checkOut: copy.date(alt.altCheckOut),
          }),
          hotel,
          action: { label: copy.t('recCompareDates'), href: `/compare?hotelKey=${hotel.hotelKey}&checkIn=${alt.altCheckIn}&checkOut=${alt.altCheckOut}` },
          priority: savingsPct >= 20 ? 'high' : 'medium',
        });
      }
    }

    // ── Favorite-based recommendations (parallel price checks) ──
    const validFavs = favorites.slice(0, 3).filter((f) => f.hotelKey);
    const favCheckIn = addDays(today, 14);
    const favCheckOut = addDays(today, 16);

    const favResults = await Promise.allSettled(
      validFavs.map((fav) => checkPriceForHotel(fav.hotelKey, favCheckIn, favCheckOut))
    );

    validFavs.forEach((fav, i) => {
      const result = favResults[i];
      const price = result.status === 'fulfilled' ? result.value : null;
      if (!price) return;

      const hotel = findHotel(fav.hotelKey);
      if (!hotel) return;

      recommendations.push({
        type: 'new_deal',
        title: copy.t('recNewDealTitle', { hotelName: hotel.name, amount: copy.money(price.total) }),
        description: copy.t('recNewDealDescription', {
          city: hotel.city,
          provider: price.provider,
        }),
        hotel,
        action: { label: copy.t('recViewDeal'), href: `/compare?hotelKey=${hotel.hotelKey}&checkIn=${favCheckIn}&checkOut=${favCheckOut}` },
        priority: 'medium',
      });
    });

    // ── Similar hotel suggestions (no API calls needed) ──
    if (favorites.length > 0) {
      const favCountries = [...new Set(favorites.map((f) => f.country).filter(Boolean))];
      const favKeys = new Set(favorites.map((f) => f.hotelKey));

      for (const country of favCountries.slice(0, 1)) {
        const hotelsInCountry = getHotelsByCountry(country).filter(
          (h) => !favKeys.has(h.hotelKey)
        );
        if (hotelsInCountry.length > 0) {
          const suggest = hotelsInCountry[0];
          recommendations.push({
            type: 'similar_hotel',
            title: copy.t('recSimilarTitle', { hotelName: suggest.name }),
            description: copy.t('recSimilarDescription', {
              country,
              hotelName: suggest.name,
              city: suggest.city,
            }),
            hotel: suggest,
            action: { label: copy.t('recExplore'), href: `/compare?hotelKey=${suggest.hotelKey}&checkIn=${favCheckIn}&checkOut=${favCheckOut}` },
            priority: 'low',
          });
        }
      }
    }

    recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    });

    return Response.json(
      {
        recommendations: recommendations.slice(0, 8),
        generatedAt: new Date().toISOString(),
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
