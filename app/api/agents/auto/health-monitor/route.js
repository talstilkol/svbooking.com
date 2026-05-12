// Health Monitor Agent — Checks all data source health and auto-resets circuit breakers.
// Tests: Xotelo rates/heatmap, Overpass, Wikipedia, Open-Meteo, Exchange Rates.
// If a provider's circuit breaker is open but the probe succeeds, it auto-resets.

import { runAgent, verifyCronAuth, AGENT_NAMES } from '@/lib/agent-utils';
import { getRates, getHeatmap } from '@/lib/xotelo';
import { HOTELS } from '@/lib/hotels-catalog';
import { registry } from '@/lib/providers/registry';
import { kv } from '@/lib/kv';

const HEALTH_TTL = 3600; // 1 hour

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function timedProbe(name, fn) {
  const start = Date.now();
  try {
    await fn();
    return { name, ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { name, ok: false, latencyMs: Date.now() - start, error: err.message };
  }
}

async function runHealthMonitor() {
  const testHotel = HOTELS[0];
  const today = new Date().toISOString().split('T')[0];
  const checkIn = addDays(today, 14);
  const checkOut = addDays(today, 16);

  // 1. Probe all data sources in parallel
  const probes = await Promise.allSettled([
    timedProbe('xotelo-rates', () =>
      getRates({ hotelKey: testHotel.hotelKey, checkIn, checkOut, timeoutMs: 10000 })
    ),
    timedProbe('xotelo-heatmap', () =>
      getHeatmap({ hotelKey: testHotel.hotelKey, checkOut, timeoutMs: 10000 })
    ),
    timedProbe('overpass', () =>
      fetch('https://overpass-api.de/api/status').then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      })
    ),
    timedProbe('wikipedia', () =>
      fetch('https://en.wikipedia.org/api/rest_v1/page/summary/Paris').then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      })
    ),
    timedProbe('open-meteo', () =>
      fetch('https://api.open-meteo.com/v1/forecast?latitude=48.85&longitude=2.35&current_weather=true').then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      })
    ),
    timedProbe('exchange-rates', () =>
      fetch('https://open.er-api.com/v6/latest/USD').then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      })
    ),
  ]);

  const results = probes
    .filter((p) => p.status === 'fulfilled')
    .map((p) => p.value);

  // 2. Auto-reset circuit breakers if probe succeeds
  let circuitBreakersReset = 0;
  const providerStatus = registry.getStatus();

  for (const provider of providerStatus) {
    if (provider.consecutiveErrors >= 5) {
      // Check if the relevant probe succeeded
      const probeKey = provider.id === 'xotelo' ? 'xotelo-rates' : null;
      if (probeKey) {
        const probe = results.find((r) => r.name === probeKey);
        if (probe?.ok) {
          registry.resetCircuitBreaker(provider.id);
          circuitBreakersReset++;
        }
      }
    }
  }

  // 3. Build health snapshot
  const allOk = results.every((r) => r.ok);
  const failedSources = results.filter((r) => !r.ok).map((r) => r.name);
  const slowSources = results.filter((r) => r.ok && r.latencyMs > 3000).map((r) => `${r.name} (${r.latencyMs}ms)`);

  const suggestions = [];
  if (failedSources.length > 0) {
    suggestions.push(`Failed sources: ${failedSources.join(', ')}`);
  }
  if (slowSources.length > 0) {
    suggestions.push(`Slow sources: ${slowSources.join(', ')}`);
  }

  const snapshot = {
    status: failedSources.length > 2 ? 'error' : failedSources.length > 0 ? 'degraded' : 'healthy',
    checkedAt: new Date().toISOString(),
    probes: results,
    providerStatus: providerStatus.map((p) => ({
      id: p.id,
      name: p.name,
      available: p.available,
      consecutiveErrors: p.consecutiveErrors,
    })),
    circuitBreakersReset,
    suggestions,
    catalogSize: HOTELS.length,
  };

  // Cache health snapshot
  await kv.setWithTTL('agent:health:latest', snapshot, HEALTH_TTL);

  return {
    status: snapshot.status,
    sourcesChecked: results.length,
    sourcesOk: results.filter((r) => r.ok).length,
    sourcesFailed: failedSources.length,
    circuitBreakersReset,
    suggestions,
  };
}

export async function GET(request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const status = await runAgent(AGENT_NAMES.HEALTH_MONITOR, runHealthMonitor);
    return Response.json(status);
  } catch (err) {
    return Response.json(
      { status: 'error', error: err.message },
      { status: 500 }
    );
  }
}
