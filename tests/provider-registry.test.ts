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
  fetchRates: ReturnType<typeof vi.fn>;
}

interface ProviderStatus {
  p50LatencyMs?: number | null;
  successRatePct?: number | null;
  recentLatencies?: number[];
}

interface ProviderState {
  recentLatencies: number[];
}

interface ProviderRegistryInstance {
  register(provider: MockProvider): void;
  getAvailable(): MockProvider[];
  getStatus(): ProviderStatus[];
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
  opts: { configured?: boolean; monthlyLimit?: number; dailyLimit?: number } = {},
): MockProvider {
  return {
    id,
    name,
    priority,
    monthlyLimit: opts.monthlyLimit ?? 0,
    dailyLimit: opts.dailyLimit ?? 0,
    isConfigured: () => opts.configured ?? true,
    fetchRates: vi.fn(async () => null),
  };
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
  });
});
