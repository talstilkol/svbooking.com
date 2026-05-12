import { getSummary } from '@/lib/wikipedia';

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
      return Response.json({ error: 'city parameter is required' }, { status: 400 });
    }

    const summary = await getSummary(city);
    if (!summary) {
      return Response.json({ error: `No Wikipedia article found for "${city}"` }, { status: 404 });
    }

    return Response.json(summary, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
