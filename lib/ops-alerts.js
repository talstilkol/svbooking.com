import { buildHealthSnapshot } from './health-readiness';
import { buildOpsScorecard } from './ops-scorecard';
import { getProviderUptimeMetrics } from './provider-observability';
import { getPriceAccuracyMetrics } from './price-accuracy';

const ALERT_THRESHOLDS = Object.freeze({
  providerMinEvents: 5,
  providerWarningSuccessRatePct: 95,
  providerCriticalSuccessRatePct: 90,
  providerWarningP95LatencyMs: 3000,
  providerCriticalP95LatencyMs: 8000,
  priceAccuracyMinObservations: 10,
  priceAccuracyWarningMismatchRate: 0.05,
  priceAccuracyCriticalMismatchRate: 0.1,
});

function severityRank(severity) {
  return { critical: 0, warning: 1, info: 2 }[severity] ?? 3;
}

function cleanAlertIdPart(value) {
  return String(value || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'unknown';
}

function cleanDisplayName(value, fallback = 'Provider') {
  const text = String(value || fallback).trim().replace(/\s+/g, ' ').slice(0, 80);
  return text || fallback;
}

function alert({ id, severity, domain, message, evidence, action }) {
  return { id, severity, domain, message, evidence, action };
}

function productionAlerts(health, scorecard) {
  const alerts = [];

  for (const blocker of scorecard.blockers || []) {
    alerts.push(alert({
      id: `scorecard-${blocker.domain}`,
      severity: blocker.domain === 'production-readiness' ? 'critical' : 'warning',
      domain: blocker.domain,
      message: blocker.blocker,
      evidence: { scorecardStatus: scorecard.status },
      action: 'Resolve the scorecard blocker before production scale.',
    }));
  }

  if (!health.checks.alerts.deliveryConfigured) {
    alerts.push(alert({
      id: 'price-alert-delivery-not-configured',
      severity: 'warning',
      domain: 'mobile-retention',
      message: 'Price alert delivery is not configured.',
      evidence: { deliveryStatus: health.checks.alerts.deliveryStatus },
      action: 'Configure PRICE_ALERT_WEBHOOK_URL and PRICE_ALERT_WEBHOOK_SECRET after selecting an approved notification provider.',
    }));
  }

  if (!health.checks.cache.durable) {
    alerts.push(alert({
      id: 'cache-not-durable',
      severity: 'critical',
      domain: 'production-readiness',
      message: 'Persistent KV cache is not configured.',
      evidence: { cacheMode: health.checks.cache.mode },
      action: 'Configure Upstash Redis or compatible KV before production scale.',
    }));
  }

  return alerts;
}

function providerAlerts(uptime) {
  const alerts = [];

  if (uptime.eventCount < ALERT_THRESHOLDS.providerMinEvents) {
    alerts.push(alert({
      id: 'provider-uptime-insufficient-data',
      severity: 'info',
      domain: 'observability',
      message: 'Provider uptime history has insufficient events for threshold alerts.',
      evidence: {
        eventCount: uptime.eventCount,
        requiredEvents: ALERT_THRESHOLDS.providerMinEvents,
      },
      action: 'Run health probes and production pricing traffic to build an evidence base.',
    }));
    return alerts;
  }

  for (const provider of uptime.providers || []) {
    const providerId = cleanAlertIdPart(provider.providerId);
    const providerName = cleanDisplayName(provider.providerName, providerId);
    const eventCount = Number.isFinite(Number(provider.total)) ? Number(provider.total) : 0;

    if (eventCount < ALERT_THRESHOLDS.providerMinEvents) {
      alerts.push(alert({
        id: `provider-${providerId}-insufficient-data`,
        severity: 'info',
        domain: 'observability',
        message: `${providerName} has insufficient events for provider-specific threshold alerts.`,
        evidence: {
          providerId,
          eventCount,
          requiredEvents: ALERT_THRESHOLDS.providerMinEvents,
        },
        action: 'Run health probes and production pricing traffic for this provider before treating it as degraded.',
      }));
      continue;
    }

    if (provider.successRatePct !== null && provider.successRatePct < ALERT_THRESHOLDS.providerCriticalSuccessRatePct) {
      alerts.push(alert({
        id: `provider-${providerId}-critical-success-rate`,
        severity: 'critical',
        domain: 'provider-uptime',
        message: `${providerName} success rate is below critical threshold.`,
        evidence: {
          providerId,
          successRatePct: provider.successRatePct,
          thresholdPct: ALERT_THRESHOLDS.providerCriticalSuccessRatePct,
          eventCount,
        },
        action: 'Check provider credentials, quota, circuit breaker state, and fallback coverage.',
      }));
    } else if (provider.successRatePct !== null && provider.successRatePct < ALERT_THRESHOLDS.providerWarningSuccessRatePct) {
      alerts.push(alert({
        id: `provider-${providerId}-warning-success-rate`,
        severity: 'warning',
        domain: 'provider-uptime',
        message: `${providerName} success rate is below target.`,
        evidence: {
          providerId,
          successRatePct: provider.successRatePct,
          thresholdPct: ALERT_THRESHOLDS.providerWarningSuccessRatePct,
          eventCount,
        },
        action: 'Inspect recent provider errors and verify fallback providers are configured.',
      }));
    }

    if (provider.p95LatencyMs !== null && provider.p95LatencyMs > ALERT_THRESHOLDS.providerCriticalP95LatencyMs) {
      alerts.push(alert({
        id: `provider-${providerId}-critical-latency`,
        severity: 'critical',
        domain: 'provider-latency',
        message: `${providerName} p95 latency is above critical threshold.`,
        evidence: {
          providerId,
          p95LatencyMs: provider.p95LatencyMs,
          thresholdMs: ALERT_THRESHOLDS.providerCriticalP95LatencyMs,
        },
        action: 'Reduce live timeout, verify provider availability, and rely on stale-while-revalidate cache while degraded.',
      }));
    } else if (provider.p95LatencyMs !== null && provider.p95LatencyMs > ALERT_THRESHOLDS.providerWarningP95LatencyMs) {
      alerts.push(alert({
        id: `provider-${providerId}-warning-latency`,
        severity: 'warning',
        domain: 'provider-latency',
        message: `${providerName} p95 latency is above target.`,
        evidence: {
          providerId,
          p95LatencyMs: provider.p95LatencyMs,
          thresholdMs: ALERT_THRESHOLDS.providerWarningP95LatencyMs,
        },
        action: 'Increase cache prewarm coverage and verify provider region/plan limits.',
      }));
    }
  }

  return alerts;
}

function priceAccuracyAlerts(metrics) {
  if (metrics.observations < ALERT_THRESHOLDS.priceAccuracyMinObservations) {
    return [alert({
      id: 'price-accuracy-insufficient-data',
      severity: 'info',
      domain: 'price-accuracy',
      message: 'Price accuracy history has insufficient observations for drift alerts.',
      evidence: {
        observations: metrics.observations,
        requiredObservations: ALERT_THRESHOLDS.priceAccuracyMinObservations,
      },
      action: 'Accumulate observed clicks and verified mismatch reports before treating drift as healthy or degraded.',
    })];
  }

  if (metrics.mismatchRate !== null && metrics.mismatchRate >= ALERT_THRESHOLDS.priceAccuracyCriticalMismatchRate) {
    return [alert({
      id: 'price-accuracy-critical-drift',
      severity: 'critical',
      domain: 'price-accuracy',
      message: 'Price mismatch rate is above critical threshold.',
      evidence: {
        mismatchRate: metrics.mismatchRate,
        threshold: ALERT_THRESHOLDS.priceAccuracyCriticalMismatchRate,
        observations: metrics.observations,
        mismatches: metrics.mismatches,
      },
      action: 'Reduce ranking weight for affected providers and investigate quoted-vs-provider totals.',
    })];
  }

  if (metrics.mismatchRate !== null && metrics.mismatchRate >= ALERT_THRESHOLDS.priceAccuracyWarningMismatchRate) {
    return [alert({
      id: 'price-accuracy-warning-drift',
      severity: 'warning',
      domain: 'price-accuracy',
      message: 'Price mismatch rate is above target.',
      evidence: {
        mismatchRate: metrics.mismatchRate,
        threshold: ALERT_THRESHOLDS.priceAccuracyWarningMismatchRate,
        observations: metrics.observations,
        mismatches: metrics.mismatches,
      },
      action: 'Review mismatch reports and provider tax/fee metadata for affected providers.',
    })];
  }

  return [];
}

export async function buildOpsAlerts({ env = process.env, now = new Date() } = {}) {
  const [uptime, priceAccuracy] = await Promise.all([
    getProviderUptimeMetrics({ limit: 500 }),
    getPriceAccuracyMetrics({ days: 7 }),
  ]);
  const health = buildHealthSnapshot({ env, now });
  const scorecard = buildOpsScorecard({ env, now });

  const alerts = [
    ...productionAlerts(health, scorecard),
    ...providerAlerts(uptime),
    ...priceAccuracyAlerts(priceAccuracy),
  ].sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.id.localeCompare(b.id));

  const summary = {
    total: alerts.length,
    critical: alerts.filter((item) => item.severity === 'critical').length,
    warning: alerts.filter((item) => item.severity === 'warning').length,
    info: alerts.filter((item) => item.severity === 'info').length,
  };

  return {
    service: 'sv-booking',
    checkedAt: now.toISOString(),
    status: summary.critical > 0 ? 'critical' : summary.warning > 0 ? 'warning' : 'healthy',
    thresholds: ALERT_THRESHOLDS,
    summary,
    alerts,
    evidence: {
      healthStatus: health.status,
      scorecardStatus: scorecard.status,
      providerUptime: {
        status: uptime.status,
        eventCount: uptime.eventCount,
        providerCount: uptime.providerCount,
        successRatePct: uptime.successRatePct,
      },
      priceAccuracy: {
        days: priceAccuracy.days,
        observations: priceAccuracy.observations,
        mismatches: priceAccuracy.mismatches,
        mismatchRate: priceAccuracy.mismatchRate,
      },
    },
  };
}
