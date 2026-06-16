import { getRates, getHeatmap } from '@/lib/xotelo';
import { HOTELS } from '@/lib/hotels-catalog';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { addDays } from '@/lib/utils/date';
import { recordProviderUptimeEvent } from '@/lib/provider-observability';
import { getDictionary, resolveLocale } from '@/lib/i18n';

const healthCheckLimiter = rateLimit({ namespace: 'agents-health-check', limit: 10, window: 60, failOpen: false });
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

function fillTemplate(template, values) {
  return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => (
    values[key] === undefined || values[key] === null ? match : String(values[key])
  ));
}

function buildHealthCopy({ locale, acceptLanguage }) {
  const resolved = resolveLocale({ locale, acceptLanguage }).code;
  const dictionary = getDictionary(resolved);
  return (key, values = {}) => fillTemplate(dictionary[key] || key, values);
}

async function timedCall({ providerId, providerName, operation, fn, t }) {
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
    return { ok: false, latencyMs, error: t('agentHealthProbeUnavailable') };
  }
}

export async function GET(request) {
  try {
    const auth = verifyAdminAuth(request);
    if (!auth.authorized) return auth.response;

    const url = new URL(request.url);
    const t = buildHealthCopy({
      locale: url.searchParams.get('locale') || undefined,
      acceptLanguage: request.headers.get('accept-language') || '',
    });

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
        t,
      }),
      timedCall({
        providerId: 'xotelo',
        providerName: 'Xotelo',
        operation: 'heatmap-health-probe',
        fn: () => getHeatmap({ hotelKey: testHotel.hotelKey, checkOut }),
        t,
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
      suggestions.push(t('agentHealthRatesSlow', { latencyMs: ratesCheck.latencyMs }));
    }
    if (heatmapCheck.latencyMs > 2000) {
      suggestions.push(t('agentHealthHeatmapSlow', { latencyMs: heatmapCheck.latencyMs }));
    }
    if (!ratesCheck.ok) {
      suggestions.push(t('agentHealthRatesDown'));
    }
    if (!heatmapCheck.ok) {
      suggestions.push(t('agentHealthHeatmapDown'));
    }
    if (catalogIssues.length > 0) {
      suggestions.push(t('agentHealthCatalogIssues', { count: catalogIssues.length }));
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
      suggestions: [buildHealthCopy({
        locale: new URL(request.url).searchParams.get('locale') || undefined,
        acceptLanguage: request.headers.get('accept-language') || '',
      })('agentHealthUnavailable')],
    }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
