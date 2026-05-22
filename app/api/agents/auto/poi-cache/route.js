// POI Cache Agent — Pre-warms attractions and restaurants from Overpass + OpenTripMap.
// Also pre-warms hotel amenities for all catalog hotels.
// Concurrency: 1 request at a time with 3s delay (Overpass rate limit).

import { runAgent, verifyCronAuth, sleep, AGENT_NAMES } from '@/lib/agent-utils';
import { kv } from '@/lib/kv';
import { discoverAttractions, discoverRestaurants, getHotelAmenities } from '@/lib/overpass-pois';
import { getTopAttractions } from '@/lib/opentripmap';
import { CITY_COORDINATES } from '@/lib/city-coordinates';
import { HOTELS } from '@/lib/hotels-catalog';

const POI_CACHE_TTL = 604800; // 7 days
const AMENITY_CACHE_TTL = 2592000; // 30 days

async function runPOICache() {
  let attractionsCached = 0;
  let restaurantsCached = 0;
  let amenitiesCached = 0;
  let errors = 0;

  // Phase 1: Pre-warm attractions and restaurants for top 20 cities
  for (const coord of CITY_COORDINATES.slice(0, 20)) {
    const lat2d = coord.lat.toFixed(2);
    const lon2d = coord.lng.toFixed(2);

    // Attractions (Overpass + OpenTripMap)
    const attractionsKey = `poi:attractions:${lat2d}:${lon2d}`;
    const existing = await kv.get(attractionsKey);
    if (existing === null || existing === undefined) {
      try {
        // Fetch from both sources
        const [overpass, otm] = await Promise.allSettled([
          discoverAttractions({ lat: coord.lat, lon: coord.lng, radiusM: 5000, limit: 20 }),
          getTopAttractions({ lat: coord.lat, lon: coord.lng, radius: 5000, limit: 10 }),
        ]);

        const overpassPois = overpass.status === 'fulfilled' ? overpass.value : [];
        const otmPois = otm.status === 'fulfilled' ? otm.value : [];

        // Merge: OpenTripMap first (has ratings), then Overpass for coverage
        const merged = mergeByName([...otmPois, ...overpassPois]);
        if (merged.length > 0) {
          await kv.setWithTTL(attractionsKey, merged, POI_CACHE_TTL);
          attractionsCached++;
        }

        await sleep(3000); // Rate limit
      } catch {
        errors++;
        await sleep(3000);
      }
    }

    // Restaurants (Overpass only)
    const restaurantsKey = `poi:restaurants:${lat2d}:${lon2d}`;
    const existingRestaurants = await kv.get(restaurantsKey);
    if (existingRestaurants === null || existingRestaurants === undefined) {
      try {
        const restaurants = await discoverRestaurants({
          lat: coord.lat,
          lon: coord.lng,
          radiusM: 2000,
          limit: 15,
        });
        if (restaurants.length > 0) {
          await kv.setWithTTL(restaurantsKey, restaurants, POI_CACHE_TTL);
          restaurantsCached++;
        }
        await sleep(3000);
      } catch {
        errors++;
        await sleep(3000);
      }
    }
  }

  // Phase 2: Pre-warm hotel amenities (first 30 hotels to stay within time budget)
  const hotelsToWarm = HOTELS.slice(0, 30);
  for (const hotel of hotelsToWarm) {
    const amenityKey = `amenities:hotel:${hotel.hotelKey}`;
    const existing = await kv.get(amenityKey);
    if (existing !== null && existing !== undefined) continue;

    try {
      const coord = CITY_COORDINATES.find(
        (c) => c.city === hotel.city
      );
      if (!coord) continue;

      const amenityResult = await getHotelAmenities({
        lat: coord.lat,
        lon: coord.lng,
        hotelName: hotel.name,
      });

      // Cache even null to avoid repeated failed lookups
      const cacheValue = amenityResult
        ? { ...amenityResult, amenities: amenityResult.amenities || null, source: 'osm' }
        : { amenities: null, source: 'not-in-osm' };
      await kv.setWithTTL(amenityKey, cacheValue, AMENITY_CACHE_TTL);
      if (amenityResult?.amenities?.length > 0) amenitiesCached++;

      await sleep(3000);
    } catch {
      errors++;
      await sleep(3000);
    }
  }

  return {
    attractionsCached,
    restaurantsCached,
    amenitiesCached,
    errors,
    citiesChecked: Math.min(CITY_COORDINATES.length, 20),
    hotelsChecked: hotelsToWarm.length,
  };
}

/**
 * Deduplicate POIs by name (case-insensitive prefix match).
 */
function mergeByName(pois) {
  const seen = new Set();
  return pois.filter((p) => {
    const key = p.name.toLowerCase().slice(0, 20);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const status = await runAgent(AGENT_NAMES.POI_CACHE, runPOICache);
    return Response.json(status, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('GET /api/agents/auto/poi-cache error:', err);
    return Response.json(
      { status: 'error', error: 'POI cache unavailable' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
