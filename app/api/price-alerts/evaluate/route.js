import { verifyCronAuth } from '@/lib/agent-utils';
import { kv } from '@/lib/kv';
import { getCachedRates } from '@/lib/price-cache';
import { deliverPriceAlertEvent } from '@/lib/price-alert-delivery';
import { createPriceAlertUnsubscribeToken } from '@/lib/price-alert-unsubscribe';
import { hashId } from '@/lib/utils/hashId';
import { RETENTION_SECONDS } from '@/lib/data-retention';
import { PRICE_ALERT_EVENTS_KEY, PRICE_ALERT_USER_INDEX_KEY, priceAlertUserFingerprint, userDataKey } from '@/lib/user-data';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

function totalForRate(rate) {
  const total = Number(rate?.total);
  if (Number.isFinite(total) && total > 0) return total;
  return Number(rate?.rate || 0) + Number(rate?.tax || 0);
}

function normalizedText(value) {
  return String(value || '').trim().toLowerCase();
}

function isVerifiedAlertRate(rate, result) {
  const freshness = normalizedText(rate?.freshness || result?.freshness);
  const provider = normalizedText(rate?.provider || rate?.name || result?.provider);
  const source = normalizedText(rate?.source || result?.source || result?.provider);
  const priceSource = normalizedText(rate?.priceSource || result?.priceSource);
  const blockedSource = new Set(['', 'none', 'unknown', 'unavailable', 'estimated', 'heatmap']);

  if (rate?.partial || result?.partial) return false;
  if (freshness === 'stale' || freshness === 'unknown') return false;
  if (priceSource === 'heatmap') return false;
  if (blockedSource.has(provider) || blockedSource.has(source)) return false;

  return true;
}

function unavailableReason(result) {
  const freshness = normalizedText(result?.freshness);
  if (result?.partial || freshness === 'stale') return 'stale-or-partial-price';
  if (normalizedText(result?.priceSource) === 'heatmap') return 'heatmap-is-not-booking-provider';
  return 'no-verified-provider-price';
}

function findLowestVerifiedRate(result) {
  const rates = Array.isArray(result?.rates) ? result.rates : [];
  return rates
    .map((rate) => ({
      provider: rate.name || result.provider || result.source || 'unknown',
      source: rate.source || result.source || result.provider || 'unknown',
      total: totalForRate(rate),
      verified: isVerifiedAlertRate(rate, result),
    }))
    .filter((rate) => rate.total > 0 && rate.verified)
    .sort((a, b) => a.total - b.total)[0] || null;
}

async function appendEvent(event) {
  const existing = (await kv.get(PRICE_ALERT_EVENTS_KEY)) || [];
  await kv.setWithTTL(PRICE_ALERT_EVENTS_KEY, [event, ...existing].slice(0, 500), RETENTION_SECONDS.priceAlertEvents);
}

async function evaluateAlert(uid, alert) {
  if (!alert || alert.status !== 'active') return { skipped: true, reason: 'inactive' };
  if (!alert.hotelKey || !alert.checkIn || !alert.checkOut) return { skipped: true, reason: 'missing-fields' };

  const result = await getCachedRates({
    hotelKey: alert.hotelKey,
    hotelName: alert.hotelName,
    city: alert.city,
    checkIn: alert.checkIn,
    checkOut: alert.checkOut,
    currency: alert.currency || 'USD',
    timeoutMs: 8000,
  });
  const lowest = findLowestVerifiedRate(result);
  const checkedAt = new Date().toISOString();

  const updated = {
    ...alert,
    lastCheckedAt: checkedAt,
    lastObservedPrice: lowest?.total || null,
    lastObservedProvider: lowest?.provider || null,
    lastObservedFreshness: result?.freshness || 'unknown',
    lastEvaluationStatus: lowest ? 'verified-price' : 'unavailable',
    lastEvaluationSkippedReason: lowest ? null : unavailableReason(result),
  };

  const targetPrice = Number(alert.targetPrice);
  const triggered = Boolean(lowest && Number.isFinite(targetPrice) && lowest.total <= targetPrice);
  if (triggered) {
    updated.lastTriggeredAt = checkedAt;
    updated.lastTriggerEventId = hashId('price-alert-trigger', uid, alert.id, checkedAt, lowest.total, lowest.provider);
    const unsubscribeToken = alert.unsubscribeToken || createPriceAlertUnsubscribeToken({ uid, alertId: alert.id });
    const event = {
      id: updated.lastTriggerEventId,
      userFingerprint: priceAlertUserFingerprint(uid),
      alertId: alert.id,
      hotelKey: alert.hotelKey,
      observedPrice: lowest.total,
      targetPrice,
      currency: alert.currency || 'USD',
      provider: lowest.provider,
      at: checkedAt,
      unsubscribeToken,
      unsubscribePath: unsubscribeToken ? `/api/price-alerts/unsubscribe?token=${unsubscribeToken}` : null,
    };
    const delivery = await deliverPriceAlertEvent(event);
    await appendEvent({
      ...event,
      deliveryConfigured: delivery.configured,
      deliveryStatus: delivery.status,
      deliveryHttpStatus: delivery.httpStatus || null,
    });
  }

  return { updated, triggered, provider: lowest?.provider || null, observedPrice: lowest?.total || null };
}

export async function GET(request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const indexedUsers = (await kv.get(PRICE_ALERT_USER_INDEX_KEY)) || [];
    let evaluated = 0;
    let triggered = 0;
    let skipped = 0;
    let errors = 0;

    for (const uid of indexedUsers.slice(0, 1000)) {
      try {
        const alerts = (await kv.get(userDataKey(uid, 'priceAlerts'))) || [];
        const next = [];
        for (const alert of alerts) {
          try {
            const result = await evaluateAlert(uid, alert);
            if (result.skipped) {
              skipped++;
              next.push(alert);
              continue;
            }
            evaluated++;
            if (result.triggered) triggered++;
            next.push(result.updated);
          } catch {
            errors++;
            next.push(alert);
          }
        }
        await kv.set(userDataKey(uid, 'priceAlerts'), next);
      } catch {
        errors++;
      }
    }

    return Response.json({
      status: 'completed',
      usersChecked: indexedUsers.length,
      evaluated,
      triggered,
      skipped,
      errors,
      delivery: process.env.PRICE_ALERT_WEBHOOK_URL && process.env.PRICE_ALERT_WEBHOOK_SECRET
        ? 'configured'
        : 'not-configured',
    }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('GET /api/price-alerts/evaluate error:', err);
    return Response.json(
      { status: 'error', error: 'Price alert evaluation unavailable' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
