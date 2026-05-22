import { verifyAdminAuth } from '@/lib/admin-auth';
import { getAdminAuditEvents } from '@/lib/admin-audit';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(request) {
  try {
    const auth = verifyAdminAuth(request);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || '50');
    const events = await getAdminAuditEvents(limit);

    return Response.json({
      events,
      count: events.length,
    }, {
      headers: NO_STORE_HEADERS,
    });
  } catch (err) {
    console.error('GET /api/agents/audit error:', err);
    return Response.json({ error: 'Audit log unavailable' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
