/**
 * Hotel Amenities API — Returns real amenity data from OpenStreetMap.
 *
 * GET /api/hotel-amenities?key=g187147-d188728
 *
 * Searches OSM for the hotel by name near its city coordinates,
 * then extracts amenity tags (WiFi, pool, parking, etc.).
 *
 * Returns null amenities if hotel not found in OSM; the component displays an
 * explicit unavailable state instead of generated amenity data.
 *
 * Results cached 30 days (amenities rarely change).
 */

import { kv } from '@/lib/kv';
import { findHotel } from '@/lib/hotels-catalog';
import { getHotelAmenities } from '@/lib/overpass-pois';
import { getCityCoordinate } from '@/lib/city-coordinates';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const CACHE_TTL = 2592000; // 30 days
const amenitiesLimiter = rateLimit({ namespace: 'hotel-amenities', limit: 20, window: 60, failOpen: false });

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelKey = searchParams.get('key');

    if (!hotelKey) {
      return Response.json(
        { error: 'key parameter required' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Check cache
    const cacheKey = `amenities:hotel:${hotelKey}`;
    const cached = await kv.get(cacheKey);
    if (cached !== null && cached !== undefined) {
      return Response.json({
        hotelKey,
        ...cached,
        source: cached.source === 'osm' ? 'osm-cache' : 'cache',
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
      });
    }

    // Find hotel in catalog
    const hotel = findHotel(hotelKey);
    if (!hotel) {
      return Response.json(
        { error: 'Hotel not found', hotelKey, amenities: null, source: 'not-found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Get city coordinates
    const coords = getCityCoordinate(hotel.city);
    if (!coords) {
      // Cache the miss so we don't retry
      await kv.setWithTTL(cacheKey, { amenities: null }, CACHE_TTL);
      return Response.json({ hotelKey, amenities: null, source: 'no-coordinates' });
    }

    const ip = getClientIp(request);
    const { success, reset } = await amenitiesLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    // Query Overpass for real amenities
    const result = await getHotelAmenities({
      lat: coords.lat,
      lon: coords.lng,
      hotelName: hotel.name,
    });

    // Cache result (even if null — avoids repeated Overpass queries)
    const cacheValue = result
      ? { ...result, amenities: result?.amenities || null, source: 'osm' }
      : { amenities: null, source: 'not-in-osm' };
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
    console.error('GET /api/hotel-amenities error:', err);
    return Response.json(
      { error: 'Hotel amenities unavailable', amenities: null },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
