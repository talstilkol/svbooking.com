import { findHotel } from './hotels-catalog';
import { fetchGooglePlacesReviews } from './reviews/google-places';
import { isEnvConfigured } from './production-readiness.mjs';

function normalizeProviderName(value) {
  return String(value || '').trim().toLowerCase();
}

export function isSupportedReviewProvider(value) {
  const providerName = normalizeProviderName(value);
  return providerName === 'google-places' || providerName === 'google';
}

export function isReviewProviderConfigured(env = process.env) {
  return Boolean(
    isSupportedReviewProvider(env.REVIEWS_PROVIDER_NAME) &&
    env.REVIEWS_PROVIDER_LICENSED === 'true' &&
    isEnvConfigured(env, 'GOOGLE_PLACES_API_KEY')
  );
}

export function getUnavailableReviewSummary(hotelKey) {
  const hotel = findHotel(hotelKey);
  if (!hotel) return null;

  return {
    hotelKey,
    hotelName: hotel.name,
    available: false,
    status: 'unavailable',
    source: null,
    verified: false,
    count: null,
    rating: null,
    lastUpdatedAt: null,
    reviews: [],
    reason: 'No licensed review provider is configured for this property.',
  };
}

function buildAvailableSummary(hotelKey, hotelName, source, data) {
  return {
    hotelKey,
    hotelName,
    available: true,
    status: 'available',
    source,
    verified: true,
    count: data.count,
    rating: data.rating,
    lastUpdatedAt: new Date().toISOString(),
    reviews: data.reviews || [],
    reason: null,
  };
}

/**
 * Resolve a review summary for a hotel.
 *
 * - No licensed provider configured  → honest "unavailable" summary.
 * - Provider configured              → fetch + normalize real reviews; on any
 *   failure or empty result, fall back to "unavailable" (never fabricates data).
 *
 * @param {string} hotelKey
 * @param {{ env?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch }} [opts]
 */
export async function getReviewSummary(hotelKey, { env = process.env, fetchImpl } = {}) {
  const hotel = findHotel(hotelKey);
  if (!hotel) return null;

  if (!isReviewProviderConfigured(env)) {
    return getUnavailableReviewSummary(hotelKey);
  }

  try {
    const data = await fetchGooglePlacesReviews(hotel, {
      apiKey: env.GOOGLE_PLACES_API_KEY,
      ...(fetchImpl ? { fetchImpl } : {}),
    });
    if (data && data.rating != null) {
      return buildAvailableSummary(hotelKey, hotel.name, 'google-places', data);
    }
    // Empty provider data falls through to unavailable.
  } catch (err) {
    console.warn('getReviewSummary: provider fetch failed; returning unavailable', err);
  }

  return getUnavailableReviewSummary(hotelKey);
}
