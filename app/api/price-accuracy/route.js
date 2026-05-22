import { isKnownProvider } from '@/lib/affiliate';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getPriceAccuracyMetrics, recordPriceMismatch } from '@/lib/price-accuracy';
import { assertSameOrigin } from '@/lib/request-origin';
import { errorResponse } from '@/lib/validation';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const reportLimiter = rateLimit({ namespace: 'price-accuracy-report', limit: 10, window: 60, failOpen: false });

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const ip = getClientIp(request);
    const { success, reset } = await reportLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    const body = await request.json();
    const { hotelKey, provider, quotedTotal, observedTotal, currency, taxesIncluded } = body;

    if (!hotelKey || !provider) {
      return Response.json({ error: 'hotelKey and provider are required' }, { status: 400, headers: NO_STORE_HEADERS });
    }
    if (!isKnownProvider(provider)) {
      return Response.json({ error: 'Unknown booking provider' }, { status: 400, headers: NO_STORE_HEADERS });
    }
    if (!isFiniteNumber(quotedTotal) || !isFiniteNumber(observedTotal)) {
      return Response.json({ error: 'quotedTotal and observedTotal must be numbers' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const mismatch = await recordPriceMismatch({
      hotelKey,
      provider,
      quotedTotal,
      observedTotal,
      currency: currency || 'USD',
      taxesIncluded: taxesIncluded ?? null,
      source: 'user-report',
    });

    return Response.json({ recorded: true, mismatch }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(request) {
  try {
    const auth = verifyAdminAuth(request);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const metrics = await getPriceAccuracyMetrics({ days: searchParams.get('days') || 7 });
    return Response.json(metrics, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('GET /api/price-accuracy error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
