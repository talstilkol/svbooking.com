/**
 * Provider Registry — manages multiple hotel pricing providers with
 * automatic fallback, quota tracking, and health monitoring.
 *
 * Each provider implements: { name, id, fetchRates(), isAvailable(), getStatus() }
 * The registry tries providers in priority order, skipping exhausted/unhealthy ones.
 */

// In-memory quota + health tracking (resets on server restart)
const providerState = new Map();

function getState(providerId) {
  if (!providerState.has(providerId)) {
    providerState.set(providerId, {
      callsThisMonth: 0,
      callsToday: 0,
      errors: 0,
      consecutiveErrors: 0,
      lastSuccess: null,
      lastError: null,
      lastReset: new Date().toISOString(),
      dayReset: new Date().toISOString().split('T')[0],
    });
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

function recordSuccess(providerId) {
  const state = getState(providerId);
  state.callsThisMonth++;
  state.callsToday++;
  state.consecutiveErrors = 0;
  state.lastSuccess = new Date().toISOString();
}

function recordError(providerId, error) {
  const state = getState(providerId);
  state.callsThisMonth++;
  state.callsToday++;
  state.errors++;
  state.consecutiveErrors++;
  state.lastError = { message: error?.message || String(error), at: new Date().toISOString() };
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
   * Fetch rates using the best available provider, with automatic fallback.
   *
   * @param {Object} params - { hotelKey, hotelName, city, checkIn, checkOut, currency }
   * @returns {Promise<{rates: Array, currency: string, source: string, provider: string}>}
   */
  async fetchRates(params) {
    const available = this.getAvailable();

    for (const provider of available) {
      try {
        const result = await provider.fetchRates(params);
        if (result && result.rates && result.rates.length > 0) {
          recordSuccess(provider.id);
          return { ...result, source: provider.id, provider: provider.name };
        }
        // No rates but no error — don't count as failure
        recordSuccess(provider.id);
      } catch (err) {
        recordError(provider.id, err);
        // Continue to next provider
      }
    }

    // All providers exhausted
    return {
      rates: [],
      currency: params.currency || 'USD',
      chk_in: params.checkIn,
      chk_out: params.checkOut,
      source: 'none',
      provider: 'none',
    };
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
  }
}

// Singleton
export const registry = new ProviderRegistry();
