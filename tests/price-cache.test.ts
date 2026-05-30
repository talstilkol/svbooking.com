import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/kv', () => {
  const store = new Map<string, unknown>();
  return {
    __store: store,
    kv: {
      get: vi.fn(async (key: string) => store.get(key) || null),
      mget: vi.fn(async (...keys: (string | string[])[]) => {
        const flat = keys.flat();
        return flat.map((k) => store.get(k) || null);
      }),
      setWithTTL: vi.fn(async (key: string, value: unknown) => {
        store.set(key, value);
      }),
      del: vi.fn(async (key: string) => {
        store.delete(key);
      }),
    },
  };
});

vi.mock('@/lib/hotel-pricing', () => ({
  getHotelRates: vi.fn(async () => ({
    rates: [{ name: 'Provider A', rate: 100, tax: 20 }],
    currency: 'USD',
    source: 'xotelo',
    provider: 'Xotelo',
  })),
}));

vi.mock('@/lib/xotelo', () => ({
  getHeatmap: vi.fn(async () => ({ rates: [{ rate: 120, date: '2026-06-01' }] })),
}));

import { kv } from '@/lib/kv';
import { getHotelRates } from '@/lib/hotel-pricing';
import { getHeatmap } from '@/lib/xotelo';
import { getCachedHeatmap, getCachedRates, getCachedRatesBatch } from '@/lib/price-cache';

describe('price cache', () => {
  beforeEach(async () => {
    const mod = await import('@/lib/kv') as Record<string, unknown>;
    (mod.__store as Map<string, unknown>).clear();
    vi.clearAllMocks();
  });

  it('uses the multi-provider registry for dated rates and adds freshness metadata', async () => {
    const result = await getCachedRates({
      hotelKey: 'g1-d1',
      hotelName: 'Verified Hotel',
      city: 'Paris',
      checkIn: '2026-06-01',
      checkOut: '2026-06-03',
    } as Parameters<typeof getCachedRates>[0]);

    expect(getHotelRates).toHaveBeenCalledWith(expect.objectContaining({
      hotelKey: 'g1-d1',
      hotelName: 'Verified Hotel',
      city: 'Paris',
    }));
    expect(result.fromCache).toBe(false);
    expect(result.freshness).toBe('live');
    expect(result.provider).toBe('Xotelo');
    expect(result.lastCheckedAt).toBeTruthy();
    expect(result.rates[0].provider).toBe('Provider A');
    expect(result.rates[0].total).toBe(120);
    expect(result.rates[0].taxesIncluded).toBeNull();
    expect(result.rates[0].priceAccuracyState).toBe('unobserved');
  });

  it('drops unusable provider rates before caching them', async () => {
    vi.mocked(getHotelRates).mockResolvedValueOnce({
      rates: [
        { provider: 'Booking.com', total: 0, source: 'xotelo' },
        { provider: 'unknown', total: 120, source: 'xotelo' },
        { name: 'Verified Provider', rate: 140, tax: 20, currency: 'eur', url: 'http://provider.invalid/rate' },
      ],
      currency: 'eur',
      provider: 'Xotelo',
      source: 'xotelo',
    });

    const result = await getCachedRates({
      hotelKey: 'g1-d1',
      hotelName: 'Verified Hotel',
      city: 'Paris',
      checkIn: '2026-06-01',
      checkOut: '2026-06-03',
    } as Parameters<typeof getCachedRates>[0]);

    expect(result.rates).toEqual([
      expect.objectContaining({
        provider: 'Verified Provider',
        source: 'xotelo',
        total: 160,
        currency: 'EUR',
        url: null,
        deepLink: null,
      }),
    ]);
  });

  it('sanitizes cached provider links and currencies before returning them', async () => {
    await kv.setWithTTL('price:g1-d1:2026-06-01:2026-06-03:USD', {
      cachedAt: new Date().toISOString(),
      result: {
        rates: [
          { provider: 'Cached Provider', total: 180, currency: 'usd', deepLink: 'https://provider.example/rate' },
          { provider: 'Cached Provider', total: 181, currency: 'US', deepLink: 'javascript:alert(1)' },
        ],
        currency: 'usd',
        provider: 'Cached Provider',
        source: 'cached-provider',
      },
    }, 7200);

    const result = await getCachedRates({
      hotelKey: 'g1-d1',
      checkIn: '2026-06-01',
      checkOut: '2026-06-03',
    } as Parameters<typeof getCachedRates>[0]);

    expect(result.currency).toBe('USD');
    expect(result.rates[0].currency).toBe('USD');
    expect(result.rates[0].deepLink).toBe('https://provider.example/rate');
    expect(result.rates[1].currency).toBe('USD');
    expect(result.rates[1].deepLink).toBeNull();
  });

  it('returns stale cached rates immediately with partial metadata', async () => {
    await kv.setWithTTL('price:g1-d1:2026-06-01:2026-06-03:USD', {
      cachedAt: '2026-01-01T00:00:00.000Z',
      result: {
        rates: [{ name: 'Cached Provider', rate: 90, tax: 10 }],
        currency: 'USD',
        provider: 'Cached Provider',
        source: 'cached',
        lastCheckedAt: '2026-01-01T00:00:00.000Z',
      },
    }, 7200);

    const result = await getCachedRates({
      hotelKey: 'g1-d1',
      checkIn: '2026-06-01',
      checkOut: '2026-06-03',
    } as Parameters<typeof getCachedRates>[0]);

    expect(result.fromCache).toBe(true);
    expect(result.freshness).toBe('stale');
    expect(result.partial).toBe(true);
    expect(result.rates[0].name).toBe('Cached Provider');
  });

  it('returns estimated rates from nearby cached dates on cache miss', async () => {
    // Simulate a "latest rates" entry from a nearby date (2 days off)
    await kv.setWithTTL('latest-rates:g1-d1:USD', {
      result: {
        rates: [{ name: 'Estimated Provider', rate: 110, tax: 10 }],
        currency: 'USD',
        provider: 'Xotelo',
        source: 'xotelo',
        lastCheckedAt: '2026-05-20T00:00:00.000Z',
      },
      cachedAt: '2026-05-20T00:00:00.000Z',
      forDates: { checkIn: '2026-06-03', checkOut: '2026-06-05' },
    }, 7200);

    const result = await getCachedRates({
      hotelKey: 'g1-d1',
      hotelName: 'Test Hotel',
      city: 'Paris',
      checkIn: '2026-06-01',
      checkOut: '2026-06-03',
    } as Parameters<typeof getCachedRates>[0]);

    // Should return estimated data from nearby date
    expect(result.freshness).toBe('estimated');
    expect(result.partial).toBe(true);
    expect(result.fromCache).toBe(true);
    expect(result.estimatedFromDates).toEqual({ checkIn: '2026-06-03', checkOut: '2026-06-05' });
    expect(result.rates[0].name).toBe('Estimated Provider');

    // Should also trigger a live fetch in background
    expect(getHotelRates).toHaveBeenCalledWith(expect.objectContaining({
      hotelKey: 'g1-d1',
      checkIn: '2026-06-01',
    }));
  });

  it('does not use fuzzy cache for dates too far apart', async () => {
    await kv.setWithTTL('latest-rates:g1-d1:USD', {
      result: {
        rates: [{ name: 'Far Away Provider', rate: 500, tax: 0 }],
        currency: 'USD',
        provider: 'Xotelo',
        source: 'xotelo',
      },
      cachedAt: '2026-05-20T00:00:00.000Z',
      forDates: { checkIn: '2026-08-01', checkOut: '2026-08-03' },
    }, 7200);

    const result = await getCachedRates({
      hotelKey: 'g1-d1',
      hotelName: 'Test Hotel',
      city: 'Paris',
      checkIn: '2026-06-01',
      checkOut: '2026-06-03',
    } as Parameters<typeof getCachedRates>[0]);

    // Should NOT use fuzzy cache (dates are 61 days apart)
    expect(result.freshness).toBe('live');
    expect(result.fromCache).toBe(false);
    expect(result.estimatedFromDates).toBeUndefined();
  });

  it('batch-fetches rates using mget for reduced round-trips', async () => {
    // Pre-populate cache for one hotel
    await kv.setWithTTL('price:g1-d1:2026-06-01:2026-06-03:USD', {
      cachedAt: new Date().toISOString(),
      result: {
        rates: [{ name: 'Cached Hotel', rate: 80, tax: 10 }],
        currency: 'USD',
        provider: 'Xotelo',
        source: 'xotelo',
        lastCheckedAt: new Date().toISOString(),
      },
    }, 7200);

    const results = await getCachedRatesBatch([
      { hotelKey: 'g1-d1', hotelName: 'Hotel A', city: 'Paris', checkIn: '2026-06-01', checkOut: '2026-06-03' },
      { hotelKey: 'g2-d2', hotelName: 'Hotel B', city: 'London', checkIn: '2026-06-01', checkOut: '2026-06-03' },
    ]);

    expect(results).toHaveLength(2);

    // First hotel served from cache
    expect(results[0].fromCache).toBe(true);
    expect(results[0].freshness).toBe('fresh');
    expect(results[0].rates[0].provider).toBe('Cached Hotel');

    // Second hotel fetched live (cache miss)
    expect(results[1].fromCache).toBe(false);
    expect(results[1].freshness).toBe('live');

    // Only one live fetch needed (the miss)
    expect(getHotelRates).toHaveBeenCalledTimes(1);
    expect(getHotelRates).toHaveBeenCalledWith(expect.objectContaining({ hotelKey: 'g2-d2' }));
  });

  it('batch returns fuzzy estimates for misses with nearby cached dates', async () => {
    // Seed fuzzy cache for one hotel
    await kv.setWithTTL('latest-rates:g1-d1:USD', {
      result: {
        rates: [{ name: 'Nearby Provider', rate: 95, tax: 5 }],
        currency: 'USD',
        provider: 'Xotelo',
        source: 'xotelo',
        lastCheckedAt: '2026-05-20T00:00:00.000Z',
      },
      cachedAt: '2026-05-20T00:00:00.000Z',
      forDates: { checkIn: '2026-06-03', checkOut: '2026-06-05' },
    }, 7200);

    const results = await getCachedRatesBatch([
      { hotelKey: 'g1-d1', hotelName: 'Hotel A', city: 'Paris', checkIn: '2026-06-01', checkOut: '2026-06-03' },
    ]);

    expect(results[0].freshness).toBe('estimated');
    expect(results[0].fromCache).toBe(true);
    expect(results[0].estimatedFromDates).toEqual({ checkIn: '2026-06-03', checkOut: '2026-06-05' });

    // Should still trigger background live fetch
    expect(getHotelRates).toHaveBeenCalledTimes(1);
  });

  it('uses longer fresh window for far-future check-in dates', async () => {
    // Cache a result with cachedAt = 90 minutes ago.
    // For near-term (7-day) dates, 90min > 1h fresh TTL → stale.
    // For far-term (30-day) dates, 90min < 4h fresh TTL → still fresh.
    const ninetyMinAgo = new Date(Date.now() - 90 * 60 * 1000).toISOString();
    const cachedResult = {
      rates: [{ name: 'Adaptive TTL Hotel', rate: 150, tax: 15 }],
      currency: 'USD',
      provider: 'Xotelo',
      source: 'xotelo',
      lastCheckedAt: ninetyMinAgo,
    };

    // Near-term check-in (7 days out) — should be STALE (90min > 1h fresh window)
    const nearDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const nearCheckOut = new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0];
    await kv.setWithTTL(`price:g1-d1:${nearDate}:${nearCheckOut}:USD`, {
      cachedAt: ninetyMinAgo,
      result: cachedResult,
    }, 7200);

    const nearResult = await getCachedRates({
      hotelKey: 'g1-d1', hotelName: 'Test', city: 'Paris',
      checkIn: nearDate, checkOut: nearCheckOut,
    } as Parameters<typeof getCachedRates>[0]);

    expect(nearResult.fromCache).toBe(true);
    expect(nearResult.freshness).toBe('stale');

    vi.clearAllMocks();

    // Far-term check-in (30 days out) — should be FRESH (90min < 4h fresh window)
    const farDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const farCheckOut = new Date(Date.now() + 32 * 86400000).toISOString().split('T')[0];
    await kv.setWithTTL(`price:g1-d1:${farDate}:${farCheckOut}:USD`, {
      cachedAt: ninetyMinAgo,
      result: cachedResult,
    }, 7200);

    const farResult = await getCachedRates({
      hotelKey: 'g1-d1', hotelName: 'Test', city: 'Paris',
      checkIn: farDate, checkOut: farCheckOut,
    } as Parameters<typeof getCachedRates>[0]);

    expect(farResult.fromCache).toBe(true);
    expect(farResult.freshness).toBe('fresh');
    // No background revalidation needed for fresh result
    expect(getHotelRates).not.toHaveBeenCalled();
  });

  it('keeps heatmap data labeled as a price source, not a booking provider', async () => {
    const result = await getCachedHeatmap({ hotelKey: 'g1-d1', checkOut: '2026-06-03' } as Parameters<typeof getCachedHeatmap>[0]);

    expect(getHeatmap).toHaveBeenCalled();
    expect(result.provider).toBe('xotelo');
    expect(result.priceSource).toBe('heatmap');
    expect(result.fromCache).toBe(false);
  });

  it('returns fallback data when live fetch fails and fuzzy cache exists', async () => {
    // Make live fetch fail
    vi.mocked(getHotelRates).mockRejectedValueOnce(new Error('all providers failed'));

    // Seed fuzzy cache so fallback has something to return
    await kv.setWithTTL('latest-rates:g1-d1:USD', {
      result: {
        rates: [{ name: 'Fallback Provider', rate: 130, tax: 10 }],
        currency: 'USD',
        provider: 'Xotelo',
        source: 'xotelo',
        lastCheckedAt: '2026-05-20T00:00:00.000Z',
      },
      cachedAt: '2026-05-20T00:00:00.000Z',
      forDates: { checkIn: '2026-07-15', checkOut: '2026-07-17' },
    }, 7200);

    const result = await getCachedRates({
      hotelKey: 'g1-d1',
      hotelName: 'Test Hotel',
      city: 'Paris',
      // Request dates far from fuzzy cache → fuzzy match skipped → goes to live fetch → fails → fallback
      checkIn: '2026-09-01',
      checkOut: '2026-09-03',
    } as Parameters<typeof getCachedRates>[0]);

    expect(result.freshness).toBe('fallback');
    expect(result.fromCache).toBe(true);
    expect(result.partial).toBe(true);
    expect(result.rates[0].name).toBe('Fallback Provider');
    expect(result.estimatedFromDates).toEqual({ checkIn: '2026-07-15', checkOut: '2026-07-17' });
  });

  it('throws when live fetch fails and no fallback data exists', async () => {
    vi.mocked(getHotelRates).mockRejectedValueOnce(new Error('all providers failed'));

    await expect(getCachedRates({
      hotelKey: 'g1-d1',
      hotelName: 'Test Hotel',
      city: 'Paris',
      checkIn: '2026-09-01',
      checkOut: '2026-09-03',
    } as Parameters<typeof getCachedRates>[0])).rejects.toThrow('all providers failed');
  });

  it('seeds fuzzy date cache from heatmap data', async () => {
    await getCachedHeatmap({ hotelKey: 'g1-d1', checkOut: '2026-06-03' } as Parameters<typeof getCachedHeatmap>[0]);

    // Give the async seeding a tick to complete
    await new Promise((r) => setTimeout(r, 10));

    // Should have seeded latest-rates for the hotel
    const seeded = await kv.get('latest-rates:g1-d1:USD');
    expect(seeded).toBeTruthy();
    expect(seeded.result.rates[0].name).toBe('Xotelo (heatmap)');
    expect(seeded.result.rates[0].rate).toBe(120);
    expect(seeded.forDates).toBeTruthy();
  });
});
