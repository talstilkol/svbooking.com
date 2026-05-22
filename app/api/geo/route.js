import { detectLocation, getClientIp } from '@/lib/geo';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const geoLimiter = rateLimit({ namespace: 'geo', limit: 30, window: 60, failOpen: false });

/**
 * GET /api/geo
 * Auto-detect the user's location from their IP address.
 * Returns country, city, coordinates, local currency, and timezone.
 */
export async function GET(request) {
  try {
    const ip = getClientIp(request);
    const { success, reset } = await geoLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    const location = await detectLocation(ip);

    if (!location) {
      return Response.json(
        { error: 'Could not detect location' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return Response.json(location, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('GET /api/geo error:', err);
    return Response.json(
      { error: 'Location detection unavailable' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
