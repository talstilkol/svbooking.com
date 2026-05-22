/**
 * POI API — Attractions and restaurants near a city or coordinates.
 *
 * GET /api/pois?city=Paris&type=attractions
 * GET /api/pois?city=Paris&type=restaurants
 * GET /api/pois?lat=48.856&lon=2.352&type=attractions&radius=5000
 *
 * Merges data from two free sources:
 *   1. OpenTripMap — quality ratings + descriptions (primary for top picks)
 *   2. Overpass (OSM) — comprehensive coverage (fills gaps)
 *
 * All results are KV-cached for 7 days.
 */

import { kv } from '@/lib/kv';
import { discoverAttractions, discoverRestaurants } from '@/lib/overpass-pois';
import { getAttractions as getOTMAttractions } from '@/lib/opentripmap';
import { getCityCoordinate } from '@/lib/city-coordinates';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const CACHE_TTL = 604800; // 7 days
const poisLimiter = rateLimit({ namespace: 'pois', limit: 20, window: 60, failOpen: false });

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'attractions';
    const city = searchParams.get('city');
    let lat = parseFloat(searchParams.get('lat'));
    let lon = parseFloat(searchParams.get('lon'));
    const radius = Math.min(
      parseInt(searchParams.get('radius')) || (type === 'restaurants' ? 2000 : 5000),
      25000 // Cap radius at 25km to prevent abuse
    );

    // Resolve city to coordinates if needed
    if (city && (!lat || !lon || isNaN(lat) || isNaN(lon))) {
      const coords = getCityCoordinate(city);
      if (coords) {
        lat = coords.lat;
        lon = coords.lng;
      }
    }

    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      return Response.json(
        { error: 'Provide city name or lat/lon coordinates' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Round to 2 decimal places for cache key (groups nearby requests)
    const latKey = lat.toFixed(2);
    const lonKey = lon.toFixed(2);
    const cacheKey = `poi:${type}:${latKey}:${lonKey}`;

    // Check cache first
    const cached = await kv.get(cacheKey);
    if (cached) {
      return Response.json({
        pois: cached,
        source: 'cache',
        city: city || null,
        count: cached.length,
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
      });
    }

    const ip = getClientIp(request);
    const { success, reset } = await poisLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    let pois;

    if (type === 'restaurants') {
      // Restaurants come from Overpass only (OpenTripMap doesn't focus on dining)
      pois = await discoverRestaurants({ lat, lon, radiusM: radius, limit: 15 });
    } else {
      // Attractions: merge OpenTripMap (quality) + Overpass (coverage)
      const [otmResults, overpassResults] = await Promise.allSettled([
        getOTMAttractions({ lat, lon, radius, limit: 15 }),
        discoverAttractions({ lat, lon, radiusM: radius, limit: 15 }),
      ]);

      const otm = otmResults.status === 'fulfilled' ? otmResults.value : [];
      const osm = overpassResults.status === 'fulfilled' ? overpassResults.value : [];

      // Merge: OTM results first (have quality ratings), then OSM that aren't duplicates
      pois = mergeAttractions(otm, osm);
    }

    // Cache the result
    if (pois.length > 0) {
      await kv.setWithTTL(cacheKey, pois, CACHE_TTL);
    }

    return Response.json({
      pois,
      source: 'live',
      city: city || null,
      count: pois.length,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    console.error('GET /api/pois error:', err);
    return Response.json(
      { error: 'POI data unavailable', pois: [], count: 0 },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

/**
 * Merge OpenTripMap + Overpass attractions, deduplicating by name proximity.
 * OTM results are preferred (they have quality scores).
 */
function mergeAttractions(otm, osm) {
  const merged = [...otm];
  const otmNames = new Set(otm.map((a) => a.name.toLowerCase()));

  for (const osmPoi of osm) {
    const nameKey = osmPoi.name.toLowerCase();
    // Skip if we already have this by exact name
    if (otmNames.has(nameKey)) continue;
    // Skip if we have a similar name (fuzzy match — first 10 chars)
    const prefix = nameKey.slice(0, 10);
    if ([...otmNames].some((n) => n.startsWith(prefix))) continue;

    merged.push({
      ...osmPoi,
      rate: 0, // OSM doesn't have quality ratings
      source: 'osm',
    });
  }

  // Sort by rating (desc) then distance (asc)
  return merged
    .sort((a, b) => (b.rate || 0) - (a.rate || 0) || (a.distanceM || 0) - (b.distanceM || 0))
    .slice(0, 20);
}
