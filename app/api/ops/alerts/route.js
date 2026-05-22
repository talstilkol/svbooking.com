import { verifyAdminAuth } from '@/lib/admin-auth';
import { buildOpsAlerts } from '@/lib/ops-alerts';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(request) {
  try {
    const auth = verifyAdminAuth(request);
    if (!auth.authorized) return auth.response;

    const alerts = await buildOpsAlerts();
    return Response.json(alerts, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('GET /api/ops/alerts error:', err);
    return Response.json(
      { error: 'Ops alerts unavailable' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
