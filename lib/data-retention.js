const DAY = 86400;

export const RETENTION_SECONDS = Object.freeze({
  adminAuditEvents: 90 * DAY,
  catalogCandidates: 90 * DAY,
  priceAccuracyEvents: 90 * DAY,
  priceAlertEvents: 30 * DAY,
  opsAlertEvents: 30 * DAY,
  providerUptimeEvents: 14 * DAY,
  providerState: 30 * DAY,
  providerManagerLatest: 3600,
  providerTrends: 2 * DAY,
  agentStatus: DAY,
  agentRunningLock: 3600,
  agentRunHistory: 7 * DAY,
  priceRatesCache: 2 * 3600,
  priceHeatmapCache: 2 * 3600,
});

const POLICIES = [
  {
    id: 'admin-audit-events',
    ttlSeconds: RETENTION_SECONDS.adminAuditEvents,
    storage: 'KV',
    classification: 'security-audit',
    containsRawUserId: false,
    deletion: 'ttl',
    notes: 'Admin events store deterministic client fingerprints and redacted details.',
  },
  {
    id: 'catalog-candidates',
    ttlSeconds: RETENTION_SECONDS.catalogCandidates,
    storage: 'KV',
    classification: 'catalog-operations',
    containsRawUserId: false,
    deletion: 'ttl-or-admin-review-state',
    notes: 'Candidates keep source/provenance for review and duplicate investigation.',
  },
  {
    id: 'price-accuracy-events',
    ttlSeconds: RETENTION_SECONDS.priceAccuracyEvents,
    storage: 'KV',
    classification: 'pricing-quality',
    containsRawUserId: false,
    deletion: 'ttl',
    notes: 'Observed click prices and mismatch reports are provider/hotel scoped.',
  },
  {
    id: 'price-alert-events',
    ttlSeconds: RETENTION_SECONDS.priceAlertEvents,
    storage: 'KV',
    classification: 'notification-history',
    containsRawUserId: false,
    deletion: 'ttl',
    notes: 'Trigger events use deterministic user fingerprints and unsubscribe tokens only.',
  },
  {
    id: 'ops-alert-events',
    ttlSeconds: RETENTION_SECONDS.opsAlertEvents,
    storage: 'KV',
    classification: 'ops-alert-delivery',
    containsRawUserId: false,
    deletion: 'ttl',
    notes: 'Ops alert delivery attempts store severity counts and sanitized delivery status only.',
  },
  {
    id: 'provider-uptime-events',
    ttlSeconds: RETENTION_SECONDS.providerUptimeEvents,
    storage: 'KV',
    classification: 'ops-provider-health',
    containsRawUserId: false,
    deletion: 'ttl',
    notes: 'Provider probe and pricing-attempt outcomes with sanitized status and latency metadata.',
  },
  {
    id: 'provider-state',
    ttlSeconds: RETENTION_SECONDS.providerState,
    storage: 'KV',
    classification: 'ops-provider-health',
    containsRawUserId: false,
    deletion: 'ttl',
    notes: 'Provider circuit-breaker state and quota counters.',
  },
  {
    id: 'provider-trends',
    ttlSeconds: RETENTION_SECONDS.providerTrends,
    storage: 'KV',
    classification: 'ops-provider-health',
    containsRawUserId: false,
    deletion: 'ttl',
    notes: 'Short-lived provider trend samples for operational diagnosis.',
  },
  {
    id: 'agent-status',
    ttlSeconds: RETENTION_SECONDS.agentStatus,
    storage: 'KV',
    classification: 'ops-agent-health',
    containsRawUserId: false,
    deletion: 'ttl',
    notes: 'Latest background-agent status.',
  },
  {
    id: 'agent-run-history',
    ttlSeconds: RETENTION_SECONDS.agentRunHistory,
    storage: 'KV',
    classification: 'ops-agent-health',
    containsRawUserId: false,
    deletion: 'ttl',
    notes: 'Last agent runs, capped to 10 entries per agent.',
  },
  {
    id: 'price-cache',
    ttlSeconds: RETENTION_SECONDS.priceRatesCache,
    storage: 'KV',
    classification: 'pricing-cache',
    containsRawUserId: false,
    deletion: 'ttl',
    notes: 'Dated rate cache uses stale-while-revalidate and never stores raw user identifiers.',
  },
  {
    id: 'user-owned-alerts-favorites-trips',
    ttlSeconds: null,
    storage: 'KV/local-device',
    classification: 'user-owned',
    containsRawUserId: true,
    deletion: 'user-action-via-/api/me/data-or-auth-provider-retention',
    notes: 'User-scoped records persist until the user cancels/removes them, clears account data, or account retention is applied.',
  },
];

function ttlDays(ttlSeconds) {
  if (ttlSeconds === null) return null;
  return Number((ttlSeconds / DAY).toFixed(4));
}

export function getDataRetentionPolicies() {
  return POLICIES.map((policy) => ({
    ...policy,
    ttlDays: ttlDays(policy.ttlSeconds),
  }));
}

export function getDataRetentionReadiness() {
  const policies = getDataRetentionPolicies();
  const ttlBacked = policies.filter((policy) => Number.isFinite(policy.ttlSeconds));
  const userOwned = policies.filter((policy) => policy.classification === 'user-owned');

  return {
    status: 'defined',
    policyCount: policies.length,
    ttlBackedPolicyCount: ttlBacked.length,
    userOwnedPolicyCount: userOwned.length,
    shortestTtlSeconds: Math.min(...ttlBacked.map((policy) => policy.ttlSeconds)),
    longestTtlSeconds: Math.max(...ttlBacked.map((policy) => policy.ttlSeconds)),
    rawSecretStorage: 'not-allowed',
    rawUserIdInOperationalEvents: false,
  };
}
