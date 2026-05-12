import { getProviderStatus, resetProvider } from '@/lib/providers/index';

/**
 * GET /api/agents/providers
 * Returns status of all pricing providers: quota usage, health, availability.
 *
 * POST /api/agents/providers
 * Body: { action: 'reset', providerId: 'xotelo' }
 * Resets a provider's circuit breaker.
 */
export async function GET() {
  try {
    const providers = getProviderStatus();

    const totalMonthly = providers.reduce((sum, p) => sum + (p.monthlyLimit || 0), 0);
    const totalUsed = providers.reduce((sum, p) => sum + p.callsThisMonth, 0);
    const configured = providers.filter((p) => p.configured).length;
    const available = providers.filter((p) => p.available).length;

    return Response.json({
      summary: {
        totalProviders: providers.length,
        configured,
        available,
        totalMonthlyCapacity: totalMonthly || 'unlimited (Xotelo)',
        totalCallsThisMonth: totalUsed,
        totalCallsToday: providers.reduce((sum, p) => sum + p.callsToday, 0),
      },
      providers,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, providerId } = body;

    if (action === 'reset' && providerId) {
      resetProvider(providerId);
      return Response.json({ ok: true, message: `Circuit breaker reset for ${providerId}` });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
