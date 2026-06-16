import { findHotel } from '@/lib/hotels-catalog';
import { getCachedRates } from '@/lib/price-cache';
import { getVerifiedRateObservations } from '@/lib/cheaper-dates';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { ValidationError, errorResponse, parseDate } from '@/lib/validation';
import { getDictionary, resolveLocale } from '@/lib/i18n';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const availabilityLimiter = rateLimit({ namespace: 'agents-availability', limit: 10, window: 60, failOpen: false });

function fillTemplate(template, values) {
  return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => (
    values[key] === undefined || values[key] === null ? match : String(values[key])
  ));
}

function buildAvailabilityCopy({ locale, acceptLanguage }) {
  const resolved = resolveLocale({ locale, acceptLanguage }).code;
  const dictionary = getDictionary(resolved);
  return (key, values = {}) => fillTemplate(dictionary[key] || key, values);
}

function buildUnavailableResponse({ hotel, hotelKey, checkIn, checkOut, t }) {
  return {
    hotel: { name: hotel.name, city: hotel.city, country: hotel.country, hotelKey },
    dates: { checkIn, checkOut },
    results: [{
      provider: t('availabilityProviderReturnedLabel'),
      status: 'unavailable',
      available: false,
      deepLink: null,
      note: t('availabilityNoConstructedLinksNote'),
    }],
    summary: t('availabilityUnavailableSummary', { hotelName: hotel.name }),
    bookingLinks: [],
    sourcePolicy: 'provider-returned-deep-links-only',
    note: t('availabilityUnavailableActionNote'),
  };
}

function buildProviderLinkResponse({ hotel, hotelKey, checkIn, checkOut, rates, t }) {
  const ratesWithLinks = rates.filter((rate) => rate.deepLink);
  if (ratesWithLinks.length === 0) {
    return buildUnavailableResponse({ hotel, hotelKey, checkIn, checkOut, t });
  }

  return {
    hotel: { name: hotel.name, city: hotel.city, country: hotel.country, hotelKey },
    dates: { checkIn, checkOut },
    results: ratesWithLinks.map((rate) => ({
      provider: rate.provider,
      status: 'provider-link-returned',
      available: true,
      deepLink: rate.deepLink,
      price: rate.total,
      currency: rate.currency,
      freshness: rate.freshness,
      lastCheckedAt: rate.lastCheckedAt,
      note: t('availabilityProviderLinkNote'),
    })),
    summary: t(
      ratesWithLinks.length === 1 ? 'availabilityProviderLinkSummaryOne' : 'availabilityProviderLinkSummaryMany',
      { count: ratesWithLinks.length, hotelName: hotel.name }
    ),
    bookingLinks: ratesWithLinks.map((rate) => ({ provider: rate.provider, url: rate.deepLink })),
    sourcePolicy: 'provider-returned-deep-links-only',
    note: t('availabilityProviderLinkPolicyNote'),
  };
}

// GET /api/agents/availability?hotelKey=...&checkIn=...&checkOut=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelKey = searchParams.get('hotelKey');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const t = buildAvailabilityCopy({
      locale: searchParams.get('locale') || undefined,
      acceptLanguage: request.headers.get('accept-language') || '',
    });

    if (!hotelKey || !checkIn || !checkOut) {
      throw new ValidationError('hotelKey, checkIn, and checkOut are required');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = parseDate(checkIn, 'checkIn');
    const checkOutDate = parseDate(checkOut, 'checkOut');
    if (checkInDate < today) {
      throw new ValidationError('checkIn must be today or later');
    }
    if (checkOutDate <= checkInDate) {
      throw new ValidationError('checkOut must be after checkIn');
    }

    const hotel = findHotel(hotelKey);
    if (!hotel) {
      throw new ValidationError('Hotel not found in catalog', 404);
    }

    const ip = getClientIp(request);
    const { success, reset } = await availabilityLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    const result = await getCachedRates({
      hotelKey,
      hotelName: hotel.name,
      city: hotel.city,
      checkIn,
      checkOut,
    });
    const rates = getVerifiedRateObservations(result);

    return Response.json(
      buildProviderLinkResponse({ hotel, hotelKey, checkIn, checkOut, rates, t }),
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
