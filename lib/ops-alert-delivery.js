import { validWebhookUrl } from './webhook-url';
import { isEnvConfigured } from './production-readiness.mjs';

const DELIVERY_TIMEOUT_MS = 5000;

function deliveryConfig(env = process.env) {
  return {
    webhookUrl: env.OPS_ALERT_WEBHOOK_URL || '',
    webhookSecret: env.OPS_ALERT_WEBHOOK_SECRET || '',
  };
}

export function isOpsAlertDeliveryConfigured(env = process.env) {
  const config = deliveryConfig(env);
  return Boolean(validWebhookUrl(config.webhookUrl, { env }) && isEnvConfigured(env, 'OPS_ALERT_WEBHOOK_SECRET'));
}

function sanitizeValue(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 5) return '[redacted-depth]';
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, depth + 1));
  if (typeof value !== 'object') return value;

  const sanitized = {};
  for (const [key, nested] of Object.entries(value)) {
    if (/(secret|token|authorization|password|api[-_]?key)/i.test(key)) {
      sanitized[key] = '[redacted]';
    } else {
      sanitized[key] = sanitizeValue(nested, depth + 1);
    }
  }
  return sanitized;
}

function sanitizeAlert(alert) {
  return {
    id: alert.id,
    severity: alert.severity,
    domain: alert.domain,
    message: alert.message,
    evidence: sanitizeValue(alert.evidence || {}),
    action: alert.action || null,
  };
}

function buildPayload(report) {
  return {
    service: report.service,
    checkedAt: report.checkedAt,
    status: report.status,
    summary: sanitizeValue(report.summary),
    alerts: (report.alerts || []).map(sanitizeAlert),
    evidence: sanitizeValue(report.evidence),
  };
}

export async function deliverOpsAlertReport(report, { env = process.env, fetchImpl = fetch } = {}) {
  const config = deliveryConfig(env);
  const webhookUrl = validWebhookUrl(config.webhookUrl, { env });

  if (!webhookUrl || !isEnvConfigured(env, 'OPS_ALERT_WEBHOOK_SECRET')) {
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
      body: JSON.stringify(buildPayload(report)),
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
