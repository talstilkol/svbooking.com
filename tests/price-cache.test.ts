import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/kv', () => {
  const store = new Map<string, unknown>();
  return {
    __store: store,
    kv: {
      get: vi.fn(async (key: string) => store.get(key) || null),
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
import { getCachedHeatmap, getCachedRates } from '@/lib/price-cache';

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
    });

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
    });

    expect(result.fromCache).toBe(true);
    expect(result.freshness).toBe('stale');
    expect(result.partial).toBe(true);
    expect(result.rates[0].name).toBe('Cached Provider');
  });

  it('keeps heatmap data labeled as a price source, not a booking provider', async () => {
    const result = await getCachedHeatmap({ hotelKey: 'g1-d1', checkOut: '2026-06-03' });

    expect(getHeatmap).toHaveBeenCalled();
    expect(result.provider).toBe('xotelo');
    expect(result.priceSource).toBe('heatmap');
    expect(result.fromCache).toBe(false);
  });
});
