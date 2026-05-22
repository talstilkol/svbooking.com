/**
 * Events API — Live upcoming events from Ticketmaster.
 *
 * GET /api/events?city=Paris
 * GET /api/events?city=Paris&startDate=2026-07-10&endDate=2026-07-17
 * GET /api/events?lat=48.85&lon=2.35
 *
 * Returns empty array if TICKETMASTER_API_KEY is not configured.
 * Results cached 6 hours in KV.
 */

import { kv } from '@/lib/kv';
import { isConfigured, getEvents } from '@/lib/ticketmaster';
import { getCityCoordinate } from '@/lib/city-coordinates';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const CACHE_TTL = 21600; // 6 hours
const eventsLimiter = rateLimit({ namespace: 'events', limit: 20, window: 60, failOpen: false });

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const lat = parseFloat(searchParams.get('lat'));
    const lon = parseFloat(searchParams.get('lon'));
    const startDate = searchParams.get('startDate') || getDefaultStartDate();
    const endDate = searchParams.get('endDate') || getDefaultEndDate();

    // Resolve coordinates
    let resolvedLat = lat;
    let resolvedLon = lon;

    if (city && (isNaN(lat) || isNaN(lon))) {
      const coord = getCityCoordinate(city);
      if (!coord) {
        return Response.json(
          { events: [], error: 'Unknown city' },
          { status: 404, headers: { 'Cache-Control': 'no-store' } }
        );
      }
      resolvedLat = coord.lat;
      resolvedLon = coord.lng;
    }

    if (isNaN(resolvedLat) || isNaN(resolvedLon)) {
      return Response.json(
        { error: 'city or lat/lon required' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!isConfigured()) {
      return Response.json({
        events: [],
        source: 'not-configured',
        message: 'Events provider unavailable',
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const lat2d = resolvedLat.toFixed(1);
    const lon2d = resolvedLon.toFixed(1);
    const cacheKey = `events:live:${lat2d}:${lon2d}:${startDate}:${endDate}`;

    // Check cache
    const cached = await kv.get(cacheKey);
    if (cached !== null && cached !== undefined) {
      return Response.json({
        events: cached,
        source: 'cache',
        city: city || null,
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
      });
    }

    const ip = getClientIp(request);
    const { success, reset } = await eventsLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    const events = await getEvents({
      lat: resolvedLat,
      lon: resolvedLon,
      startDate,
      endDate,
      radius: 25,
      limit: 10,
    });

    // Cache result
    await kv.setWithTTL(cacheKey, events, CACHE_TTL);

    return Response.json({
      events,
      source: events.length > 0 ? 'ticketmaster' : 'empty',
      city: city || null,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
    });
  } catch (err) {
    console.error('GET /api/events error:', err);
    return Response.json(
      { events: [], error: 'Events unavailable' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

function getDefaultStartDate() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function getDefaultEndDate() {
  const now = new Date();
  now.setDate(now.getDate() + 30);
  return now.toISOString().split('T')[0];
}
