/**
 * Overpass API — POI discovery (attractions, restaurants) + hotel amenities.
 *
 * Extends the existing Overpass hotel discovery with POI queries.
 * Free, no auth, same rate limits as hotel queries (~1 req/sec polite usage).
 *
 * Used by:
 *   - /api/pois — attractions & restaurants for NearbyAttractions component
 *   - /api/hotel-amenities — real amenity tags for HotelAmenities component
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'SVBooking-POIDiscovery/1.0';
const DEFAULT_TIMEOUT = 25000;
import { haversineMeters } from './utils/geo-distance';

// --- Type/icon mapping from OSM tags ---

const ATTRACTION_TYPE_MAP = {
  museum: { type: 'Museum', icon: '🎨' },
  attraction: { type: 'Attraction', icon: '📍' },
  gallery: { type: 'Gallery', icon: '🖼️' },
  viewpoint: { type: 'Viewpoint', icon: '🏔️' },
  artwork: { type: 'Art', icon: '🎭' },
  castle: { type: 'Castle', icon: '🏰' },
  monument: { type: 'Monument', icon: '🗿' },
  memorial: { type: 'Memorial', icon: '🕯️' },
  archaeological_site: { type: 'Archaeological', icon: '🏺' },
  park: { type: 'Park', icon: '🌳' },
  garden: { type: 'Garden', icon: '🌷' },
  theme_park: { type: 'Theme Park', icon: '🎢' },
  zoo: { type: 'Zoo', icon: '🦁' },
};

const CUISINE_ICONS = {
  italian: '🍝', japanese: '🍱', chinese: '🥡', indian: '🍛',
  french: '🥐', mexican: '🌮', thai: '🍜', korean: '🥘',
  pizza: '🍕', sushi: '🍣', seafood: '🦐', burger: '🍔',
  default: '🍽️',
};

// --- OSM amenity tag → amenity label mapping ---

const AMENITY_TAG_MAP = {
  'internet_access': { match: ['wlan', 'wifi'], label: 'WiFi', icon: '📶' },
  'parking': { match: ['yes', 'surface', 'underground', 'multi-storey'], label: 'Parking', icon: '🅿️' },
  'swimming_pool': { match: ['yes', 'outdoor', 'indoor'], label: 'Swimming Pool', icon: '🏊' },
  'fitness_centre': { match: ['yes'], label: 'Fitness Center', icon: '💪' },
  'breakfast': { match: ['yes', 'buffet'], label: 'Breakfast', icon: '🍳' },
  'air_conditioning': { match: ['yes'], label: 'Air Conditioning', icon: '❄️' },
  'spa': { match: ['yes'], label: 'Spa/Wellness', icon: '🛁' },
  'restaurant': { match: ['yes'], label: 'Restaurant', icon: '🍽️' },
  'bar': { match: ['yes'], label: 'Bar/Lounge', icon: '🍸' },
  'wheelchair': { match: ['yes', 'limited'], label: 'Accessible', icon: '♿' },
  'smoking': { match: ['no'], label: 'Non-smoking', icon: '🚭' },
};

/**
 * Discover tourist attractions near coordinates.
 *
 * @param {Object} opts
 * @param {number} opts.lat - Latitude
 * @param {number} opts.lon - Longitude
 * @param {number} [opts.radiusM=5000] - Search radius in meters
 * @param {number} [opts.limit=20] - Max results
 * @returns {Promise<Array<{name: string, type: string, distance: string, icon: string, lat: number, lon: number}>>}
 */
export async function discoverAttractions({ lat, lon, radiusM = 5000, limit = 20, timeoutMs = DEFAULT_TIMEOUT }) {
  const query = `[out:json][timeout:25];
(
  node["tourism"~"attraction|museum|viewpoint|artwork|gallery"](around:${radiusM},${lat},${lon});
  node["historic"~"castle|monument|memorial|archaeological_site"](around:${radiusM},${lat},${lon});
  node["leisure"~"park|garden"](around:${radiusM},${lat},${lon});
  way["tourism"~"attraction|museum"](around:${radiusM},${lat},${lon});
  way["historic"~"castle|monument"](around:${radiusM},${lat},${lon});
  way["leisure"~"park|garden"]["name"](around:${radiusM},${lat},${lon});
);
out center ${limit + 10};`;

  const data = await overpassQuery(query, timeoutMs);
  return parseAttractionResults(data, lat, lon).slice(0, limit);
}

/**
 * Discover restaurants near coordinates.
 *
 * @param {Object} opts
 * @param {number} opts.lat - Latitude
 * @param {number} opts.lon - Longitude
 * @param {number} [opts.radiusM=2000] - Search radius in meters
 * @param {number} [opts.limit=15] - Max results
 * @returns {Promise<Array<{name: string, cuisine: string, distance: string, icon: string, lat: number, lon: number}>>}
 */
export async function discoverRestaurants({ lat, lon, radiusM = 2000, limit = 15, timeoutMs = DEFAULT_TIMEOUT }) {
  const query = `[out:json][timeout:25];
(
  node["amenity"="restaurant"]["name"](around:${radiusM},${lat},${lon});
  way["amenity"="restaurant"]["name"](around:${radiusM},${lat},${lon});
);
out center ${limit + 5};`;

  const data = await overpassQuery(query, timeoutMs);
  return parseRestaurantResults(data, lat, lon).slice(0, limit);
}

/**
 * Get real amenity data for a hotel from OSM.
 * Searches by name near coordinates. Returns null if hotel not found in OSM.
 *
 * @param {Object} opts
 * @param {number} opts.lat - Approximate latitude
 * @param {number} opts.lon - Approximate longitude
 * @param {string} opts.hotelName - Hotel name to match
 * @returns {Promise<Array<{icon: string, label: string}>|null>}
 */
export async function getHotelAmenities({ lat, lon, hotelName, timeoutMs = 15000 }) {
  if (!isFiniteCoordinate(lat) || !isFiniteCoordinate(lon) || !hotelName) return null;

  // Sanitize: escape regex chars AND Overpass QL injection chars (quotes, brackets)
  const sanitized = hotelName
    .replace(/["\\]/g, '') // Remove chars that break Overpass QL strings
    .replace(/[.*+?^${}()|[\]]/g, '\\$&'); // Escape regex special chars
  // Use a shorter version of the name for matching (first 2+ words)
  const shortName = sanitized.split(/\s+/).slice(0, 3).join(' ');
  if (!shortName || shortName.length < 2) return null;

  const query = `[out:json][timeout:10];
(
  node["tourism"="hotel"]["name"~"${shortName}",i](around:500,${lat},${lon});
  way["tourism"="hotel"]["name"~"${shortName}",i](around:500,${lat},${lon});
);
out tags 1;`;

  try {
    const data = await overpassQuery(query, timeoutMs);
    if (!data?.elements?.length) return null;

    const tags = data.elements[0].tags || {};
    return extractAmenities(tags);
  } catch {
    return null;
  }
}

// --- Internal helpers ---

async function overpassQuery(query, timeoutMs = DEFAULT_TIMEOUT) {
  const url = new URL(OVERPASS_URL);
  url.searchParams.set('data', query);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    clearTimeout(timer);

    if (res.status === 429) throw new Error('Overpass rate limited');
    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);

    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Overpass timeout');
    throw err;
  }
}

function parseAttractionResults(data, centerLat, centerLon) {
  if (!data?.elements?.length) return [];

  const seen = new Set();

  return data.elements
    .map((el) => {
      const tags = el.tags || {};
      const name = tags.name || tags['name:en'];
      if (!name) return null;

      // Deduplicate by name (OSM can have node + way for same POI)
      const nameKey = name.toLowerCase();
      if (seen.has(nameKey)) return null;
      seen.add(nameKey);

      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;

      // Determine type from tags
      const typeInfo = resolveAttractionType(tags);

      return {
        name,
        type: typeInfo.type,
        icon: typeInfo.icon,
        distance: formatDistance(haversineMeters(centerLat, centerLon, elLat, elLon)),
        distanceM: haversineMeters(centerLat, centerLon, elLat, elLon),
        lat: elLat,
        lon: elLon,
        wikidataId: tags.wikidata || null,
        website: tags.website || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceM - b.distanceM);
}

function parseRestaurantResults(data, centerLat, centerLon) {
  if (!data?.elements?.length) return [];

  const seen = new Set();

  return data.elements
    .map((el) => {
      const tags = el.tags || {};
      const name = tags.name || tags['name:en'];
      if (!name) return null;

      const nameKey = name.toLowerCase();
      if (seen.has(nameKey)) return null;
      seen.add(nameKey);

      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      const cuisine = tags.cuisine || '';
      const primaryCuisine = cuisine.split(';')[0].split(',')[0].trim().toLowerCase();

      return {
        name,
        cuisine: primaryCuisine ? capitalizeFirst(primaryCuisine) : 'Restaurant',
        icon: CUISINE_ICONS[primaryCuisine] || CUISINE_ICONS.default,
        distance: formatDistance(haversineMeters(centerLat, centerLon, elLat, elLon)),
        distanceM: haversineMeters(centerLat, centerLon, elLat, elLon),
        lat: elLat,
        lon: elLon,
        stars: tags.stars ? Number(tags.stars) : null,
        website: tags.website || null,
        phone: tags.phone || tags['contact:phone'] || null,
        openingHours: tags.opening_hours || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceM - b.distanceM);
}

function resolveAttractionType(tags) {
  // Check tourism tags first
  for (const key of ['tourism', 'historic', 'leisure']) {
    const val = tags[key];
    if (val && ATTRACTION_TYPE_MAP[val]) return ATTRACTION_TYPE_MAP[val];
  }
  // Fallback
  if (tags.tourism) return { type: capitalizeFirst(tags.tourism), icon: '📍' };
  if (tags.historic) return { type: 'Historic', icon: '🏛️' };
  if (tags.leisure) return { type: capitalizeFirst(tags.leisure), icon: '🌳' };
  return { type: 'Place', icon: '📍' };
}

function extractAmenities(tags) {
  const amenities = [];

  for (const [tagKey, mapping] of Object.entries(AMENITY_TAG_MAP)) {
    const val = (tags[tagKey] || '').toLowerCase();
    if (val && mapping.match.some((m) => val.includes(m))) {
      amenities.push({ icon: mapping.icon, label: mapping.label });
    }
  }

  const internetAccess = (tags.internet_access || '').toLowerCase();
  const hasInternetAccess = ['wlan', 'wifi', 'yes'].some((value) => internetAccess.includes(value));
  if (hasInternetAccess && tags['internet_access:fee'] === 'no') {
    const wifiIndex = amenities.findIndex((a) => a.label === 'WiFi');
    if (wifiIndex >= 0) amenities.splice(wifiIndex, 1);
    amenities.push({ icon: '📶', label: 'Free WiFi' });
  }

  // Stars info (not an amenity but useful metadata)
  const stars = tags.stars ? Number(tags.stars) : null;

  return amenities.length > 0 ? { amenities, stars } : null;
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters / 100) * 100} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function isFiniteCoordinate(value) {
  return typeof value === 'number' && Number.isFinite(value);
}
