import { kv } from '@/lib/kv';
import { getAffiliateUrl } from '@/lib/affiliate';

/**
 * POST /api/click
 *
 * Track outbound booking clicks and return the affiliate-enriched redirect URL.
 *
 * Body: { hotelKey, provider, url, price?, currency? }
 * Returns: { redirectUrl }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { hotelKey, provider, url, price, currency } = body;

    if (!url || !provider) {
      return Response.json({ error: 'url and provider are required' }, { status: 400 });
    }

    // Build affiliate URL
    const redirectUrl = getAffiliateUrl(provider, url);

    // Track the click (fire-and-forget)
    (async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const clickKey = `clicks:${today}`;
        const clicks = (await kv.get(clickKey)) || [];
        clicks.push({
          hotelKey: hotelKey || 'unknown',
          provider,
          price: price || null,
          currency: currency || 'USD',
          ts: Date.now(),
        });
        // 30-day TTL on click data
        await kv.setWithTTL(clickKey, clicks, 30 * 86400);
      } catch { /* non-critical */ }
    })();

    return Response.json(
      { redirectUrl },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('POST /api/click error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/click/stats
 *
 * Returns click stats for the last N days (default: 7).
 * Useful for the dashboard.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = parseInt(searchParams.get('days') || '7', 10);
    const days = Math.min(daysParam, 30);

    const stats = { totalClicks: 0, byProvider: {}, byDay: {} };

    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const clickKey = `clicks:${dateStr}`;

      try {
        const clicks = (await kv.get(clickKey)) || [];
        stats.byDay[dateStr] = clicks.length;
        stats.totalClicks += clicks.length;

        for (const click of clicks) {
          stats.byProvider[click.provider] = (stats.byProvider[click.provider] || 0) + 1;
        }
      } catch { /* skip */ }
    }

    return Response.json(stats, {
      headers: { 'Cache-Control': 'public, s-maxage=60' },
    });
  } catch (err) {
    console.error('GET /api/click error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
