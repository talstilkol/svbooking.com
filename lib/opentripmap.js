/**
 * OpenTripMap API — enriched tourism POIs with descriptions and quality ratings.
 *
 * Completely free, keyless. Provides what OSM Overpass lacks:
 *   - Quality ratings (1=good, 2=very good, 3=excellent)
 *   - Wikipedia descriptions
 *   - Preview images
 *   - Curated categories (museums, historic, natural, etc.)
 *
 * Rate limit: ~5 req/sec (be polite).
 * Docs: https://opentripmap.io/docs
 */

const OTM_BASE = 'https://api.opentripmap.com/0.1/en/places';
const USER_AGENT = 'SVBooking-POIDiscovery/1.0';
const DEFAULT_TIMEOUT = 15000;
import { haversineMeters } from './utils/geo-distance';

// Map OpenTripMap kinds to display types and icons
const KIND_MAP = {
  museums: { type: 'Museum', icon: '🎨' },
  theatres_and_entertainments: { type: 'Theater', icon: '🎭' },
  historic: { type: 'Historic', icon: '🏛️' },
  cultural: { type: 'Cultural', icon: '🎭' },
  natural: { type: 'Nature', icon: '🌿' },
  religion: { type: 'Religious', icon: '⛪' },
  architecture: { type: 'Architecture', icon: '🏗️' },
  industrial_facilities: { type: 'Industrial', icon: '🏭' },
  amusements: { type: 'Entertainment', icon: '🎢' },
  sport: { type: 'Sport', icon: '⚽' },
  gardens_and_parks: { type: 'Park', icon: '🌳' },
  beaches: { type: 'Beach', icon: '🏖️' },
  geological_formations: { type: 'Nature', icon: '⛰️' },
  view_points: { type: 'Viewpoint', icon: '🏔️' },
  towers: { type: 'Tower', icon: '🗼' },
  fountains: { type: 'Fountain', icon: '⛲' },
  bridges: { type: 'Bridge', icon: '🌉' },
};

/**
 * Discover attractions near coordinates using OpenTripMap.
 *
 * @param {Object} opts
 * @param {number} opts.lat - Latitude
 * @param {number} opts.lon - Longitude
 * @param {number} [opts.radius=5000] - Search radius in meters
 * @param {string} [opts.kinds] - Comma-separated kinds filter
 * @param {number} [opts.limit=20] - Max results
 * @returns {Promise<Array<{xid: string, name: string, type: string, icon: string, rate: number, lat: number, lon: number, distance: string, distanceM: number}>>}
 */
export async function getAttractions({
  lat,
  lon,
  radius = 5000,
  kinds = 'interesting_places,museums,historic,natural,architecture,cultural,religion,amusements',
  limit = 20,
  timeoutMs = DEFAULT_TIMEOUT,
}) {
  const url = new URL(`${OTM_BASE}/radius`);
  url.searchParams.set('radius', String(radius));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('kinds', kinds);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(limit + 10)); // fetch extras for filtering

  const data = await fetchOTM(url.toString(), timeoutMs);
  if (!Array.isArray(data)) return [];

  return data
    .filter((item) => item.name && item.name.trim().length > 0)
    .map((item) => {
      const typeInfo = resolveKind(item.kinds || '');
      const pLat = item.point?.lat ?? 0;
      const pLon = item.point?.lon ?? 0;
      const dist = haversineMeters(lat, lon, pLat, pLon);

      return {
        xid: item.xid,
        name: item.name,
        type: typeInfo.type,
        icon: typeInfo.icon,
        rate: item.rate || 0,
        lat: pLat,
        lon: pLon,
        distance: formatDistance(dist),
        distanceM: dist,
        wikidataId: item.wikidata || null,
        osmId: item.osm ? `${item.osm}` : null,
      };
    })
    .sort((a, b) => b.rate - a.rate || a.distanceM - b.distanceM)
    .slice(0, limit);
}

/**
 * Get top-rated attractions (rate >= 2) near coordinates.
 *
 * @param {Object} opts
 * @param {number} opts.lat
 * @param {number} opts.lon
 * @param {number} [opts.limit=10]
 * @returns {Promise<Array>}
 */
export async function getTopAttractions({ lat, lon, radius = 5000, limit = 10, timeoutMs = DEFAULT_TIMEOUT }) {
  const all = await getAttractions({ lat, lon, radius, limit: 30, timeoutMs });
  return all.filter((a) => a.rate >= 2).slice(0, limit);
}

/**
 * Get detailed info about a specific place (description, image, Wikipedia link).
 *
 * @param {string} xid - OpenTripMap place ID
 * @returns {Promise<{name: string, description: string, imageUrl: string|null, wikipediaUrl: string|null, rate: number} | null>}
 */
export async function getPlaceDetails(xid, timeoutMs = DEFAULT_TIMEOUT) {
  if (!xid) return null;

  const url = `${OTM_BASE}/xid/${xid}`;
  try {
    const data = await fetchOTM(url, timeoutMs);
    if (!data || !data.name) return null;

    return {
      xid: data.xid,
      name: data.name,
      description: data.wikipedia_extracts?.text || data.info?.descr || null,
      imageUrl: data.preview?.source || data.image || null,
      wikipediaUrl: data.wikipedia || null,
      rate: data.rate || 0,
      kinds: data.kinds || '',
      address: data.address || null,
    };
  } catch {
    return null;
  }
}

// --- Internal helpers ---

async function fetchOTM(url, timeoutMs = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function resolveKind(kindsStr) {
  const kinds = kindsStr.split(',').map((k) => k.trim());
  for (const kind of kinds) {
    if (KIND_MAP[kind]) return KIND_MAP[kind];
  }
  // Try partial matches
  for (const kind of kinds) {
    for (const [key, val] of Object.entries(KIND_MAP)) {
      if (kind.includes(key) || key.includes(kind)) return val;
    }
  }
  return { type: 'Attraction', icon: '📍' };
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters / 100) * 100} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
