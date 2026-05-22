import { kv } from '@/lib/kv';
import {
  isPriceAlertUnsubscribeConfigured,
  matchesPriceAlertStoredUnsubscribeToken,
  matchesPriceAlertUnsubscribeToken,
  validPriceAlertUnsubscribeToken,
} from '@/lib/price-alert-unsubscribe';
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { PRICE_ALERT_USER_INDEX_KEY, priceAlertUserFingerprint, userDataKey } from '@/lib/user-data';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const unsubscribeLimiter = rateLimit({ namespace: 'price-alert-unsubscribe', limit: 10, window: 60, failOpen: false });

async function tokenFromRequest(request) {
  if (request.method === 'GET') {
    return new URL(request.url).searchParams.get('token');
  }
  const body = await request.json().catch(() => ({}));
  return body.token;
}

async function unsubscribeByToken(token) {
  const validToken = validPriceAlertUnsubscribeToken(token);
  if (!validToken) return { status: 400, body: { unsubscribed: false, error: 'Invalid unsubscribe token' } };
  if (!isPriceAlertUnsubscribeConfigured()) {
    return { status: 503, body: { unsubscribed: false, error: 'Price alert unsubscribe is not configured' } };
  }

  const indexedUsers = (await kv.get(PRICE_ALERT_USER_INDEX_KEY)) || [];
  const cancelledAt = new Date().toISOString();

  for (const uid of indexedUsers.slice(0, 1000)) {
    const alerts = (await kv.get(userDataKey(uid, 'priceAlerts'))) || [];
    let changed = false;
    let cancelledAlertId = null;
    const next = alerts.map((alert) => {
      const matchesStoredToken = matchesPriceAlertStoredUnsubscribeToken(alert.unsubscribeToken, validToken);
      const matchesDerivedToken = matchesPriceAlertUnsubscribeToken({ token: validToken, uid, alertId: alert.id });
      if (!matchesStoredToken && !matchesDerivedToken) return alert;
      changed = true;
      cancelledAlertId = alert.id;
      return {
        ...alert,
        status: 'cancelled',
        cancelledAt,
      };
    });

    if (changed) {
      await kv.set(userDataKey(uid, 'priceAlerts'), next);
      return {
        status: 200,
        body: {
          unsubscribed: true,
          alertId: cancelledAlertId,
          userFingerprint: priceAlertUserFingerprint(uid),
          status: 'cancelled',
        },
      };
    }
  }

  return { status: 404, body: { unsubscribed: false, error: 'Price alert subscription not found' } };
}

async function enforceUnsubscribeRateLimit(request) {
  const { success, reset } = await unsubscribeLimiter.check(getClientIp(request));
  return success ? null : rateLimitResponse(reset);
}

export async function GET(request) {
  const limited = await enforceUnsubscribeRateLimit(request);
  if (limited) return limited;

  const token = await tokenFromRequest(request);
  const result = await unsubscribeByToken(token);
  return Response.json(result.body, { status: result.status, headers: NO_STORE_HEADERS });
}

export async function POST(request) {
  const limited = await enforceUnsubscribeRateLimit(request);
  if (limited) return limited;

  const token = await tokenFromRequest(request);
  const result = await unsubscribeByToken(token);
  return Response.json(result.body, { status: result.status, headers: NO_STORE_HEADERS });
}
