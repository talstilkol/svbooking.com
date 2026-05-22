import { verifyAdminAuth } from '@/lib/admin-auth';
import { getProviderUptimeMetrics } from '@/lib/provider-observability';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(request) {
  try {
    const auth = verifyAdminAuth(request);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 500;
    const uptime = await getProviderUptimeMetrics({ limit });
    return Response.json({ uptime }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('GET /api/agents/providers/uptime error:', err);
    return Response.json(
      { error: 'Provider uptime unavailable' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
