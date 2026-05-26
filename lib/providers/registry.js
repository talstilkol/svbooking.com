/**
 * Provider Registry — manages multiple hotel pricing providers with
 * automatic fallback, quota tracking, and health monitoring.
 *
 * Each provider implements: { name, id, fetchRates(), isAvailable(), getStatus() }
 * The registry tries providers in priority order, skipping exhausted/unhealthy ones.
 *
 * State persistence: in-memory primary (fast), KV secondary (survives restarts).
 */

import { kv } from '@/lib/kv';
import { RETENTION_SECONDS } from '@/lib/data-retention';
import { recordProviderUptimeEvent } from '@/lib/provider-observability';

// In-memory quota + health tracking (primary — fast path)
const providerState = new Map();
// Track which providers have been restored from KV
const restoredFromKV = new Set();

const STATE_TTL = RETENTION_SECONDS.providerState;

/** Max latency samples to keep for p50 calculation */
const LATENCY_WINDOW = 20;

function defaultState() {
  return {
    callsThisMonth: 0,
    callsToday: 0,
    errors: 0,
    consecutiveErrors: 0,
    lastSuccess: null,
    lastError: null,
    lastReset: new Date().toISOString(),
    dayReset: new Date().toISOString().split('T')[0],
    recentLatencies: [],   // rolling window of last N latency samples (ms)
  };
}

/** Calculate p50 (median) from a latency array */
function medianLatency(latencies) {
  if (!latencies || latencies.length === 0) return null;
  const sorted = [...latencies].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function getState(providerId) {
  if (!providerState.has(providerId)) {
    providerState.set(providerId, defaultState());
    // Trigger async KV restore (non-blocking)
    if (!restoredFromKV.has(providerId)) {
      restoreFromKV(providerId);
    }
  }
  const state = providerState.get(providerId);

  // Reset daily counter if day changed
  const today = new Date().toISOString().split('T')[0];
  if (state.dayReset !== today) {
    state.callsToday = 0;
    state.dayReset = today;
  }

  return state;
}

/** Restore provider state from KV on first access (non-blocking) */
async function restoreFromKV(providerId) {
  restoredFromKV.add(providerId);
  try {
    const saved = await kv.get(`provider:state:${providerId}`);
    if (saved && !providerState.get(providerId)?.lastSuccess) {
      // Only restore if in-memory state is still at defaults (no calls made yet)
      const current = providerState.get(providerId);
      if (current.callsThisMonth === 0 && current.errors === 0) {
        providerState.set(providerId, { ...defaultState(), ...saved });
      }
    }
  } catch {
    // KV unavailable — continue with in-memory
  }
}

/** Persist state to KV (fire-and-forget) */
function persistToKV(providerId, state) {
  kv.setWithTTL(`provider:state:${providerId}`, state, STATE_TTL).catch(() => {});
}

function recordLatency(state, latencyMs) {
  if (!Array.isArray(state.recentLatencies)) state.recentLatencies = [];
  state.recentLatencies.push(latencyMs);
  if (state.recentLatencies.length > LATENCY_WINDOW) {
    state.recentLatencies = state.recentLatencies.slice(-LATENCY_WINDOW);
  }
}

function recordSuccess(providerId, latencyMs) {
  const state = getState(providerId);
  state.callsThisMonth++;
  state.callsToday++;
  state.consecutiveErrors = 0;
  state.lastSuccess = new Date().toISOString();
  if (latencyMs !== undefined) recordLatency(state, latencyMs);
  persistToKV(providerId, state);
}

function recordError(providerId, error, latencyMs) {
  const state = getState(providerId);
  state.callsThisMonth++;
  state.callsToday++;
  state.errors++;
  state.consecutiveErrors++;
  state.lastError = { message: sanitizeProviderError(error), at: new Date().toISOString() };
  if (latencyMs !== undefined) recordLatency(state, latencyMs);
  persistToKV(providerId, state);
}

function recordProviderOutcome({ provider, operation, ok, latencyMs, source = 'provider-registry' }) {
  recordProviderUptimeEvent({
    providerId: provider.id,
    providerName: provider.name,
    operation,
    ok,
    latencyMs,
    source,
  }).catch(() => {});
}

function sanitizeProviderError(error) {
  if (error?.name === 'AbortError') return 'Provider request timed out';
  return 'Provider request failed';
}

function noRatesError() {
  const error = new Error('No rates returned');
  error.code = 'NO_RATES';
  return error;
}

/** Grace period (ms) to wait for additional providers after the first success */
const MERGE_GRACE_MS = 2000;

/**
 * Normalize OTA / booking site name to a canonical code for deduplication.
 * Maps common variations (e.g., "Booking.com", "bookingcom") to a single key.
 */
function normalizeOTACode(name) {
  if (!name) return 'unknown';
  const lower = String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
  const aliases = {
    bookingcom: 'booking', booking: 'booking',
    expedia: 'expedia', expediacom: 'expedia',
    hotelscom: 'hotels', hotels: 'hotels',
    agoda: 'agoda',
    priceline: 'priceline', pricelinecom: 'priceline',
    tripadvisor: 'tripadvisor', trip: 'tripadvisor',
    google: 'google', googlehotels: 'google',
    kayak: 'kayak',
    trivago: 'trivago',
    travelocity: 'travelocity',
    orbitz: 'orbitz',
    hotwire: 'hotwire',
    edreams: 'edreams',
    prestigia: 'prestigia',
    zenhotels: 'zenhotels',
    destinia: 'destinia',
    snaptravel: 'snaptravel',
    amoma: 'amoma',
    getaroom: 'getaroom',
    amadeus: 'amadeus',
  };
  return aliases[lower] || lower;
}

/** Score a rate's data completeness for dedup tie-breaking (higher = more useful) */
function scoreRateCompleteness(rate) {
  let s = 0;
  if (rate.deepLink) s += 2;
  if (rate.roomName) s += 1;
  if (rate.taxesIncluded !== null && rate.taxesIncluded !== undefined) s += 1;
  if (Number(rate.tax) > 0) s += 1;
  return s;
}

/**
 * Merge and deduplicate rates from multiple provider results.
 * When the same OTA appears from different providers, keep the cheapest rate
 * (ties broken by data completeness).
 */
function mergeProviderRates(providerResults) {
  if (providerResults.length === 0) return null;
  if (providerResults.length === 1) return providerResults[0];

  const ratesByOTA = new Map();

  for (const result of providerResults) {
    for (const rate of (result.rates || [])) {
      const otaCode = normalizeOTACode(rate.code || rate.name);
      const total = Number(rate.total || 0) || (Number(rate.rate || 0) + Number(rate.tax || 0));
      const existing = ratesByOTA.get(otaCode);

      if (!existing ||
          total < existing._total ||
          (total === existing._total && scoreRateCompleteness(rate) > scoreRateCompleteness(existing))) {
        ratesByOTA.set(otaCode, { ...rate, code: otaCode, source: result.source, _total: total });
      }
    }
  }

  const mergedRates = Array.from(ratesByOTA.values()).map(({ _total, ...rate }) => rate);
  const primary = providerResults[0];
  const sources = [...new Set(providerResults.map((r) => r.source))];
  const providerNames = [...new Set(providerResults.map((r) => r.provider))];

  return {
    rates: mergedRates,
    currency: primary.currency || 'USD',
    chk_in: primary.chk_in,
    chk_out: primary.chk_out,
    source: sources.join('+'),
    provider: providerNames.join(', '),
    mergedProviders: sources.length,
  };
}

/**
 * Provider registry singleton
 */
class ProviderRegistry {
  constructor() {
    /** @type {Array<{id: string, name: string, priority: number, monthlyLimit: number, dailyLimit: number, fetchRates: Function, isConfigured: Function}>} */
    this.providers = [];
  }

  register(provider) {
    this.providers.push(provider);
    // Sort by priority (lower = higher priority)
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get available providers (configured + not exhausted + not circuit-broken),
   * dynamically sorted by a composite score of priority, latency, and reliability.
   */
  getAvailable() {
    const available = this.providers.filter((p) => {
      if (!p.isConfigured()) return false;
      const state = getState(p.id);

      // Circuit breaker with time-based auto-recovery.
      // After 5 consecutive errors, the provider is tripped open.
      // It auto-recovers after a cooldown that doubles with each re-trip:
      //   5 errors → 5 min, 10 errors → 10 min, 15 errors → 20 min (capped at 30 min)
      if (state.consecutiveErrors >= 5) {
        const lastErrorAt = state.lastError?.at ? Date.parse(state.lastError.at) : 0;
        const tripCount = Math.floor(state.consecutiveErrors / 5);
        const cooldownMs = Math.min(5 * 60 * 1000 * Math.pow(2, tripCount - 1), 30 * 60 * 1000);
        if (Date.now() - lastErrorAt < cooldownMs) return false;
        // Cooldown elapsed — allow one probe request (half-open state)
      }

      // Quota check
      if (p.monthlyLimit > 0 && state.callsThisMonth >= p.monthlyLimit) return false;
      if (p.dailyLimit > 0 && state.callsToday >= p.dailyLimit) return false;

      return true;
    });

    // Dynamic sorting: blend static priority with observed performance.
    // Lower score = better. Providers without latency data keep their static order.
    return available.sort((a, b) => {
      const stateA = getState(a.id);
      const stateB = getState(b.id);
      const p50A = medianLatency(stateA.recentLatencies);
      const p50B = medianLatency(stateB.recentLatencies);

      // If neither has latency data, use static priority
      if (p50A === null && p50B === null) return a.priority - b.priority;

      // Composite score: static priority weight (0-100) + latency penalty (ms/100)
      // + error penalty (consecutive errors × 500ms equivalent)
      const scoreA = a.priority * 100 + (p50A ?? 5000) / 10 + stateA.consecutiveErrors * 50;
      const scoreB = b.priority * 100 + (p50B ?? 5000) / 10 + stateB.consecutiveErrors * 50;

      return scoreA - scoreB;
    });
  }

  /**
   * Fetch rates from all available providers with merge-and-dedup.
   *
   * Strategy: "race for first, grace for breadth"
   *   1. Launch all available providers in parallel
   *   2. Promise.any resolves when the first provider returns rates (fast path)
   *   3. Grace period (MERGE_GRACE_MS) waits for additional providers to finish
   *   4. All successful results are merged and deduplicated by OTA
   *
   * This yields broader price coverage than the old race-top-4 approach:
   * e.g., Xotelo returns Booking/Expedia/Agoda and SerpApi adds Google Hotels.
   *
   * @param {Object} params - { hotelKey, hotelName, city, checkIn, checkOut, currency }
   * @returns {Promise<{rates: Array, currency: string, source: string, provider: string}>}
   */
  async fetchRates(params) {
    const available = this.getAvailable();

    if (available.length === 0) {
      const configured = this.providers.filter((p) => p.isConfigured()).length;
      return noRatesResponse(params, {
        noRatesReason: configured === 0 ? 'no-providers-configured' : 'all-providers-unavailable',
        providersConfigured: configured,
        providersAvailable: 0,
      });
    }

    // Filter providers that can handle this request (skip ones that will definitely fail)
    const capable = available.filter((p) => !p.canHandle || p.canHandle(params));

    if (capable.length === 0) {
      return noRatesResponse(params, {
        noRatesReason: 'no-providers-can-handle',
        providersConfigured: this.providers.filter((p) => p.isConfigured()).length,
        providersAvailable: available.length,
      });
    }

    // Collect successful results via side-effects as each provider resolves
    const successfulResults = [];

    const providerTasks = capable.map(async (provider) => {
      const startedAt = Date.now();
      try {
        const result = await provider.fetchRates(params);
        const latencyMs = Date.now() - startedAt;
        if (result && result.rates && result.rates.length > 0) {
          recordSuccess(provider.id, latencyMs);
          recordProviderOutcome({ provider, operation: 'fetchRates', ok: true, latencyMs });
          successfulResults.push({ ...result, source: provider.id, provider: provider.name });
          return;
        }
        recordSuccess(provider.id, latencyMs);
        recordProviderOutcome({ provider, operation: 'fetchRates', ok: false, latencyMs });
        throw noRatesError();
      } catch (err) {
        const latencyMs = Date.now() - startedAt;
        if (err?.code !== 'NO_RATES') {
          recordError(provider.id, err, latencyMs);
          recordProviderOutcome({ provider, operation: 'fetchRates', ok: false, latencyMs });
        }
        throw err;
      }
    });

    // Fast path: wait for at least one provider to return rates
    try {
      await Promise.any(providerTasks);
    } catch {
      // All providers failed or returned empty
      return noRatesResponse(params, {
        noRatesReason: 'all-providers-returned-empty',
        providersConfigured: this.providers.filter((p) => p.isConfigured()).length,
        providersAvailable: available.length,
      });
    }

    // Grace period: wait for stragglers so we can merge a richer result.
    // Resolves early if all providers settle before the deadline.
    if (capable.length > 1) {
      await Promise.race([
        Promise.allSettled(providerTasks),
        new Promise((resolve) => setTimeout(resolve, MERGE_GRACE_MS)),
      ]);
    }

    // Merge and dedup rates from all providers that finished in time
    const merged = mergeProviderRates(successfulResults);
    if (!merged || !merged.rates?.length) {
      return noRatesResponse(params, {
        noRatesReason: 'all-providers-returned-empty',
        providersConfigured: this.providers.filter((p) => p.isConfigured()).length,
        providersAvailable: available.length,
      });
    }

    return merged;
  }

  /**
   * Get status of all providers (for dashboard/monitoring)
   */
  getStatus() {
    return this.providers.map((p) => {
      const state = getState(p.id);
      const configured = p.isConfigured();

      // Mirror getAvailable() logic including circuit breaker auto-recovery
      let available = false;
      if (configured) {
        let circuitOpen = false;
        if (state.consecutiveErrors >= 5) {
          const lastErrorAt = state.lastError?.at ? Date.parse(state.lastError.at) : 0;
          const tripCount = Math.floor(state.consecutiveErrors / 5);
          const cooldownMs = Math.min(5 * 60 * 1000 * Math.pow(2, tripCount - 1), 30 * 60 * 1000);
          circuitOpen = Date.now() - lastErrorAt < cooldownMs;
        }
        const quotaOk = (p.monthlyLimit <= 0 || state.callsThisMonth < p.monthlyLimit) &&
                         (p.dailyLimit <= 0 || state.callsToday < p.dailyLimit);
        available = !circuitOpen && quotaOk;
      }

      const p50 = medianLatency(state.recentLatencies);
      const successRate = state.callsToday > 0
        ? Math.round(((state.callsToday - state.errors) / state.callsToday) * 100)
        : null;

      return {
        id: p.id,
        name: p.name,
        priority: p.priority,
        configured,
        available,
        hasPreFlightCheck: Boolean(p.canHandle),
        monthlyLimit: p.monthlyLimit,
        dailyLimit: p.dailyLimit,
        ...state,
        recentLatencies: undefined,  // omit raw samples from status response
        p50LatencyMs: p50 !== null ? Math.round(p50) : null,
        successRatePct: successRate,
        quotaUsedPct: p.monthlyLimit > 0
          ? Math.round((state.callsThisMonth / p.monthlyLimit) * 100)
          : 0,
      };
    });
  }

  /**
   * Reset a provider's circuit breaker (clears consecutive errors)
   */
  resetCircuitBreaker(providerId) {
    const state = getState(providerId);
    state.consecutiveErrors = 0;
    persistToKV(providerId, state);
  }
}

function noRatesResponse(params, diagnostics = {}) {
  return {
    rates: [],
    currency: params?.currency || 'USD',
    chk_in: params?.checkIn,
    chk_out: params?.checkOut,
    source: 'none',
    provider: 'none',
    ...diagnostics,
  };
}

// Singleton
export const registry = new ProviderRegistry();

// Exported for unit testing
export { ProviderRegistry, medianLatency, recordSuccess, recordError, getState };
