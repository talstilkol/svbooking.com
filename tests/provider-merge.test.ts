import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for the provider registry's merge-and-dedup logic.
 *
 * The registry now uses a "race for first, grace for breadth" strategy:
 *   1. Launch all providers in parallel
 *   2. Return as soon as the first succeeds (Promise.any)
 *   3. Wait a grace period (2s) for additional providers
 *   4. Merge and dedup all successful results by OTA code
 */

// Deterministic control over which providers succeed and when
const providerDelay = new Map<string, number>();
const providerResults = new Map<string, unknown>();
const providerErrors = new Map<string, Error>();

function createMockProvider(id: string, name: string, priority: number) {
  return {
    id,
    name,
    priority,
    monthlyLimit: 0,
    dailyLimit: 0,
    isConfigured: () => true,
    fetchRates: vi.fn(async () => {
      const delay = providerDelay.get(id) || 0;
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
      if (providerErrors.has(id)) throw providerErrors.get(id);
      return providerResults.get(id) || null;
    }),
  };
}

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

describe('provider merge and dedup', () => {
  let registry: InstanceType<typeof import('@/lib/providers/registry').ProviderRegistry>;

  beforeEach(async () => {
    vi.clearAllMocks();
    providerDelay.clear();
    providerResults.clear();
    providerErrors.clear();

    // Fresh registry each test
    const mod = await import('@/lib/providers/registry');
    // @ts-expect-error — access class for testing
    registry = new mod.ProviderRegistry();
  });

  it('returns single provider result unchanged when only one is available', async () => {
    const provider = createMockProvider('xotelo', 'Xotelo', 1);
    providerResults.set('xotelo', {
      rates: [
        { name: 'Booking.com', code: 'bookingcom', rate: 200, tax: 30, total: 230 },
        { name: 'Expedia', code: 'expedia', rate: 180, tax: 20, total: 200 },
      ],
      currency: 'USD',
      chk_in: '2026-06-01',
      chk_out: '2026-06-03',
    });

    registry.register(provider);
    const result = await registry.fetchRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03' });

    expect(result.rates).toHaveLength(2);
    expect(result.source).toBe('xotelo');
    expect(result.provider).toBe('Xotelo');
  });

  it('merges rates from multiple providers and deduplicates by OTA', async () => {
    const xotelo = createMockProvider('xotelo', 'Xotelo', 1);
    const serpapi = createMockProvider('serpapi', 'SerpApi', 2);

    providerResults.set('xotelo', {
      rates: [
        { name: 'Booking.com', code: 'bookingcom', rate: 200, tax: 30, total: 230 },
        { name: 'Expedia', code: 'expedia', rate: 180, tax: 20, total: 200 },
      ],
      currency: 'USD',
      chk_in: '2026-06-01',
      chk_out: '2026-06-03',
    });

    providerResults.set('serpapi', {
      rates: [
        { name: 'Google Hotels', code: 'google', rate: 210, tax: 0, total: 210 },
        { name: 'Booking.com', code: 'bookingcom', rate: 235, tax: 0, total: 235 }, // Duplicate OTA, higher price
      ],
      currency: 'USD',
      chk_in: '2026-06-01',
      chk_out: '2026-06-03',
    });

    registry.register(xotelo);
    registry.register(serpapi);

    const result = await registry.fetchRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03' });

    // 3 unique OTAs: booking (from xotelo, cheaper), expedia, google
    expect(result.rates).toHaveLength(3);
    expect(result.mergedProviders).toBe(2);
    expect(result.source).toContain('xotelo');
    expect(result.source).toContain('serpapi');

    // Booking.com should be the cheaper one (230 from xotelo, not 235 from serpapi)
    const bookingRate = result.rates.find((r: { code: string }) => r.code === 'booking');
    expect(bookingRate).toBeDefined();
    expect(bookingRate.total).toBe(230);

    // Google Hotels should be included from serpapi
    const googleRate = result.rates.find((r: { code: string }) => r.code === 'google');
    expect(googleRate).toBeDefined();
    expect(googleRate.total).toBe(210);
  });

  it('normalizes OTA code variations to canonical form', async () => {
    const xotelo = createMockProvider('xotelo', 'Xotelo', 1);
    const serpapi = createMockProvider('serpapi', 'SerpApi', 2);

    providerResults.set('xotelo', {
      rates: [
        { name: 'Booking.com', code: 'bookingcom', rate: 200, tax: 0, total: 200 },
      ],
      currency: 'USD',
      chk_in: '2026-06-01',
      chk_out: '2026-06-03',
    });

    providerResults.set('serpapi', {
      rates: [
        { name: 'Booking', code: 'booking', rate: 210, tax: 0, total: 210 },
      ],
      currency: 'USD',
      chk_in: '2026-06-01',
      chk_out: '2026-06-03',
    });

    registry.register(xotelo);
    registry.register(serpapi);

    const result = await registry.fetchRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03' });

    // "bookingcom" and "booking" should merge into one "booking" entry
    expect(result.rates).toHaveLength(1);
    expect(result.rates[0].code).toBe('booking');
    expect(result.rates[0].total).toBe(200); // Cheaper one kept
  });

  it('prefers rates with more complete data on price tie', async () => {
    const xotelo = createMockProvider('xotelo', 'Xotelo', 1);
    const serpapi = createMockProvider('serpapi', 'SerpApi', 2);

    providerResults.set('xotelo', {
      rates: [
        { name: 'Expedia', code: 'expedia', rate: 200, tax: 0, total: 200,
          deepLink: 'https://expedia.com/hotel', roomName: 'Deluxe King' },
      ],
      currency: 'USD',
      chk_in: '2026-06-01',
      chk_out: '2026-06-03',
    });

    providerResults.set('serpapi', {
      rates: [
        { name: 'Expedia', code: 'expedia', rate: 200, tax: 0, total: 200 },
      ],
      currency: 'USD',
      chk_in: '2026-06-01',
      chk_out: '2026-06-03',
    });

    registry.register(xotelo);
    registry.register(serpapi);

    const result = await registry.fetchRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03' });

    // Same price, but xotelo's rate has deepLink + roomName — should win
    expect(result.rates).toHaveLength(1);
    expect(result.rates[0].deepLink).toBe('https://expedia.com/hotel');
    expect(result.rates[0].roomName).toBe('Deluxe King');
  });

  it('returns noRatesResponse when all providers fail', async () => {
    const xotelo = createMockProvider('xotelo', 'Xotelo', 1);
    providerErrors.set('xotelo', new Error('Upstream timeout'));

    registry.register(xotelo);
    const result = await registry.fetchRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03' });

    expect(result.rates).toEqual([]);
    expect(result.noRatesReason).toBe('all-providers-returned-empty');
    expect(result.source).toBe('none');
  });

  it('returns result from first provider if second fails', async () => {
    const xotelo = createMockProvider('xotelo', 'Xotelo', 1);
    const serpapi = createMockProvider('serpapi', 'SerpApi', 2);

    providerResults.set('xotelo', {
      rates: [{ name: 'Booking.com', code: 'bookingcom', rate: 200, tax: 0, total: 200 }],
      currency: 'USD',
      chk_in: '2026-06-01',
      chk_out: '2026-06-03',
    });
    providerErrors.set('serpapi', new Error('API key expired'));

    registry.register(xotelo);
    registry.register(serpapi);

    const result = await registry.fetchRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03' });

    expect(result.rates).toHaveLength(1);
    expect(result.source).toBe('xotelo');
    expect(result.mergedProviders).toBeUndefined(); // Single result, no merge wrapper
  });

  it('sets source on each merged rate to its originating provider', async () => {
    const xotelo = createMockProvider('xotelo', 'Xotelo', 1);
    const serpapi = createMockProvider('serpapi', 'SerpApi', 2);

    providerResults.set('xotelo', {
      rates: [{ name: 'Booking.com', code: 'bookingcom', rate: 200, tax: 0, total: 200 }],
      currency: 'USD',
      chk_in: '2026-06-01',
      chk_out: '2026-06-03',
    });

    providerResults.set('serpapi', {
      rates: [{ name: 'Google Hotels', code: 'google', rate: 210, tax: 0, total: 210 }],
      currency: 'USD',
      chk_in: '2026-06-01',
      chk_out: '2026-06-03',
    });

    registry.register(xotelo);
    registry.register(serpapi);

    const result = await registry.fetchRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03' });

    const bookingRate = result.rates.find((r: { code: string }) => r.code === 'booking');
    const googleRate = result.rates.find((r: { code: string }) => r.code === 'google');

    expect(bookingRate.source).toBe('xotelo');
    expect(googleRate.source).toBe('serpapi');
  });
});
