import { detectLocation, getClientIp } from '@/lib/geo';

/**
 * GET /api/geo
 * Auto-detect the user's location from their IP address.
 * Returns country, city, coordinates, local currency, and timezone.
 */
export async function GET(request) {
  try {
    const ip = getClientIp(request);
    const location = await detectLocation(ip);

    if (!location) {
      return Response.json(
        { error: 'Could not detect location' },
        { status: 503 }
      );
    }

    return Response.json(location, {
      headers: { 'Cache-Control': 'private, max-age=3600' },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
