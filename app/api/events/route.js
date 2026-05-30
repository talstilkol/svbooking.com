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
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' };

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = cleanText(searchParams.get('city'));
    const lat = parseCoordinateParam(searchParams.get('lat'), -90, 90);
    const lon = parseCoordinateParam(searchParams.get('lon'), -180, 180);
    const startDate = parseDateParam(searchParams.get('startDate'), getDefaultStartDate(), 'startDate');
    const endDate = parseDateParam(searchParams.get('endDate'), getDefaultEndDate(), 'endDate');

    if (startDate.error) return validationResponse(startDate.error);
    if (endDate.error) return validationResponse(endDate.error);
    if (startDate.value > endDate.value) {
      return validationResponse('startDate must be on or before endDate');
    }

    // Resolve coordinates
    let resolvedLat = lat.value;
    let resolvedLon = lon.value;

    if (city && (lat.value === null || lon.value === null)) {
      const coord = getCityCoordinate(city);
      if (!coord) {
        return Response.json(
          { events: [], error: 'Unknown city' },
          { status: 404, headers: NO_STORE_HEADERS }
        );
      }
      resolvedLat = coord.lat;
      resolvedLon = coord.lng;
    }

    if (!city && (lat.error || lon.error)) {
      return validationResponse(lat.error || lon.error);
    }

    if (!isValidCoordinate(resolvedLat, -90, 90) || !isValidCoordinate(resolvedLon, -180, 180)) {
      return validationResponse('city or valid lat/lon required');
    }

    if (!isConfigured()) {
      return Response.json({
        events: [],
        source: 'not-configured',
        message: 'Events provider unavailable',
      }, { headers: NO_STORE_HEADERS });
    }

    const lat2d = resolvedLat.toFixed(1);
    const lon2d = resolvedLon.toFixed(1);
    const cacheKey = `events:live:${lat2d}:${lon2d}:${startDate.value}:${endDate.value}`;

    // Check cache
    const cached = await kv.get(cacheKey);
    if (cached !== null && cached !== undefined) {
      return Response.json({
        events: cached,
        source: 'cache',
        city: city || null,
      }, { headers: CACHE_HEADERS });
    }

    const ip = getClientIp(request);
    const { success, reset } = await eventsLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    const events = await getEvents({
      lat: resolvedLat,
      lon: resolvedLon,
      startDate: startDate.value,
      endDate: endDate.value,
      radius: 25,
      limit: 10,
    });

    // Cache result
    await kv.setWithTTL(cacheKey, events, CACHE_TTL);

    return Response.json({
      events,
      source: events.length > 0 ? 'ticketmaster' : 'empty',
      city: city || null,
    }, { headers: CACHE_HEADERS });
  } catch (err) {
    console.error('GET /api/events error:', err);
    return Response.json(
      { events: [], error: 'Events unavailable' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

function validationResponse(error) {
  return Response.json({ events: [], error }, { status: 400, headers: NO_STORE_HEADERS });
}

function cleanText(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/\s+/g, ' ');
  return text || null;
}

function parseCoordinateParam(value, min, max) {
  if (value === null || value === '') return { value: null, error: null };
  const text = String(value).trim();
  if (!/^-?\d+(?:\.\d+)?$/u.test(text)) {
    return { value: null, error: 'lat/lon must be valid decimal degrees' };
  }
  const number = Number(text);
  if (!isValidCoordinate(number, min, max)) {
    return { value: null, error: 'lat/lon must be within valid coordinate bounds' };
  }
  return { value: number, error: null };
}

function isValidCoordinate(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function parseDateParam(value, fallback, name) {
  if (value === null || value === '') return { value: fallback, error: null };
  const text = String(value).trim();
  if (!isIsoDate(text)) {
    return { value: fallback, error: `${name} must be a valid YYYY-MM-DD date` };
  }
  return { value: text, error: null };
}

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
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
