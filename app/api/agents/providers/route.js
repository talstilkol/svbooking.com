import { getProviderStatus, resetProvider } from '@/lib/providers/index';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { recordAdminAuditEvent } from '@/lib/admin-audit';
import { getProviderCoverageMatrix } from '@/lib/provider-coverage';
import { getProviderUptimeMetrics } from '@/lib/provider-observability';
import { assertSameOrigin } from '@/lib/request-origin';
import { errorResponse } from '@/lib/validation';

const KNOWN_PROVIDER_IDS = new Set([
  'xotelo',
  'serpapi',
  'booking',
  'tripadvisor',
  'makcorps',
  'amadeus',
]);

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

/**
 * GET /api/agents/providers
 * Returns status of all pricing providers: quota usage, health, availability.
 *
 * POST /api/agents/providers
 * Body: { action: 'reset', providerId: 'xotelo' }
 * Resets a provider's circuit breaker.
 */
export async function GET(request) {
  try {
    const auth = verifyAdminAuth(request);
    if (!auth.authorized) return auth.response;

    const providers = getProviderStatus();

    const totalMonthly = providers.reduce((sum, p) => sum + (p.monthlyLimit || 0), 0);
    const totalUsed = providers.reduce((sum, p) => sum + p.callsThisMonth, 0);
    const configured = providers.filter((p) => p.configured).length;
    const available = providers.filter((p) => p.available).length;

    const uptime = await getProviderUptimeMetrics({ limit: 200 });
    const coverage = await getProviderCoverageMatrix({ days: 7 });

    return Response.json({
      summary: {
        totalProviders: providers.length,
        configured,
        available,
        totalMonthlyCapacity: totalMonthly || 'unlimited (Xotelo)',
        totalCallsThisMonth: totalUsed,
        totalCallsToday: providers.reduce((sum, p) => sum + p.callsToday, 0),
        uptimeStatus: uptime.status,
        uptimeEventCount: uptime.eventCount,
        uptimeSuccessRatePct: uptime.successRatePct,
        coverageStatus: coverage.status,
        coverageObservationCount: coverage.totalObservations,
        coverageObservedCities: coverage.catalogScope.observedCities,
        coverageObservedCountries: coverage.catalogScope.observedCountries,
      },
      uptime,
      coverage,
      providers,
    }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('GET /api/agents/providers error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);

    const auth = verifyAdminAuth(request);
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const { action, providerId } = body;

    if (action === 'reset' && providerId) {
      if (!KNOWN_PROVIDER_IDS.has(providerId)) {
        return Response.json({ error: 'Unknown provider' }, { status: 400, headers: NO_STORE_HEADERS });
      }
      resetProvider(providerId);
      await recordAdminAuditEvent({
        request,
        actor: auth.subject,
        action: 'provider.reset',
        resource: providerId,
        details: { providerId },
      });
      return Response.json(
        { ok: true, message: `Circuit breaker reset for ${providerId}` },
        { headers: NO_STORE_HEADERS }
      );
    }

    return Response.json({ error: 'Unknown action' }, { status: 400, headers: NO_STORE_HEADERS });
  } catch (err) {
    return errorResponse(err);
  }
}
