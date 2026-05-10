import { getRates, getHeatmap } from '@/lib/xotelo';
import { HOTELS } from '@/lib/hotels-catalog';

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function timedCall(fn) {
  const start = Date.now();
  try {
    await fn();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: err.message };
  }
}

export async function GET() {
  try {
    const testHotel = HOTELS[0];
    const today = new Date().toISOString().split('T')[0];
    const checkIn = addDays(today, 14);
    const checkOut = addDays(today, 16);

    const [ratesCheck, heatmapCheck] = await Promise.all([
      timedCall(() => getRates({ hotelKey: testHotel.hotelKey, checkIn, checkOut })),
      timedCall(() => getHeatmap({ hotelKey: testHotel.hotelKey, checkOut })),
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
    });
  } catch (err) {
    return Response.json({
      status: 'error',
      checkedAt: new Date().toISOString(),
      checks: {},
      suggestions: [`Health check failed: ${err.message}`],
    }, { status: 500 });
  }
}
