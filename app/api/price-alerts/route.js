import { requireUser } from '@/lib/auth';
import { kv } from '@/lib/kv';
import { findHotel } from '@/lib/hotels-catalog';
import { errorResponse, parseDate, parseNonNegativeNumber, ValidationError } from '@/lib/validation';
import { hashId } from '@/lib/utils/hashId';
import { createPriceAlertUnsubscribeToken, isPriceAlertUnsubscribeConfigured } from '@/lib/price-alert-unsubscribe';
import { PRICE_ALERT_USER_INDEX_KEY, userDataKey } from '@/lib/user-data';
import { assertSameOrigin } from '@/lib/request-origin';
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const priceAlertMutationLimiter = rateLimit({ namespace: 'price-alert-mutations', limit: 20, window: 60, failOpen: false });

async function indexAlertUser(uid) {
  const existing = (await kv.get(PRICE_ALERT_USER_INDEX_KEY)) || [];
  if (!existing.includes(uid)) {
    await kv.set(PRICE_ALERT_USER_INDEX_KEY, [uid, ...existing]);
  }
}

function validAlertId(id) {
  return typeof id === 'string' && /^h_[0-9a-z]{1,16}$/.test(id) ? id : null;
}

async function enforceMutationRateLimit(request) {
  const { success, reset } = await priceAlertMutationLimiter.check(getClientIp(request));
  return success ? null : rateLimitResponse(reset);
}

export async function GET() {
  try {
    const user = await requireUser();
    const alerts = (await kv.get(userDataKey(user.id, 'priceAlerts'))) || [];
    return Response.json({ alerts }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const limited = await enforceMutationRateLimit(request);
    if (limited) return limited;

    const user = await requireUser();
    const body = await request.json();
    const { id, hotelKey, checkIn, checkOut, targetPrice, currentPrice, currency = 'USD' } = body || {};
    if (!hotelKey || !checkIn || !checkOut) {
      throw new ValidationError('hotelKey, checkIn, checkOut required');
    }

    const hotel = findHotel(hotelKey);
    if (!hotel) throw new ValidationError('Unknown hotelKey', 404);

    const ci = parseDate(checkIn, 'checkIn');
    const co = parseDate(checkOut, 'checkOut');
    if (ci >= co) throw new ValidationError('checkIn must be before checkOut');

    const parsedTarget = parseNonNegativeNumber(targetPrice, 'targetPrice');
    const parsedCurrent = parseNonNegativeNumber(currentPrice, 'currentPrice');
    if (parsedTarget === null && parsedCurrent === null) {
      throw new ValidationError('targetPrice or currentPrice required');
    }

    const existing = (await kv.get(userDataKey(user.id, 'priceAlerts'))) || [];
    const alertId = validAlertId(id) || hashId('price-alert', user.id, hotelKey, checkIn, checkOut, parsedTarget ?? parsedCurrent, currency);
    const unsubscribeToken = createPriceAlertUnsubscribeToken({ uid: user.id, alertId });
    const alert = {
      id: alertId,
      hotelKey,
      hotelName: hotel.name,
      city: hotel.city,
      country: hotel.country,
      checkIn,
      checkOut,
      targetPrice: parsedTarget,
      baselinePrice: parsedCurrent,
      currency,
      status: 'active',
      sourcePolicy: 'verified-provider-prices-only',
      unsubscribeToken,
      unsubscribePath: unsubscribeToken ? `/api/price-alerts/unsubscribe?token=${unsubscribeToken}` : null,
      unsubscribeStatus: isPriceAlertUnsubscribeConfigured() ? 'configured' : 'not-configured',
      createdAt: new Date().toISOString(),
      lastTriggeredAt: null,
    };

    const next = [alert, ...existing.filter((entry) => entry.id !== alert.id)];
    await kv.set(userDataKey(user.id, 'priceAlerts'), next);
    await indexAlertUser(user.id);
    return Response.json({ alert, alerts: next }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(request) {
  try {
    assertSameOrigin(request);
    const limited = await enforceMutationRateLimit(request);
    if (limited) return limited;

    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new ValidationError('id query param required');

    const existing = (await kv.get(userDataKey(user.id, 'priceAlerts'))) || [];
    let cancelled = null;
    const cancelledAt = new Date().toISOString();
    const next = existing.map((alert) => {
      if (alert.id !== id) return alert;
      cancelled = {
        ...alert,
        status: 'cancelled',
        cancelledAt,
      };
      return cancelled;
    });
    if (!cancelled) throw new ValidationError('Unknown alert id', 404);

    await kv.set(userDataKey(user.id, 'priceAlerts'), next);
    return Response.json({ alert: cancelled, alerts: next }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return errorResponse(err);
  }
}
