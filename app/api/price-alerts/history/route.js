import { requireUser } from '@/lib/auth';
import { kv } from '@/lib/kv';
import { errorResponse } from '@/lib/validation';
import { PRICE_ALERT_EVENTS_KEY, priceAlertUserFingerprint } from '@/lib/user-data';
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const priceAlertHistoryLimiter = rateLimit({ namespace: 'price-alert-history', limit: 20, window: 60, failOpen: false });

function sanitizeEvent(event) {
  return {
    id: event.id,
    alertId: event.alertId,
    hotelKey: event.hotelKey,
    observedPrice: event.observedPrice,
    targetPrice: event.targetPrice,
    currency: event.currency,
    provider: event.provider,
    at: event.at,
    deliveryConfigured: Boolean(event.deliveryConfigured),
    deliveryStatus: event.deliveryStatus || 'unknown',
    unsubscribePath: event.unsubscribePath || null,
  };
}

async function enforcePriceAlertHistoryRateLimit(request) {
  const { success, reset } = await priceAlertHistoryLimiter.check(getClientIp(request));
  return success ? null : rateLimitResponse(reset);
}

export async function GET(request) {
  try {
    const limited = await enforcePriceAlertHistoryRateLimit(request);
    if (limited) return limited;

    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(Number(searchParams.get('limit')) || 50, 200));
    const userFingerprint = priceAlertUserFingerprint(user.id);
    const events = ((await kv.get(PRICE_ALERT_EVENTS_KEY)) || [])
      .filter((event) => event?.userFingerprint === userFingerprint)
      .slice(0, limit)
      .map(sanitizeEvent);

    return Response.json(
      {
        count: events.length,
        userFingerprint,
        events,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
