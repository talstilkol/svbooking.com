import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/kv', () => ({
  kv: {
    get: vi.fn(async () => null),
    setWithTTL: vi.fn(async () => undefined),
  },
}));

vi.mock('@/lib/data-retention', () => ({
  RETENTION_SECONDS: { providerState: 86400 },
}));

vi.mock('@/lib/provider-observability', () => ({
  recordProviderUptimeEvent: vi.fn(async () => {}),
}));

interface MockProvider {
  id: string;
  name: string;
  priority: number;
  monthlyLimit: number;
  dailyLimit: number;
  isConfigured: () => boolean;
  canHandle?: (params: Record<string, unknown>) => boolean;
  fetchRates: ReturnType<typeof vi.fn>;
}

interface ProviderStatus {
  id?: string;
  available?: boolean;
  callsToday?: number;
  callsThisMonth?: number;
  quotaUsedPct?: number;
  p50LatencyMs?: number | null;
  successRatePct?: number | null;
  recentLatencies?: number[];
}

interface ProviderState {
  callsToday: number;
  callsThisMonth: number;
  consecutiveErrors: number;
  dayReset: string;
  lastError: { message: string; at: string } | null;
  recentLatencies: number[];
}

interface ProviderRegistryInstance {
  register(provider: MockProvider): void;
  getAvailable(): MockProvider[];
  getStatus(): ProviderStatus[];
  fetchRates(params: Record<string, unknown>): Promise<{
    rates: unknown[];
    source: string;
    provider: string;
    noRatesReason?: string;
    providersConfigured?: number;
    providersAvailable?: number;
  }>;
  resetCircuitBreaker(providerId: string): void;
}

interface ProviderRegistryModule {
  ProviderRegistry: new () => ProviderRegistryInstance;
  medianLatency: (latencies?: number[] | null) => number | null;
  recordSuccess: (providerId: string, latencyMs?: number) => void;
  recordError: (providerId: string, error: Error, latencyMs?: number) => void;
  getState: (providerId: string) => ProviderState;
}

function createMockProvider(
  id: string,
  name: string,
  priority: number,
  opts: { configured?: boolean; monthlyLimit?: number; dailyLimit?: number; canHandle?: (params: Record<string, unknown>) => boolean } = {},
): MockProvider {
  const provider: MockProvider = {
    id,
    name,
    priority,
    monthlyLimit: opts.monthlyLimit ?? 0,
    dailyLimit: opts.dailyLimit ?? 0,
    isConfigured: () => opts.configured ?? true,
    fetchRates: vi.fn(async () => null),
  };
  if (opts.canHandle) provider.canHandle = opts.canHandle;
  return provider;
}

describe('provider registry', () => {
  let ProviderRegistry: ProviderRegistryModule['ProviderRegistry'];
  let medianLatency: ProviderRegistryModule['medianLatency'];
  let recordSuccess: ProviderRegistryModule['recordSuccess'];
  let recordError: ProviderRegistryModule['recordError'];
  let getState: ProviderRegistryModule['getState'];

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.resetModules();
    const mod = await import('@/lib/providers/registry') as unknown as ProviderRegistryModule;
    ({ ProviderRegistry, medianLatency, recordSuccess, recordError, getState } = mod);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── medianLatency ──────────────────────────────────────────────

  describe('medianLatency', () => {
    it('returns null for empty array', () => {
      expect(medianLatency([])).toBeNull();
    });

    it('returns null for null / undefined', () => {
      expect(medianLatency(null)).toBeNull();
      expect(medianLatency(undefined)).toBeNull();
    });

    it('returns the middle value for odd-length array', () => {
      expect(medianLatency([3, 1, 2])).toBe(2);
      expect(medianLatency([10])).toBe(10);
      expect(medianLatency([5, 1, 9, 3, 7])).toBe(5);
    });

    it('returns average of two middle values for even-length array', () => {
      expect(medianLatency([1, 2, 3, 4])).toBe(2.5);
      expect(medianLatency([10, 20])).toBe(15);
    });
  });

  // ── getAvailable filtering ─────────────────────────────────────

  describe('getAvailable', () => {
    it('filters out unconfigured providers', () => {
      const registry = new ProviderRegistry();
      registry.register(createMockProvider('uncfg', 'Unconfigured', 1, { configured: false }));
      registry.register(createMockProvider('cfg', 'Configured', 2));

      const available = registry.getAvailable();
      expect(available).toHaveLength(1);
      expect(available[0].id).toBe('cfg');
    });

    it('filters out monthly-quota-exhausted providers', () => {
      const registry = new ProviderRegistry();
      registry.register(createMockProvider('m-quota', 'MQuota', 1, { monthlyLimit: 5 }));

      for (let i = 0; i < 5; i++) recordSuccess('m-quota');
      expect(registry.getAvailable()).toHaveLength(0);
    });

    it('filters out daily-quota-exhausted providers', () => {
      const registry = new ProviderRegistry();
      registry.register(createMockProvider('d-quota', 'DQuota', 1, { dailyLimit: 3 }));

      for (let i = 0; i < 3; i++) recordSuccess('d-quota');
      expect(registry.getAvailable()).toHaveLength(0);
    });

    it('filters out circuit-broken providers (>=5 consecutive errors)', () => {
      const registry = new ProviderRegistry();
      registry.register(createMockProvider('cb', 'CB', 1));

      for (let i = 0; i < 5; i++) recordError('cb', new Error('fail'));
      expect(registry.getAvailable()).toHaveLength(0);
    });
  });

  // ── circuit breaker auto-recovery ──────────────────────────────

  describe('circuit breaker auto-recovery', () => {
    it('re-includes provider after cooldown elapses', () => {
      const registry = new ProviderRegistry();
      registry.register(createMockProvider('cb-rec', 'CBRec', 1));

      for (let i = 0; i < 5; i++) recordError('cb-rec', new Error('fail'));
      expect(registry.getAvailable()).toHaveLength(0);

      // 5 consecutive errors → tripCount=1 → cooldown = 5 min
      const realNow = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(realNow + 6 * 60 * 1000);
      expect(registry.getAvailable()).toHaveLength(1);
    });

    it('stays tripped if cooldown has not elapsed', () => {
      const registry = new ProviderRegistry();
      registry.register(createMockProvider('cb-wait', 'CBWait', 1));

      for (let i = 0; i < 5; i++) recordError('cb-wait', new Error('fail'));

      // Only 2 minutes later — still within 5 min cooldown
      const realNow = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(realNow + 2 * 60 * 1000);
      expect(registry.getAvailable()).toHaveLength(0);
    });

    it('reports circuit breaker state in status and resets it explicitly', () => {
      const registry = new ProviderRegistry();
      registry.register(createMockProvider('cb-status', 'CBStatus', 1));

      for (let i = 0; i < 5; i++) recordError('cb-status', new Error('fail'));
      expect(registry.getStatus()[0]).toMatchObject({
        id: 'cb-status',
        available: false,
      });

      registry.resetCircuitBreaker('cb-status');
      expect(getState('cb-status').consecutiveErrors).toBe(0);
      expect(registry.getStatus()[0].available).toBe(true);
    });
  });

  // ── dynamic sorting ────────────────────────────────────────────

  describe('dynamic sorting', () => {
    it('orders faster provider before slower one at same priority', () => {
      const registry = new ProviderRegistry();
      registry.register(createMockProvider('slow', 'Slow', 1));
      registry.register(createMockProvider('fast', 'Fast', 1));

      for (let i = 0; i < 5; i++) {
        recordSuccess('slow', 500);
        recordSuccess('fast', 100);
      }

      const available = registry.getAvailable();
      expect(available[0].id).toBe('fast');
      expect(available[1].id).toBe('slow');
    });

    it('falls back to static priority when no latency data', () => {
      const registry = new ProviderRegistry();
      registry.register(createMockProvider('hi', 'High', 1));
      registry.register(createMockProvider('lo', 'Low', 2));

      const available = registry.getAvailable();
      expect(available[0].id).toBe('hi');
      expect(available[1].id).toBe('lo');
    });
  });

  // ── latency tracking window ────────────────────────────────────

  describe('latency tracking', () => {
    it('caps recentLatencies at 20 samples after recordSuccess calls', () => {
      for (let i = 0; i < 25; i++) recordSuccess('lat-s', 100 + i);
      expect(getState('lat-s').recentLatencies).toHaveLength(20);
    });

    it('caps recentLatencies at 20 samples after recordError calls', () => {
      for (let i = 0; i < 25; i++) recordError('lat-e', new Error('fail'), 200 + i);
      expect(getState('lat-e').recentLatencies).toHaveLength(20);
    });

    it('keeps only the most recent samples', () => {
      for (let i = 1; i <= 25; i++) recordSuccess('lat-recent', i * 10);
      const latencies = getState('lat-recent').recentLatencies;
      // First 5 samples (10–50) should have been evicted; oldest remaining is 60
      expect(latencies[0]).toBe(60);
      expect(latencies[latencies.length - 1]).toBe(250);
    });

    it('resets the daily call counter when the calendar day changes', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-31T23:55:00.000Z'));

      recordSuccess('daily-reset', 100);
      expect(getState('daily-reset')).toMatchObject({
        callsToday: 1,
        dayReset: '2026-05-31',
      });

      vi.setSystemTime(new Date('2026-06-01T00:05:00.000Z'));
      expect(getState('daily-reset')).toMatchObject({
        callsToday: 0,
        dayReset: '2026-06-01',
      });
      vi.useRealTimers();
    });

    it('stores sanitized timeout errors instead of provider exception text', () => {
      const error = new Error('upstream included sensitive detail');
      error.name = 'AbortError';

      recordError('timeout-provider', error, 9000);

      expect(getState('timeout-provider').lastError?.message).toBe('Provider request timed out');
      expect(JSON.stringify(getState('timeout-provider'))).not.toContain('sensitive detail');
    });
  });

  // ── getStatus ──────────────────────────────────────────────────

  describe('getStatus', () => {
    it('returns p50LatencyMs computed from recorded latencies', () => {
      const registry = new ProviderRegistry();
      registry.register(createMockProvider('st-p50', 'StP50', 1));

      recordSuccess('st-p50', 100);
      recordSuccess('st-p50', 200);
      recordSuccess('st-p50', 300);

      const status = registry.getStatus();
      expect(status[0].p50LatencyMs).toBe(200);
    });

    it('returns null p50LatencyMs when no latencies recorded', () => {
      const registry = new ProviderRegistry();
      registry.register(createMockProvider('st-empty', 'StEmpty', 1));

      const status = registry.getStatus();
      expect(status[0].p50LatencyMs).toBeNull();
    });

    it('returns successRatePct based on today calls vs errors', () => {
      const registry = new ProviderRegistry();
      registry.register(createMockProvider('st-rate', 'StRate', 1));

      recordSuccess('st-rate', 100);
      recordSuccess('st-rate', 100);
      recordSuccess('st-rate', 100);
      recordError('st-rate', new Error('fail'), 100);

      const status = registry.getStatus();
      // 4 calls today, 1 error → (4-1)/4 = 75%
      expect(status[0].successRatePct).toBe(75);
    });

    it('omits raw recentLatencies from status response', () => {
      const registry = new ProviderRegistry();
      registry.register(createMockProvider('st-omit', 'StOmit', 1));

      recordSuccess('st-omit', 150);
      const status = registry.getStatus();
      expect(status[0].recentLatencies).toBeUndefined();
    });

    it('reports quota usage without marking unlimited providers as exhausted', () => {
      const registry = new ProviderRegistry();
      registry.register(createMockProvider('limited-status', 'LimitedStatus', 1, { monthlyLimit: 10 }));
      registry.register(createMockProvider('unlimited-status', 'UnlimitedStatus', 2));

      recordSuccess('limited-status', 150);
      recordSuccess('limited-status', 150);
      const status = registry.getStatus();

      expect(status.find((entry) => entry.id === 'limited-status')).toMatchObject({
        quotaUsedPct: 20,
        available: true,
      });
      expect(status.find((entry) => entry.id === 'unlimited-status')).toMatchObject({
        quotaUsedPct: 0,
        available: true,
      });
    });
  });

  describe('fetchRates diagnostics', () => {
    it('returns explicit diagnostics when no providers are configured', async () => {
      const registry = new ProviderRegistry();

      const result = await registry.fetchRates({
        hotelKey: 'g1-d1',
        checkIn: '2026-06-01',
        checkOut: '2026-06-03',
      });

      expect(result).toMatchObject({
        rates: [],
        source: 'none',
        provider: 'none',
        noRatesReason: 'no-providers-configured',
        providersConfigured: 0,
        providersAvailable: 0,
      });
    });

    it('distinguishes unavailable providers from providers that cannot handle the request', async () => {
      const unavailable = new ProviderRegistry();
      unavailable.register(createMockProvider('quota-out', 'QuotaOut', 1, { dailyLimit: 1 }));
      recordSuccess('quota-out');

      await expect(unavailable.fetchRates({
        hotelKey: 'g1-d1',
        checkIn: '2026-06-01',
        checkOut: '2026-06-03',
      })).resolves.toMatchObject({
        noRatesReason: 'all-providers-unavailable',
        providersConfigured: 1,
        providersAvailable: 0,
      });

      const incapable = new ProviderRegistry();
      incapable.register(createMockProvider('cannot-handle', 'CannotHandle', 1, {
        canHandle: () => false,
      }));

      await expect(incapable.fetchRates({
        hotelKey: 'g1-d1',
        checkIn: '2026-06-01',
        checkOut: '2026-06-03',
      })).resolves.toMatchObject({
        noRatesReason: 'no-providers-can-handle',
        providersConfigured: 1,
        providersAvailable: 1,
      });
    });
  });
});
