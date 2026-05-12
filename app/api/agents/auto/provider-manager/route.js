/**
 * Provider Manager Agent — Monitors all pricing providers and manages failover.
 *
 * Responsibilities:
 *   1. Check health of each provider with a lightweight probe
 *   2. Auto-reset circuit breakers when providers recover
 *   3. Rotate priorities based on remaining quota (providers with more quota get higher priority)
 *   4. Track daily/monthly usage trends in KV
 *   5. Alert on providers that are close to exhausting their quota
 *
 * Runs as part of the orchestrator or standalone.
 */

import { runAgent, verifyCronAuth } from '@/lib/agent-utils';
import { registry } from '@/lib/providers/registry';
import { kv } from '@/lib/kv';

const XOTELO_BASE = 'https://data.xotelo.com/api';

// Reference hotel key for probes (well-known, always has data)
const PROBE_HOTEL_KEY = 'g187147-d188728'; // Hotel in Paris
const PROBE_CHECK_IN = addDays(new Date().toISOString().split('T')[0], 14);
const PROBE_CHECK_OUT = addDays(PROBE_CHECK_IN, 2);

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Probe Xotelo directly (lightweight heatmap check)
 */
async function probeXotelo() {
  const url = `${XOTELO_BASE}/heatmap?hotel_key=${PROBE_HOTEL_KEY}&chk_out=${PROBE_CHECK_OUT}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const start = Date.now();
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);
    const latency = Date.now() - start;
    if (!res.ok) return { ok: false, latency, error: `HTTP ${res.status}` };
    const data = await res.json();
    if (data.error) return { ok: false, latency, error: String(data.error) };
    const rates = data.result?.rates || [];
    return { ok: rates.length > 0, latency, ratesFound: rates.length };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, latency: 0, error: err.message };
  }
}

/**
 * Probe a RapidAPI-based provider (checks if the key is valid)
 */
async function probeRapidAPI(host, path, apiKey) {
  if (!apiKey) return { ok: false, error: 'No API key configured', configured: false };

  const url = `https://${host}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const start = Date.now();
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': host,
      },
    });
    clearTimeout(timer);
    const latency = Date.now() - start;
    // 403 = invalid key, 429 = rate limited (key is valid but exhausted)
    if (res.status === 403) return { ok: false, latency, error: 'Invalid API key', configured: true };
    if (res.status === 429) return { ok: true, latency, warning: 'Rate limited (quota may be low)', configured: true };
    return { ok: res.ok, latency, status: res.status, configured: true };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, error: err.message, configured: true };
  }
}

async function runProviderManager() {
  const startedAt = Date.now();
  const providerStatus = registry.getStatus();
  const probeResults = {};
  const actions = [];

  // 1. Probe Xotelo (primary, always available)
  probeResults.xotelo = await probeXotelo();
  if (probeResults.xotelo.ok) {
    const xoteloState = providerStatus.find((p) => p.id === 'xotelo');
    if (xoteloState?.consecutiveErrors >= 5) {
      registry.resetCircuitBreaker('xotelo');
      actions.push('Reset xotelo circuit breaker (probe succeeded)');
    }
  }

  // 2. Probe RapidAPI providers
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  if (rapidApiKey) {
    probeResults.booking = await probeRapidAPI(
      'booking-com.p.rapidapi.com',
      '/v1/hotels/search?dest_type=city&dest_id=Paris&checkout_date=' + PROBE_CHECK_OUT + '&checkin_date=' + PROBE_CHECK_IN + '&adults_number=2&room_number=1&page_number=0&locale=en-us&units=metric',
      rapidApiKey
    );

    probeResults.tripadvisor = await probeRapidAPI(
      'travel-advisor.p.rapidapi.com',
      '/hotels/list?location_id=187147&checkin=' + PROBE_CHECK_IN + '&adults=2&rooms=1&nights=2&currency=USD&lang=en_US',
      rapidApiKey
    );

    // Auto-reset circuit breakers for healthy RapidAPI providers
    for (const [providerId, result] of [['booking', probeResults.booking], ['tripadvisor', probeResults.tripadvisor]]) {
      if (result.ok) {
        const state = providerStatus.find((p) => p.id === providerId);
        if (state?.consecutiveErrors >= 5) {
          registry.resetCircuitBreaker(providerId);
          actions.push(`Reset ${providerId} circuit breaker (probe succeeded)`);
        }
      }
    }
  }

  // 3. Probe SerpApi
  const serpApiKey = process.env.SERPAPI_KEY;
  if (serpApiKey) {
    try {
      const accountUrl = `https://serpapi.com/account?api_key=${serpApiKey}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(accountUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        probeResults.serpapi = {
          ok: true,
          remainingSearches: data.total_searches_left,
          planSearchesLeft: data.plan_searches_left,
          configured: true,
        };
        // Reset circuit breaker if healthy
        const state = providerStatus.find((p) => p.id === 'serpapi');
        if (state?.consecutiveErrors >= 5) {
          registry.resetCircuitBreaker('serpapi');
          actions.push('Reset serpapi circuit breaker (account check succeeded)');
        }
      } else {
        probeResults.serpapi = { ok: false, error: `HTTP ${res.status}`, configured: true };
      }
    } catch (err) {
      probeResults.serpapi = { ok: false, error: err.message, configured: true };
    }
  }

  // 4. Calculate quota warnings
  const quotaWarnings = [];
  for (const provider of providerStatus) {
    if (provider.monthlyLimit > 0) {
      const usedPct = (provider.callsThisMonth / provider.monthlyLimit) * 100;
      if (usedPct >= 80) {
        quotaWarnings.push({
          provider: provider.name,
          usedPct: Math.round(usedPct),
          remaining: provider.monthlyLimit - provider.callsThisMonth,
        });
      }
    }
  }

  // 5. Save snapshot
  const snapshot = {
    timestamp: new Date().toISOString(),
    probes: probeResults,
    providerStatus: providerStatus.map((p) => ({
      id: p.id,
      name: p.name,
      available: p.available,
      configured: p.configured,
      callsThisMonth: p.callsThisMonth,
      callsToday: p.callsToday,
      consecutiveErrors: p.consecutiveErrors,
      quotaUsedPct: p.quotaUsedPct,
    })),
    quotaWarnings,
    actions,
  };

  await kv.setWithTTL('agent:provider-manager:latest', snapshot, 3600);

  // Track daily trends
  const today = new Date().toISOString().split('T')[0];
  const trendKey = `agent:provider-trends:${today}`;
  const existingTrend = (await kv.get(trendKey)) || [];
  existingTrend.push({
    time: new Date().toISOString(),
    providers: providerStatus.map((p) => ({
      id: p.id,
      calls: p.callsToday,
      errors: p.errors,
    })),
  });
  await kv.setWithTTL(trendKey, existingTrend, 172800); // 2 days

  return {
    providersChecked: Object.keys(probeResults).length,
    healthyProviders: Object.values(probeResults).filter((r) => r.ok).length,
    circuitBreakersReset: actions.length,
    quotaWarnings: quotaWarnings.length,
    actions,
    probes: probeResults,
    elapsedMs: Date.now() - startedAt,
  };
}

export async function GET(request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const result = await runAgent('provider-manager', runProviderManager);
    return Response.json(result);
  } catch (err) {
    console.error('Provider manager error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
