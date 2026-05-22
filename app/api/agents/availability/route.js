import { findHotel } from '@/lib/hotels-catalog';
import { getCachedRates } from '@/lib/price-cache';
import { getVerifiedRateObservations } from '@/lib/cheaper-dates';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { ValidationError, errorResponse, parseDate } from '@/lib/validation';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const availabilityLimiter = rateLimit({ namespace: 'agents-availability', limit: 10, window: 60, failOpen: false });

function buildUnavailableResponse({ hotel, hotelKey, checkIn, checkOut }) {
  return {
    hotel: { name: hotel.name, city: hotel.city, country: hotel.country, hotelKey },
    dates: { checkIn, checkOut },
    results: [{
      provider: 'provider-returned availability',
      status: 'unavailable',
      available: false,
      deepLink: null,
      note: 'SV Booking does not construct booking-site links without a provider-returned URL.',
    }],
    summary: `Provider-returned availability links are unavailable for ${hotel.name}.`,
    bookingLinks: [],
    sourcePolicy: 'provider-returned-deep-links-only',
    note: 'Use Compare to request provider-returned prices. Booking links are shown only when a configured pricing provider returns a verified deepLink.',
  };
}

function buildProviderLinkResponse({ hotel, hotelKey, checkIn, checkOut, rates }) {
  const ratesWithLinks = rates.filter((rate) => rate.deepLink);
  if (ratesWithLinks.length === 0) {
    return buildUnavailableResponse({ hotel, hotelKey, checkIn, checkOut });
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
      note: 'Provider returned a booking link with a verified price observation.',
    })),
    summary: `${ratesWithLinks.length} provider-returned booking link(s) are available for ${hotel.name}.`,
    bookingLinks: ratesWithLinks.map((rate) => ({ provider: rate.provider, url: rate.deepLink })),
    sourcePolicy: 'provider-returned-deep-links-only',
    note: 'Booking links are shown only when a configured pricing provider returns a verified deepLink.',
  };
}

// GET /api/agents/availability?hotelKey=...&checkIn=...&checkOut=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelKey = searchParams.get('hotelKey');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');

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
      buildProviderLinkResponse({ hotel, hotelKey, checkIn, checkOut, rates }),
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
