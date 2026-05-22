// Events Cache Agent — Pre-warms live events from Ticketmaster.
// Only runs if TICKETMASTER_API_KEY is configured.
// Conservative: ~20 API calls per run (well within 5000/day free tier limit).

import { runAgent, verifyCronAuth, sleep, AGENT_NAMES } from '@/lib/agent-utils';
import { kv } from '@/lib/kv';
import { isConfigured, getEvents } from '@/lib/ticketmaster';
import { CITY_COORDINATES } from '@/lib/city-coordinates';

const CACHE_TTL = 21600; // 6 hours

async function runEventsCache() {
  if (!isConfigured()) {
    return {
      status: 'skipped',
      reason: 'TICKETMASTER_API_KEY not configured',
    };
  }

  const today = new Date();
  const startDate = today.toISOString().split('T')[0];
  const endDate = new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0];

  let cached = 0;
  let skipped = 0;
  let errors = 0;

  // Pre-warm top 20 cities
  const cities = CITY_COORDINATES.slice(0, 20);

  for (const coord of cities) {
    const lat1d = coord.lat.toFixed(1);
    const lon1d = coord.lng.toFixed(1);
    const cacheKey = `events:live:${lat1d}:${lon1d}:${startDate}:${endDate}`;

    // Skip if recently cached
    const existing = await kv.get(cacheKey);
    if (existing !== null && existing !== undefined) {
      skipped++;
      continue;
    }

    try {
      const events = await getEvents({
        lat: coord.lat,
        lon: coord.lng,
        startDate,
        endDate,
        radius: 25,
        limit: 10,
      });

      await kv.setWithTTL(cacheKey, events, CACHE_TTL);
      if (events.length > 0) cached++;

      // 1s delay between requests (conservative rate limiting)
      await sleep(1000);
    } catch {
      errors++;
      await sleep(1000);
    }
  }

  return {
    citiesChecked: cities.length,
    cached,
    skipped,
    errors,
    dateRange: `${startDate} to ${endDate}`,
  };
}

export async function GET(request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const status = await runAgent(AGENT_NAMES.EVENTS_CACHE, runEventsCache);
    return Response.json(status, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('GET /api/agents/auto/events-cache error:', err);
    return Response.json(
      { status: 'error', error: 'Events cache unavailable' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
