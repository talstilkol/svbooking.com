/**
 * Travel Guide API — Safety info, events, and dining from Wikivoyage.
 *
 * GET /api/travel-guide?city=Paris&section=safety
 * GET /api/travel-guide?city=Paris&section=events
 * GET /api/travel-guide?city=Paris&section=eat
 * GET /api/travel-guide?city=Paris&section=overview
 *
 * All data comes from Wikivoyage (Wikimedia Foundation) — free, no auth.
 * Results cached 7 days in KV.
 */

import { kv } from '@/lib/kv';
import { getTravelGuide, getSafetyInfo, getEventInfo, getDiningInfo } from '@/lib/wikivoyage';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const CACHE_TTL = 604800; // 7 days
const travelGuideLimiter = rateLimit({ namespace: 'travel-guide', limit: 20, window: 60, failOpen: false });

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const section = searchParams.get('section') || 'overview';

    if (!city) {
      return Response.json(
        { error: 'city parameter required' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const cacheKey = `wikivoyage:${section}:${city.toLowerCase()}`;

    // Check cache
    const cached = await kv.get(cacheKey);
    if (cached !== null && cached !== undefined) {
      return Response.json({
        city,
        section,
        data: cached,
        source: 'cache',
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
      });
    }

    const ip = getClientIp(request);
    const { success, reset } = await travelGuideLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    let data = null;

    switch (section) {
      case 'safety':
        data = await getSafetyInfo(city);
        break;
      case 'events':
        data = await getEventInfo(city);
        break;
      case 'eat':
        data = await getDiningInfo(city);
        break;
      case 'overview':
      default:
        data = await getTravelGuide(city);
        break;
    }

    // Cache even if null (to avoid repeated failed lookups)
    await kv.setWithTTL(cacheKey, data, CACHE_TTL);

    return Response.json({
      city,
      section,
      data,
      source: data ? 'wikivoyage' : 'not-found',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (err) {
    console.error('GET /api/travel-guide error:', err);
    return Response.json(
      { error: 'Travel guide unavailable', data: null },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
