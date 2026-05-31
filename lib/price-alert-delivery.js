import { validWebhookUrl } from './webhook-url';
import { isEnvConfigured } from './production-readiness.mjs';

const DELIVERY_TIMEOUT_MS = 5000;

function deliveryConfig(env = process.env) {
  return {
    webhookUrl: env.PRICE_ALERT_WEBHOOK_URL || '',
    webhookSecret: env.PRICE_ALERT_WEBHOOK_SECRET || '',
  };
}

export function isPriceAlertDeliveryConfigured(env = process.env) {
  const config = deliveryConfig(env);
  return Boolean(validWebhookUrl(config.webhookUrl, { env }) && isEnvConfigured(env, 'PRICE_ALERT_WEBHOOK_SECRET'));
}

function buildPayload(event) {
  return {
    id: event.id,
    userFingerprint: event.userFingerprint,
    alertId: event.alertId,
    hotelKey: event.hotelKey,
    observedPrice: event.observedPrice,
    targetPrice: event.targetPrice,
    currency: event.currency,
    provider: event.provider,
    at: event.at,
    unsubscribeToken: event.unsubscribeToken || null,
    unsubscribePath: event.unsubscribePath || null,
  };
}

export async function deliverPriceAlertEvent(event, { env = process.env, fetchImpl = fetch } = {}) {
  const config = deliveryConfig(env);
  const webhookUrl = validWebhookUrl(config.webhookUrl, { env });
  if (!webhookUrl || !isEnvConfigured(env, 'PRICE_ALERT_WEBHOOK_SECRET')) {
    return {
      configured: false,
      status: webhookUrl || !config.webhookUrl ? 'not-configured' : 'invalid-config',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
  try {
    const response = await fetchImpl(webhookUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.webhookSecret}`,
      },
      body: JSON.stringify(buildPayload(event)),
    });
    clearTimeout(timer);

    return {
      configured: true,
      status: response.ok ? 'sent' : 'failed',
      httpStatus: response.status,
    };
  } catch {
    clearTimeout(timer);
    return { configured: true, status: 'failed' };
  }
}
