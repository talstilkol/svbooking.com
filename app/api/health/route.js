import { buildHealthSnapshot } from '@/lib/health-readiness';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const rl = await rateLimit({ namespace: 'health', limit: 30, window: 60, request, failOpen: true });
  if (rl?.limited) {
    return Response.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  }
  try {
    const snapshot = buildHealthSnapshot();
    return Response.json(snapshot, {
      status: snapshot.ready ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('GET /api/health error:', err);
    return Response.json(
      {
        service: 'sv-booking',
        status: 'error',
        ready: false,
        checkedAt: new Date().toISOString(),
        checks: {},
        warnings: ['Health snapshot unavailable'],
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }
}
