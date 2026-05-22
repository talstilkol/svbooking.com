import { getRates, getHeatmap } from '@/lib/xotelo';
import { HOTELS } from '@/lib/hotels-catalog';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { addDays } from '@/lib/utils/date';
import { recordProviderUptimeEvent } from '@/lib/provider-observability';

const healthCheckLimiter = rateLimit({ namespace: 'agents-health-check', limit: 10, window: 60, failOpen: false });
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

async function timedCall({ providerId, providerName, operation, fn }) {
  const start = Date.now();
  try {
    await fn();
    const latencyMs = Date.now() - start;
    await recordProviderUptimeEvent({
      providerId,
      providerName,
      operation,
      ok: true,
      latencyMs,
      source: 'agents-health-check',
    });
    return { ok: true, latencyMs };
  } catch (err) {
    console.error('Health check probe error:', err);
    const latencyMs = Date.now() - start;
    await recordProviderUptimeEvent({
      providerId,
      providerName,
      operation,
      ok: false,
      latencyMs,
      source: 'agents-health-check',
    });
    return { ok: false, latencyMs, error: 'Probe unavailable' };
  }
}

export async function GET(request) {
  try {
    const auth = verifyAdminAuth(request);
    if (!auth.authorized) return auth.response;

    const ip = getClientIp(request);
    const { success, reset } = await healthCheckLimiter.check(ip);
    if (!success) return rateLimitResponse(reset);

    const testHotel = HOTELS[0];
    const today = new Date().toISOString().split('T')[0];
    const checkIn = addDays(today, 14);
    const checkOut = addDays(today, 16);

    const [ratesCheck, heatmapCheck] = await Promise.all([
      timedCall({
        providerId: 'xotelo',
        providerName: 'Xotelo',
        operation: 'rates-health-probe',
        fn: () => getRates({ hotelKey: testHotel.hotelKey, checkIn, checkOut }),
      }),
      timedCall({
        providerId: 'xotelo',
        providerName: 'Xotelo',
        operation: 'heatmap-health-probe',
        fn: () => getHeatmap({ hotelKey: testHotel.hotelKey, checkOut }),
      }),
    ]);

    const catalogIssues = [];
    for (const hotel of HOTELS) {
      if (!hotel.hotelKey || !hotel.hotelKey.match(/^g\d+-d\d+$/)) {
        catalogIssues.push(`Invalid hotelKey format: ${hotel.hotelKey}`);
      }
      if (!hotel.name || !hotel.city || !hotel.country) {
        catalogIssues.push(`Missing fields for: ${hotel.hotelKey}`);
      }
    }

    const catalogCheck = {
      ok: catalogIssues.length === 0,
      latencyMs: 0,
      hotelCount: HOTELS.length,
      issues: catalogIssues,
    };

    const suggestions = [];
    if (ratesCheck.latencyMs > 2000) {
      suggestions.push(`Xotelo rates API is slow (${ratesCheck.latencyMs}ms) — consider adding response caching`);
    }
    if (heatmapCheck.latencyMs > 2000) {
      suggestions.push(`Xotelo heatmap API is slow (${heatmapCheck.latencyMs}ms) — consider adding response caching`);
    }
    if (!ratesCheck.ok) {
      suggestions.push('Xotelo rates endpoint is down — price comparison features may be unavailable');
    }
    if (!heatmapCheck.ok) {
      suggestions.push('Xotelo heatmap endpoint is down — cheaper dates feature may be unavailable');
    }
    if (catalogIssues.length > 0) {
      suggestions.push(`${catalogIssues.length} catalog issue(s) found — check hotel data integrity`);
    }

    const allOk = ratesCheck.ok && heatmapCheck.ok && catalogCheck.ok;
    const anyError = !ratesCheck.ok || !heatmapCheck.ok;

    return Response.json({
      status: anyError ? 'error' : allOk ? 'healthy' : 'degraded',
      checkedAt: new Date().toISOString(),
      checks: {
        xoteloRates: ratesCheck,
        xoteloHeatmap: heatmapCheck,
        catalogIntegrity: catalogCheck,
      },
      suggestions,
    }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('GET /api/agents/health-check error:', err);
    return Response.json({
      status: 'error',
      checkedAt: new Date().toISOString(),
      checks: {},
      suggestions: ['Health check unavailable'],
    }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
