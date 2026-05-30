// OpenStreetMap Overpass API — free hotel discovery, no auth required.
// Returns hotels with names, coordinates, stars, brands, and Wikidata IDs.
// Rate limit: be polite (1 req/sec). No hard limit for reasonable usage.
//
// Paris alone has 1,140+ hotels. Hotels with wikidata tags can be
// cross-referenced to TripAdvisor IDs → Xotelo keys for pricing.

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'SVBooking-HotelDiscovery/1.0';

/**
 * Discover hotels in a city using OSM Overpass API.
 * Searches for tourism=hotel nodes within a named city area.
 *
 * @param {Object} opts
 * @param {string} opts.city - City name (e.g., "Paris", "London")
 * @param {string} [opts.country] - Country name to narrow area match
 * @param {number} [opts.limit=50] - Max results
 * @param {boolean} [opts.wikidataOnly=false] - Only return hotels with Wikidata IDs
 * @param {number} [opts.timeoutMs=20000] - Request timeout
 * @returns {Promise<Array<{name: string, lat: number, lon: number, stars?: number, brand?: string, wikidataId?: string, website?: string, osmId: number}>>}
 */
export async function discoverHotels({ city, country, limit = 50, wikidataOnly = false, timeoutMs = 20000 }) {
  if (!city) throw new Error('City name is required');

  // Sanitize inputs to prevent Overpass QL injection
  const safeCity = city.replace(/["\\]/g, '');
  const safeCountry = country ? country.replace(/["\\]/g, '') : '';

  // Build Overpass QL query
  // Use area search with city name; optionally narrow by country
  const areaFilter = safeCountry
    ? `area["name"="${safeCity}"]["admin_level"~"^[68]$"]->.searchArea;area["name:en"="${safeCountry}"]->.countryArea;`
    : `area["name"="${safeCity}"]["admin_level"~"^[2-8]$"]->.searchArea;`;

  const wikidataFilter = wikidataOnly ? '["wikidata"]' : '';

  const query = `[out:json][timeout:25];
${areaFilter}
(
  node["tourism"="hotel"]${wikidataFilter}(area.searchArea);
  way["tourism"="hotel"]${wikidataFilter}(area.searchArea);
  relation["tourism"="hotel"]${wikidataFilter}(area.searchArea);
);
out body ${limit};`;

  const data = await overpassQuery(query, timeoutMs);
  return parseHotelResults(data);
}

/**
 * Discover hotels with Wikidata IDs near coordinates (radius search).
 * Useful when city name matching fails.
 *
 * @param {Object} opts
 * @param {number} opts.lat - Latitude
 * @param {number} opts.lon - Longitude
 * @param {number} [opts.radiusKm=10] - Search radius in km
 * @param {number} [opts.limit=50] - Max results
 * @returns {Promise<Array>}
 */
export async function discoverHotelsNearby({ lat, lon, radiusKm = 10, limit = 50, timeoutMs = 20000 }) {
  if (!isFiniteCoordinate(lat) || !isFiniteCoordinate(lon)) {
    throw new Error('Latitude and longitude are required');
  }

  const radiusM = radiusKm * 1000;
  const query = `[out:json][timeout:25];
(
  node["tourism"="hotel"]["wikidata"](around:${radiusM},${lat},${lon});
  way["tourism"="hotel"]["wikidata"](around:${radiusM},${lat},${lon});
);
out body ${limit};`;

  const data = await overpassQuery(query, timeoutMs);
  return parseHotelResults(data);
}

/**
 * Count hotels in a city (fast, no body data).
 */
export async function countHotels({ city, timeoutMs = 15000 }) {
  if (!city) throw new Error('City name is required');

  const safeCity = city.replace(/["\\]/g, '');
  const query = `[out:json][timeout:15];
area["name"="${safeCity}"]["admin_level"~"^[2-8]$"]->.searchArea;
node["tourism"="hotel"](area.searchArea);
out count;`;

  const data = await overpassQuery(query, timeoutMs);
  return Number(data?.elements?.[0]?.tags?.total || 0);
}

/**
 * Execute an Overpass QL query via GET.
 */
async function overpassQuery(query, timeoutMs = 20000) {
  const url = new URL(OVERPASS_URL);
  url.searchParams.set('data', query);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (res.status === 429) {
      throw new Error('Overpass rate limited — wait 60s and retry');
    }
    if (!res.ok) {
      throw new Error(`Overpass HTTP ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Overpass request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse Overpass hotel results into a uniform shape.
 */
function parseHotelResults(data) {
  if (!data?.elements?.length) return [];

  return data.elements
    .map((el) => {
      const tags = el.tags || {};
      const name = tags.name || tags['name:en'];
      if (!name) return null; // Skip unnamed hotels

      return {
        name,
        lat: el.lat ?? el.center?.lat ?? null,
        lon: el.lon ?? el.center?.lon ?? null,
        stars: tags.stars ? Number(tags.stars) : null,
        brand: tags.brand || null,
        wikidataId: tags.wikidata || null,
        brandWikidataId: tags['brand:wikidata'] || null,
        website: tags.website || tags['contact:website'] || null,
        phone: tags.phone || tags['contact:phone'] || null,
        osmId: el.id,
        osmType: el.type,
        rooms: tags.rooms ? Number(tags.rooms) : null,
        operator: tags.operator || null,
      };
    })
    .filter(Boolean);
}

function isFiniteCoordinate(value) {
  return typeof value === 'number' && Number.isFinite(value);
}
