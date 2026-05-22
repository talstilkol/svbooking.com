import { verifyAdminAuth } from '@/lib/admin-auth';
import { buildOpsScorecard } from '@/lib/ops-scorecard';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(request) {
  try {
    const auth = verifyAdminAuth(request);
    if (!auth.authorized) return auth.response;

    return Response.json(buildOpsScorecard(), { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('GET /api/ops/scorecard error:', err);
    return Response.json(
      { error: 'Ops scorecard unavailable' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
