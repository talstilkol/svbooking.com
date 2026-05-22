import { RETENTION_SECONDS } from './data-retention';
import { kv } from './kv';

export const OPS_ALERT_EVENTS_KEY = 'ops:alert-deliveries';

function sanitizeEvent(event) {
  return {
    id: event?.id || null,
    at: event?.at || null,
    reportStatus: event?.reportStatus || 'unknown',
    alertCount: Number.isFinite(Number(event?.alertCount)) ? Number(event.alertCount) : 0,
    actionableAlertCount: Number.isFinite(Number(event?.actionableAlertCount))
      ? Number(event.actionableAlertCount)
      : 0,
    critical: Number.isFinite(Number(event?.critical)) ? Number(event.critical) : 0,
    warning: Number.isFinite(Number(event?.warning)) ? Number(event.warning) : 0,
    deliveryConfigured: Boolean(event?.deliveryConfigured),
    deliveryStatus: event?.deliveryStatus || 'unknown',
    deliveryHttpStatus: Number.isFinite(Number(event?.deliveryHttpStatus))
      ? Number(event.deliveryHttpStatus)
      : null,
  };
}

export async function appendOpsAlertDeliveryEvent(event) {
  const existing = (await kv.get(OPS_ALERT_EVENTS_KEY)) || [];
  const sanitized = sanitizeEvent(event);
  await kv.setWithTTL(
    OPS_ALERT_EVENTS_KEY,
    [sanitized, ...existing.map(sanitizeEvent)].slice(0, 200),
    RETENTION_SECONDS.opsAlertEvents
  );
  return sanitized;
}

export async function getOpsAlertDeliveryEvents({ limit = 50 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
  const events = (await kv.get(OPS_ALERT_EVENTS_KEY)) || [];
  return events.slice(0, safeLimit).map(sanitizeEvent);
}
