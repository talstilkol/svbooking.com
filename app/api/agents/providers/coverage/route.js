import { verifyAdminAuth } from '@/lib/admin-auth';
import { getProviderCoverageMatrix } from '@/lib/provider-coverage';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(request) {
  try {
    const auth = verifyAdminAuth(request);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const coverage = await getProviderCoverageMatrix({ days: searchParams.get('days') || 7 });
    return Response.json({ coverage }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('GET /api/agents/providers/coverage error:', err);
    return Response.json(
      { error: 'Provider coverage unavailable' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
