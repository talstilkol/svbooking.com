import { kv } from '@/lib/kv';
import { RETENTION_SECONDS } from '@/lib/data-retention';

export const PROVIDER_UPTIME_EVENTS_KEY = 'providers:uptime-events';
const MAX_EVENTS = 1000;

function cleanProviderId(value) {
  return String(value || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .slice(0, 48) || 'unknown';
}

function cleanText(value, fallback = 'unknown') {
  const cleaned = String(value || fallback).trim().slice(0, 80);
  return cleaned || fallback;
}

function cleanLatency(value) {
  const latency = Number(value);
  if (!Number.isFinite(latency) || latency < 0) return null;
  return Math.round(latency);
}

function percentile(sortedValues, pct) {
  if (sortedValues.length === 0) return null;
  const index = Math.min(sortedValues.length - 1, Math.ceil((pct / 100) * sortedValues.length) - 1);
  return sortedValues[index];
}

function summarize(events, providerId) {
  const providerEvents = events.filter((event) => event.providerId === providerId);
  const successes = providerEvents.filter((event) => event.ok).length;
  const failures = providerEvents.length - successes;
  const latencies = providerEvents
    .map((event) => event.latencyMs)
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  const latest = providerEvents[0] || null;
  const avgLatencyMs = latencies.length > 0
    ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
    : null;

  return {
    providerId,
    providerName: latest?.providerName || providerId,
    total: providerEvents.length,
    successes,
    failures,
    successRatePct: providerEvents.length > 0 ? Math.round((successes / providerEvents.length) * 1000) / 10 : null,
    avgLatencyMs,
    p95LatencyMs: percentile(latencies, 95),
    lastCheckedAt: latest?.checkedAt || null,
    lastStatus: latest ? (latest.ok ? 'ok' : 'failed') : 'unavailable',
    lastOperation: latest?.operation || null,
  };
}

export async function recordProviderUptimeEvent({
  providerId,
  providerName,
  operation,
  ok,
  latencyMs,
  source = 'unknown',
  checkedAt = new Date().toISOString(),
}) {
  const event = {
    providerId: cleanProviderId(providerId),
    providerName: cleanText(providerName, providerId || 'unknown'),
    operation: cleanText(operation),
    ok: Boolean(ok),
    latencyMs: cleanLatency(latencyMs),
    source: cleanText(source),
    checkedAt,
  };
  const existing = (await kv.get(PROVIDER_UPTIME_EVENTS_KEY)) || [];
  await kv.setWithTTL(
    PROVIDER_UPTIME_EVENTS_KEY,
    [event, ...existing].slice(0, MAX_EVENTS),
    RETENTION_SECONDS.providerUptimeEvents
  );
  return event;
}

export async function getProviderUptimeMetrics({ limit = 500 } = {}) {
  const eventLimit = Math.max(1, Math.min(Number(limit) || 500, MAX_EVENTS));
  const events = ((await kv.get(PROVIDER_UPTIME_EVENTS_KEY)) || []).slice(0, eventLimit);
  const providerIds = [...new Set(events.map((event) => event.providerId).filter(Boolean))].sort();
  const providers = providerIds.map((providerId) => summarize(events, providerId));
  const successes = events.filter((event) => event.ok).length;

  return {
    status: events.length > 0 ? 'available' : 'unavailable',
    eventCount: events.length,
    providerCount: providers.length,
    successRatePct: events.length > 0 ? Math.round((successes / events.length) * 1000) / 10 : null,
    retentionSeconds: RETENTION_SECONDS.providerUptimeEvents,
    rawErrorStorage: 'not-allowed',
    providers,
    recentEvents: events.slice(0, Math.min(20, eventLimit)),
  };
}
