import { verifyAdminAuth } from '@/lib/admin-auth';
import { getOpsAlertDeliveryEvents } from '@/lib/ops-alert-events';
import { isOpsAlertDeliveryConfigured } from '@/lib/ops-alert-delivery';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(request) {
  try {
    const auth = verifyAdminAuth(request);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const events = await getOpsAlertDeliveryEvents({ limit: searchParams.get('limit') });
    const deliveryConfigured = isOpsAlertDeliveryConfigured();

    return Response.json(
      {
        count: events.length,
        deliveryConfigured,
        deliveryStatus: deliveryConfigured ? 'configured' : 'not-configured',
        retentionDays: 30,
        events,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.error('GET /api/ops/alerts/events error:', err);
    return Response.json(
      { error: 'Ops alert delivery events unavailable', events: [] },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
