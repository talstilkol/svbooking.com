// Nominatim — OpenStreetMap free geocoding & hotel search, no auth required.
// Returns hotels with addresses, coordinates, stars, Wikidata IDs.
// Rate limit: 1 request/second (hard enforced by server).
// https://nominatim.org/release-docs/develop/api/Search/

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'SVBooking-HotelDiscovery/1.0 (hotel catalog)';

/**
 * Search for hotels in a city.
 *
 * @param {Object} opts
 * @param {string} opts.city - City name
 * @param {number} [opts.limit=20] - Max results (Nominatim max is 40)
 * @param {number} [opts.timeoutMs=10000] - Request timeout
 * @returns {Promise<Array<{name, lat, lon, city, country, stars?, wikidataId?, address}>>}
 */
export async function searchHotels({ city, limit = 20, timeoutMs = 10000 }) {
  if (!city) throw new Error('City name is required');

  const url = new URL(`${NOMINATIM_URL}/search`);
  url.searchParams.set('q', `hotel ${city}`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(Math.min(limit, 40)));
  url.searchParams.set('extratags', '1');
  url.searchParams.set('addressdetails', '1');

  const data = await nominatimRequest(url.toString(), timeoutMs);
  return data
    .filter((r) => r.class === 'tourism' && r.type === 'hotel')
    .map(parseResult);
}

/**
 * Look up a specific hotel by name (and optionally city).
 * Returns rich metadata including Wikidata ID.
 *
 * @param {Object} opts
 * @param {string} opts.name - Hotel name
 * @param {string} [opts.city] - City name to narrow search
 * @returns {Promise<Object|null>}
 */
export async function lookupHotel({ name, city, timeoutMs = 10000 }) {
  const query = city ? `${name} ${city}` : name;
  const url = new URL(`${NOMINATIM_URL}/search`);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '3');
  url.searchParams.set('extratags', '1');
  url.searchParams.set('addressdetails', '1');

  const data = await nominatimRequest(url.toString(), timeoutMs);
  const hotels = data.filter((r) => r.class === 'tourism' && r.type === 'hotel');
  return hotels.length > 0 ? parseResult(hotels[0]) : null;
}

/**
 * Reverse geocode coordinates to find the nearest hotel.
 *
 * @param {Object} opts
 * @param {number} opts.lat
 * @param {number} opts.lon
 * @returns {Promise<Object|null>}
 */
export async function reverseGeocode({ lat, lon, timeoutMs = 10000 }) {
  const url = new URL(`${NOMINATIM_URL}/reverse`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('extratags', '1');
  url.searchParams.set('addressdetails', '1');

  const data = await nominatimRequest(url.toString(), timeoutMs);
  return data ? parseResult(data) : null;
}

/**
 * Make a request to Nominatim with timeout and User-Agent.
 */
async function nominatimRequest(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });

    if (res.status === 429) {
      throw new Error('Nominatim rate limited — max 1 req/sec');
    }
    if (!res.ok) {
      throw new Error(`Nominatim HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Nominatim request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse a Nominatim result into our standard hotel shape.
 */
function parseResult(item) {
  const tags = item.extratags || {};
  const addr = item.address || {};

  return {
    name: item.name || item.display_name?.split(',')[0] || 'Unknown Hotel',
    lat: Number(item.lat),
    lon: Number(item.lon),
    city: addr.city || addr.town || addr.village || addr.city_district || null,
    country: addr.country || null,
    countryCode: addr.country_code || null,
    stars: tags.stars ? Number(tags.stars) : null,
    rooms: tags.rooms ? Number(tags.rooms) : null,
    wikidataId: tags.wikidata || null,
    brandWikidataId: tags['brand:wikidata'] || null,
    brand: tags.brand || null,
    website: tags.website || null,
    address: item.display_name || null,
    osmId: item.osm_id,
    osmType: item.osm_type,
  };
}
