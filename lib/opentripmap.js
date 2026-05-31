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
const DEFAULT_RADIUS_M = 5000;
const MAX_RADIUS_M = 25000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const DEFAULT_KINDS = 'interesting_places,museums,historic,natural,architecture,cultural,religion,amusements';
import { haversineMeters } from './utils/geo-distance';
import { fetchWithTimeout } from './utils/fetch-with-timeout';
import { normalizeHttpsUrl } from './utils/public-url-safety';

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
  radius = DEFAULT_RADIUS_M,
  kinds = DEFAULT_KINDS,
  limit = DEFAULT_LIMIT,
  timeoutMs = DEFAULT_TIMEOUT,
}) {
  const origin = normalizeCoordinates(lat, lon);
  if (!origin) return [];
  const safeRadius = normalizeInteger(radius, DEFAULT_RADIUS_M, 1, MAX_RADIUS_M);
  const safeLimit = normalizeInteger(limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
  const safeKinds = normalizeKinds(kinds);

  const url = new URL(`${OTM_BASE}/radius`);
  url.searchParams.set('radius', String(safeRadius));
  url.searchParams.set('lon', String(origin.lon));
  url.searchParams.set('lat', String(origin.lat));
  url.searchParams.set('kinds', safeKinds);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(Math.min(MAX_LIMIT + 10, safeLimit + 10))); // fetch extras for filtering

  const data = await fetchOTM(url.toString(), timeoutMs);
  if (!Array.isArray(data)) return [];

  return data
    .filter((item) => normalizeText(item?.name))
    .map((item) => {
      const typeInfo = resolveKind(item.kinds || '');
      const point = normalizeCoordinates(item.point?.lat, item.point?.lon);
      if (!point) return null;
      const dist = haversineMeters(origin.lat, origin.lon, point.lat, point.lon);

      return {
        xid: normalizeText(item.xid),
        name: normalizeText(item.name),
        type: typeInfo.type,
        icon: typeInfo.icon,
        rate: normalizeInteger(item.rate, 0, 0, 3),
        lat: point.lat,
        lon: point.lon,
        distance: formatDistance(dist),
        distanceM: dist,
        wikidataId: normalizeWikidataId(item.wikidata),
        osmId: normalizeText(item.osm),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.rate - a.rate || a.distanceM - b.distanceM)
    .slice(0, safeLimit);
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
  const safeLimit = normalizeInteger(limit, 10, 1, MAX_LIMIT);
  const all = await getAttractions({ lat, lon, radius, limit: Math.max(30, safeLimit), timeoutMs });
  return all.filter((a) => a.rate >= 2).slice(0, safeLimit);
}

/**
 * Get detailed info about a specific place (description, image, Wikipedia link).
 *
 * @param {string} xid - OpenTripMap place ID
 * @returns {Promise<{name: string, description: string, imageUrl: string|null, wikipediaUrl: string|null, rate: number} | null>}
 */
export async function getPlaceDetails(xid, timeoutMs = DEFAULT_TIMEOUT) {
  const safeXid = normalizeXid(xid);
  if (!safeXid) return null;

  const url = `${OTM_BASE}/xid/${encodeURIComponent(safeXid)}`;
  try {
    const data = await fetchOTM(url, timeoutMs);
    const name = normalizeText(data?.name);
    if (!data || !name) return null;

    return {
      xid: normalizeText(data.xid) || safeXid,
      name,
      description: normalizeText(data.wikipedia_extracts?.text || data.info?.descr),
      imageUrl: normalizeHttpsUrl(data.preview?.source || data.image),
      wikipediaUrl: normalizeHttpsUrl(data.wikipedia),
      rate: normalizeInteger(data.rate, 0, 0, 3),
      kinds: normalizeKinds(data.kinds || ''),
      address: data.address || null,
    };
  } catch {
    return null;
  }
}

// --- Internal helpers ---

function normalizeText(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim().replace(/\s+/g, ' ');
  return text || null;
}

function normalizeInteger(value, fallback, min, max) {
  const number = Number(value);
  const integer = Number.isFinite(number) ? Math.trunc(number) : fallback;
  return Math.max(min, Math.min(max, integer));
}

function normalizeCoordinates(lat, lon) {
  const safeLat = Number(lat);
  const safeLon = Number(lon);
  if (!Number.isFinite(safeLat) || !Number.isFinite(safeLon)) return null;
  if (safeLat < -90 || safeLat > 90 || safeLon < -180 || safeLon > 180) return null;
  return { lat: safeLat, lon: safeLon };
}

function normalizeKinds(value) {
  const raw = typeof value === 'string' ? value : DEFAULT_KINDS;
  const kinds = raw
    .split(',')
    .map((kind) => kind.trim().toLowerCase())
    .filter((kind) => /^[a-z0-9_:-]{1,80}$/.test(kind));
  return kinds.length > 0 ? [...new Set(kinds)].join(',') : DEFAULT_KINDS;
}

function normalizeWikidataId(value) {
  const text = normalizeText(value)?.toUpperCase();
  return text && /^Q\d+$/.test(text) ? text : null;
}

function normalizeXid(value) {
  const text = normalizeText(value);
  return text && /^[A-Za-z0-9_-]{1,80}$/.test(text) ? text : null;
}

async function fetchOTM(url, timeoutMs = DEFAULT_TIMEOUT) {
  try {
    const res = await fetchWithTimeout(url, {
      timeoutMs,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
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
