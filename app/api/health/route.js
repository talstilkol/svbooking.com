import { buildHealthSnapshot } from '@/lib/health-readiness';

export const dynamic = 'force-dynamic';

export async function GET() {
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
