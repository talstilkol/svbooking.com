import { verifyAdminAuth } from '@/lib/admin-auth';
import { kv } from '@/lib/kv';
import { isPriceAlertDeliveryConfigured } from '@/lib/price-alert-delivery';
import { PRICE_ALERT_EVENTS_KEY } from '@/lib/user-data';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(request) {
  try {
    const auth = verifyAdminAuth(request);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(Number(searchParams.get('limit')) || 50, 200));
    const events = ((await kv.get(PRICE_ALERT_EVENTS_KEY)) || []).slice(0, limit);

    return Response.json(
      {
        count: events.length,
        deliveryConfigured: isPriceAlertDeliveryConfigured(),
        deliveryStatus: isPriceAlertDeliveryConfigured() ? 'configured' : 'not-configured',
        events,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    console.error('GET /api/price-alerts/events error:', err);
    return Response.json(
      { error: 'Price alert events unavailable', events: [] },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
