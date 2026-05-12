/**
 * Hotel Amenities API — Returns real amenity data from OpenStreetMap.
 *
 * GET /api/hotel-amenities?key=g187147-d188728
 *
 * Searches OSM for the hotel by name near its city coordinates,
 * then extracts amenity tags (WiFi, pool, parking, etc.).
 *
 * Returns null amenities if hotel not found in OSM — the component
 * falls back to its deterministic hash logic.
 *
 * Results cached 30 days (amenities rarely change).
 */

import { kv } from '@/lib/kv';
import { findHotel } from '@/lib/hotels-catalog';
import { getHotelAmenities } from '@/lib/overpass-pois';
import { getCityCoordinate } from '@/lib/city-coordinates';

const CACHE_TTL = 2592000; // 30 days

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelKey = searchParams.get('key');

    if (!hotelKey) {
      return Response.json({ error: 'key parameter required' }, { status: 400 });
    }

    // Check cache
    const cacheKey = `amenities:hotel:${hotelKey}`;
    const cached = await kv.get(cacheKey);
    if (cached !== null && cached !== undefined) {
      return Response.json({
        hotelKey,
        ...cached,
        source: 'cache',
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
      });
    }

    // Find hotel in catalog
    const hotel = findHotel(hotelKey);
    if (!hotel) {
      return Response.json({ hotelKey, amenities: null, source: 'not-found' });
    }

    // Get city coordinates
    const coords = getCityCoordinate(hotel.city);
    if (!coords) {
      // Cache the miss so we don't retry
      await kv.setWithTTL(cacheKey, { amenities: null }, CACHE_TTL);
      return Response.json({ hotelKey, amenities: null, source: 'no-coordinates' });
    }

    // Query Overpass for real amenities
    const result = await getHotelAmenities({
      lat: coords.lat,
      lon: coords.lng,
      hotelName: hotel.name,
    });

    // Cache result (even if null — avoids repeated Overpass queries)
    const cacheValue = result || { amenities: null };
    await kv.setWithTTL(cacheKey, cacheValue, CACHE_TTL);

    return Response.json({
      hotelKey,
      amenities: result?.amenities || null,
      stars: result?.stars || null,
      source: result ? 'osm' : 'not-in-osm',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    });
  } catch (err) {
    return Response.json(
      { error: err.message, amenities: null },
      { status: 500 }
    );
  }
}
