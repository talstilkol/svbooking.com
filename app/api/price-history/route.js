import { kv } from '@/lib/kv';

/**
 * GET /api/price-history?hotelKey=g187147-d188728&period=30
 *
 * Returns real price history data collected from comparison calls.
 * If no real data exists, returns hasRealData: false so the component
 * can fall back to estimated data.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelKey = searchParams.get('hotelKey');
    const period = parseInt(searchParams.get('period') || '30', 10);

    if (!hotelKey) {
      return Response.json({ error: 'hotelKey is required' }, { status: 400 });
    }

    const historyKey = `price-history:${hotelKey}`;
    let history = [];

    try {
      history = (await kv.get(historyKey)) || [];
    } catch {
      // KV unavailable
    }

    if (!Array.isArray(history) || history.length === 0) {
      return Response.json(
        { points: [], hasRealData: false, hotelKey },
        { headers: { 'Cache-Control': 'public, s-maxage=300' } }
      );
    }

    // Filter to requested period
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Math.min(period, 90));
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const filtered = history.filter((p) => p.date >= cutoffStr);

    return Response.json(
      {
        points: filtered,
        hasRealData: true,
        totalPoints: history.length,
        hotelKey,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } }
    );
  } catch (err) {
    console.error('GET /api/price-history error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
