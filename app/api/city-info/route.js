import { getSummary } from '@/lib/wikipedia';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const cityInfoLimiter = rateLimit({ namespace: 'city-info', limit: 30, window: 60, failOpen: false });

/**
 * GET /api/city-info?city=Paris
 *
 * Returns city description, thumbnail, and Wikipedia link.
 * Uses Wikipedia REST API (free, no auth).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');

    if (!city) {
      return Response.json(
        { error: 'city parameter is required' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const ip = getClientIp(request);
    const { success, reset } = await cityInfoLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    const summary = await getSummary(city);
    if (!summary) {
      return Response.json(
        {
          error: 'City information unavailable',
          source: 'Wikipedia',
          sourceStatus: 'unavailable',
          dataPolicy: 'wikipedia-summary-only',
        },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return Response.json({
      ...summary,
      source: 'Wikipedia',
      sourceStatus: 'available',
      dataPolicy: 'wikipedia-summary-only',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    });
  } catch (err) {
    console.error('GET /api/city-info error:', err);
    return Response.json(
      {
        error: 'City information unavailable',
        source: 'Wikipedia',
        sourceStatus: 'unavailable',
        dataPolicy: 'wikipedia-summary-only',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
