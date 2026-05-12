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

// In-memory quota + health tracking (primary — fast path)
const providerState = new Map();
// Track which providers have been restored from KV
const restoredFromKV = new Set();

const STATE_TTL = 2592000; // 30 days

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
  };
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

function recordSuccess(providerId) {
  const state = getState(providerId);
  state.callsThisMonth++;
  state.callsToday++;
  state.consecutiveErrors = 0;
  state.lastSuccess = new Date().toISOString();
  persistToKV(providerId, state);
}

function recordError(providerId, error) {
  const state = getState(providerId);
  state.callsThisMonth++;
  state.callsToday++;
  state.errors++;
  state.consecutiveErrors++;
  state.lastError = { message: error?.message || String(error), at: new Date().toISOString() };
  persistToKV(providerId, state);
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
   * Get available providers (configured + not exhausted + not circuit-broken)
   */
  getAvailable() {
    return this.providers.filter((p) => {
      if (!p.isConfigured()) return false;
      const state = getState(p.id);

      // Circuit breaker: skip if 5+ consecutive errors
      if (state.consecutiveErrors >= 5) return false;

      // Quota check
      if (p.monthlyLimit > 0 && state.callsThisMonth >= p.monthlyLimit) return false;
      if (p.dailyLimit > 0 && state.callsToday >= p.dailyLimit) return false;

      return true;
    });
  }

  /**
   * Fetch rates using available providers with race-based fallback.
   * Races the top providers in parallel — returns the first successful result.
   * Falls back to sequential for remaining providers if all raced fail.
   *
   * @param {Object} params - { hotelKey, hotelName, city, checkIn, checkOut, currency }
   * @returns {Promise<{rates: Array, currency: string, source: string, provider: string}>}
   */
  async fetchRates(params) {
    const available = this.getAvailable();

    if (available.length === 0) {
      return noRatesResponse(params);
    }

    // Race the top 3 configured providers in parallel
    const raceGroup = available.slice(0, 3);
    const sequential = available.slice(3);

    if (raceGroup.length > 0) {
      // Create race promises that resolve with the result or reject
      const racePromises = raceGroup.map(async (provider) => {
        try {
          const result = await provider.fetchRates(params);
          if (result && result.rates && result.rates.length > 0) {
            recordSuccess(provider.id);
            return { ...result, source: provider.id, provider: provider.name };
          }
          recordSuccess(provider.id);
          throw new Error('No rates returned');
        } catch (err) {
          recordError(provider.id, err);
          throw err;
        }
      });

      // Try to get the first successful result
      try {
        const result = await Promise.any(racePromises);
        return result;
      } catch {
        // All raced providers failed — continue to sequential fallback
      }
    }

    // Sequential fallback for remaining providers
    for (const provider of sequential) {
      try {
        const result = await provider.fetchRates(params);
        if (result && result.rates && result.rates.length > 0) {
          recordSuccess(provider.id);
          return { ...result, source: provider.id, provider: provider.name };
        }
        recordSuccess(provider.id);
      } catch (err) {
        recordError(provider.id, err);
      }
    }

    return noRatesResponse(params);
  }

  /**
   * Get status of all providers (for dashboard/monitoring)
   */
  getStatus() {
    return this.providers.map((p) => {
      const state = getState(p.id);
      const configured = p.isConfigured();
      const available = configured &&
        state.consecutiveErrors < 5 &&
        (p.monthlyLimit <= 0 || state.callsThisMonth < p.monthlyLimit) &&
        (p.dailyLimit <= 0 || state.callsToday < p.dailyLimit);

      return {
        id: p.id,
        name: p.name,
        priority: p.priority,
        configured,
        available,
        monthlyLimit: p.monthlyLimit,
        dailyLimit: p.dailyLimit,
        ...state,
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

function noRatesResponse(params) {
  return {
    rates: [],
    currency: params?.currency || 'USD',
    chk_in: params?.checkIn,
    chk_out: params?.checkOut,
    source: 'none',
    provider: 'none',
  };
}

// Singleton
export const registry = new ProviderRegistry();
