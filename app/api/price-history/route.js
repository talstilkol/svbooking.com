import { kv } from '@/lib/kv';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const BLOCKED_PROVIDER_VALUES = new Set([
  '',
  'unknown',
  'unknown provider',
  'none',
  'null',
  'undefined',
  'unavailable',
  'estimated',
  'estimate',
  'heatmap',
  'cache',
  'not-found',
  'not-configured',
  'xotelo-heatmap',
]);

function normalizePeriod(value) {
  const period = Number.parseInt(value || '30', 10);
  if (!Number.isFinite(period) || period < 1) return 30;
  return Math.min(period, 90);
}

function normalizeText(value) {
  return String(value || '').trim();
}

function hasVerifiedProvider(value) {
  const provider = normalizeText(value);
  return provider.length > 0 && !BLOCKED_PROVIDER_VALUES.has(provider.toLowerCase());
}

function sanitizePoint(point) {
  const date = normalizeText(point?.date);
  const price = Number(point?.price);
  const provider = normalizeText(point?.provider);
  const source = normalizeText(point?.source);
  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (!DATE_RE.test(date)) return null;
  if (!Number.isFinite(parsedDate.getTime())) return null;
  if (parsedDate.toISOString().split('T')[0] !== date) return null;
  if (!Number.isFinite(price) || price <= 0) return null;
  if (!hasVerifiedProvider(provider)) return null;
  if (source && !hasVerifiedProvider(source)) return null;

  return {
    date,
    price,
    provider,
    source: source || null,
    lastCheckedAt: normalizeText(point?.lastCheckedAt) || null,
  };
}

/**
 * GET /api/price-history?hotelKey=g187147-d188728&period=30
 *
 * Returns real price history data collected from comparison calls.
 * If no real data exists, returns hasRealData: false.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelKey = searchParams.get('hotelKey');
    const period = normalizePeriod(searchParams.get('period'));

    if (!hotelKey) {
      return Response.json({ error: 'hotelKey is required' }, { status: 400, headers: NO_STORE_HEADERS });
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
        { points: [], hasRealData: false, hotelKey, dataPolicy: 'verified-provider-observations-only' },
        { headers: { 'Cache-Control': 'public, s-maxage=300' } }
      );
    }

    // Filter to requested period
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - period);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const sanitized = history
      .map(sanitizePoint)
      .filter(Boolean)
      .sort((a, b) => a.date.localeCompare(b.date));
    const filtered = sanitized.filter((p) => p.date >= cutoffStr);

    if (filtered.length === 0) {
      return Response.json(
        {
          points: [],
          hasRealData: false,
          totalPoints: sanitized.length,
          hotelKey,
          dataPolicy: 'verified-provider-observations-only',
        },
        { headers: { 'Cache-Control': 'public, s-maxage=300' } }
      );
    }

    return Response.json(
      {
        points: filtered,
        hasRealData: true,
        totalPoints: sanitized.length,
        hotelKey,
        dataPolicy: 'verified-provider-observations-only',
      },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } }
    );
  } catch (err) {
    console.error('GET /api/price-history error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
