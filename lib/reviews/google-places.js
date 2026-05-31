/**
 * Google Places reviews adapter.
 *
 * Real integration, gated behind GOOGLE_PLACES_API_KEY. When no key is present
 * the dispatcher in lib/reviews.js never calls this, so the app stays in its
 * honest "reviews unavailable" state. Normalization is exported separately so it
 * can be unit-tested without any network access.
 */

const FIND_PLACE_URL = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json';
const PLACE_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

async function fetchJson(url, fetchImpl, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Normalize a Google Place Details `result` into our review summary shape.
 * Pure function — no network. Returns { rating, count, reviews[] }.
 */
export function normalizeGooglePlaces(result) {
  if (!result || typeof result !== 'object') {
    return { rating: null, count: null, reviews: [] };
  }

  const reviews = Array.isArray(result.reviews)
    ? result.reviews.slice(0, 5).map((r) => ({
        author: r.author_name || null,
        rating: Number.isFinite(Number(r.rating)) ? Number(r.rating) : null,
        text: String(r.text || '').slice(0, 600),
        time: Number.isFinite(Number(r.time)) ? new Date(Number(r.time) * 1000).toISOString() : null,
        relativeTime: r.relative_time_description || null,
      }))
    : [];

  const rating = Number(result.rating);
  const count = Number(result.user_ratings_total);

  return {
    rating: Number.isFinite(rating) ? rating : null,
    count: Number.isFinite(count) ? count : null,
    reviews,
  };
}

/**
 * Fetch a normalized review summary for a hotel via Google Places.
 * @returns {Promise<{rating:number|null,count:number|null,reviews:Array}|null>}
 */
/**
 * @param {{ name?: string, city?: string, country?: string } | null} hotel
 * @param {{ apiKey?: string, fetchImpl?: any, timeoutMs?: number }} [options]
 */
export async function fetchGooglePlacesReviews(hotel, { apiKey, fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY is not configured');
  if (!hotel || !hotel.name) throw new Error('hotel name is required');

  const query = [hotel.name, hotel.city, hotel.country].filter(Boolean).join(', ');

  const findUrl =
    `${FIND_PLACE_URL}?input=${encodeURIComponent(query)}` +
    `&inputtype=textquery&fields=place_id&key=${apiKey}`;
  const findData = await fetchJson(findUrl, fetchImpl, timeoutMs);
  const placeId = findData?.candidates?.[0]?.place_id;
  if (!placeId) return null;

  const detailsUrl =
    `${PLACE_DETAILS_URL}?place_id=${encodeURIComponent(placeId)}` +
    `&fields=rating,user_ratings_total,reviews&reviews_no_translations=true&key=${apiKey}`;
  const detailsData = await fetchJson(detailsUrl, fetchImpl, timeoutMs);
  if (!detailsData?.result) return null;

  return normalizeGooglePlaces(detailsData.result);
}
