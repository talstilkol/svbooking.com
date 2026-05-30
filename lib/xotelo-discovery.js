/**
 * Xotelo Hotel Discovery — Uses Xotelo's search/list endpoints to find hotels.
 *
 * Xotelo has two discovery endpoints:
 *   - /api/search?q=city_name  — search hotels by city/name
 *   - /api/list?city=city_name — list all hotels in a city
 *
 * IMPORTANT: These endpoints require a RapidAPI key (RAPIDAPI_KEY env var).
 * The data.xotelo.com/api/search and /list endpoints return 401 without auth.
 * When a RapidAPI key is available, requests go through the RapidAPI proxy.
 * Without a key, these functions return empty arrays gracefully.
 *
 * Hotels found here are expected to use Xotelo-native hotel keys.
 * (g{geoId}-d{hotelId}), ready for use with getRates() and getHeatmap().
 */

const XOTELO_RAPIDAPI_HOST = 'xotelo.p.rapidapi.com';
const XOTELO_RAPIDAPI_BASE = `https://${XOTELO_RAPIDAPI_HOST}/api`;
const XOTELO_DIRECT_BASE = 'https://data.xotelo.com/api';
const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * Check if Xotelo discovery is available (requires RapidAPI key).
 */
export function isXoteloDiscoveryConfigured() {
  return Boolean(process.env.RAPIDAPI_KEY);
}

/**
 * Build headers — uses RapidAPI auth if available, falls back to direct.
 */
function getRequestConfig() {
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  if (rapidApiKey) {
    return {
      baseUrl: XOTELO_RAPIDAPI_BASE,
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': XOTELO_RAPIDAPI_HOST,
      },
    };
  }
  // Fallback to direct (may not work for search/list)
  return {
    baseUrl: XOTELO_DIRECT_BASE,
    headers: {},
  };
}

/**
 * Search Xotelo for hotels matching a query.
 * Returns hotels with Xotelo-native keys that still require pricing validation.
 * Requires RAPIDAPI_KEY env var for authentication.
 *
 * @param {string} query - Search query (city name, hotel name, etc.)
 * @param {number} [timeoutMs=20000]
 * @returns {Promise<Array<{hotelKey: string, name: string, city?: string, country?: string}>>}
 */
export async function searchXoteloHotels(query, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (!query) return [];

  const config = getRequestConfig();
  const url = new URL(`${config.baseUrl}/search`);
  url.searchParams.set('q', query);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: config.headers,
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (!res.ok) return [];

    const data = await res.json();
    if (data.error) return [];

    // Parse result format — Xotelo returns an array of hotel objects
    const results = data.result || data.data || data;
    if (!Array.isArray(results)) return [];

    return results
      .map((item) => {
        const hotelKey = item.hotel_key || item.key || item.id;
        const name = item.name || item.hotel_name;
        if (!hotelKey || !name) return null;

        return {
          hotelKey,
          name,
          city: item.city || item.location?.city || null,
          country: item.country || item.location?.country || null,
          stars: item.stars || null,
          source: 'xotelo-search',
        };
      })
      .filter(Boolean);
  } catch {
    clearTimeout(timer);
    return [];
  }
}

/**
 * List hotels in a city from Xotelo's database.
 * Requires RAPIDAPI_KEY env var for authentication.
 *
 * @param {string} city - City name
 * @param {number} [timeoutMs=20000]
 * @returns {Promise<Array<{hotelKey: string, name: string, city: string}>>}
 */
export async function listXoteloHotels(city, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (!city) return [];

  const config = getRequestConfig();
  const url = new URL(`${config.baseUrl}/list`);
  url.searchParams.set('city', city);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: config.headers,
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (!res.ok) return [];

    const data = await res.json();
    if (data.error) return [];

    const results = data.result || data.data || data;
    if (!Array.isArray(results)) return [];

    return results
      .map((item) => {
        const hotelKey = item.hotel_key || item.key || item.id;
        const name = item.name || item.hotel_name;
        if (!hotelKey || !name) return null;

        return {
          hotelKey,
          name,
          city: item.city || city,
          country: item.country || null,
          stars: item.stars || null,
          source: 'xotelo-list',
        };
      })
      .filter(Boolean);
  } catch {
    clearTimeout(timer);
    return [];
  }
}

/**
 * Discover hotels from Xotelo for multiple cities.
 * Automatically deduplicates by hotelKey.
 *
 * @param {string[]} cities - List of city names
 * @param {number} [delayMs=2000] - Delay between requests
 * @returns {Promise<Array>}
 */
export async function discoverFromXotelo(cities, delayMs = 2000) {
  const seen = new Set();
  const all = [];

  for (const city of cities) {
    try {
      const hotels = await searchXoteloHotels(city);
      for (const h of hotels) {
        if (seen.has(h.hotelKey)) continue;
        seen.add(h.hotelKey);
        all.push({ ...h, city: h.city || city });
      }
    } catch { /* skip failed city */ }

    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return all;
}
