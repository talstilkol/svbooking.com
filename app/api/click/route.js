import { kv } from '@/lib/kv';
import { getAffiliateUrl, isAllowedProviderUrl, isKnownProvider } from '@/lib/affiliate';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { recordPriceObservation } from '@/lib/price-accuracy';
import { assertSameOrigin } from '@/lib/request-origin';
import { errorResponse } from '@/lib/validation';

// Rate limiter: 60 clicks per minute per IP (generous but prevents abuse)
const clickLimiter = rateLimit({ namespace: 'click', limit: 60, window: 60, failOpen: false });
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

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
    assertSameOrigin(request);

    // Rate limit
    const ip = getClientIp(request);
    const { success, reset } = await clickLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    const body = await request.json();
    const { hotelKey, provider, url, price, currency, taxesIncluded } = body;

    if (!url || !provider) {
      return Response.json({ error: 'url and provider are required' }, { status: 400, headers: NO_STORE_HEADERS });
    }
    if (!isKnownProvider(provider)) {
      return Response.json({ error: 'Unknown booking provider' }, { status: 400, headers: NO_STORE_HEADERS });
    }
    if (!isAllowedProviderUrl(provider, url)) {
      return Response.json({ error: 'Provider URL is not allowed' }, { status: 400, headers: NO_STORE_HEADERS });
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
          taxesIncluded: taxesIncluded ?? null,
          ts: Date.now(),
        });
        // 30-day TTL on click data
        await kv.setWithTTL(clickKey, clicks, 30 * 86400);
        await recordPriceObservation({
          hotelKey,
          provider,
          quotedTotal: price,
          currency: currency || 'USD',
          taxesIncluded: taxesIncluded ?? null,
          source: 'outbound-click',
        });
      } catch { /* non-critical */ }
    })();

    return Response.json(
      { redirectUrl },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    return errorResponse(err);
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
    const auth = verifyAdminAuth(request);
    if (!auth.authorized) return auth.response;

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
      headers: NO_STORE_HEADERS,
    });
  } catch (err) {
    console.error('GET /api/click error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
