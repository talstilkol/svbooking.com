import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockedHotels } = vi.hoisted(() => ({
  mockedHotels: [
  { hotelKey: 'g1-d1', name: 'Alpha London', city: 'London', country: 'UK', image: '' },
  { hotelKey: 'g1-d2', name: 'Beta London', city: 'London', country: 'UK', image: '' },
  { hotelKey: 'g2-d1', name: 'Cairo One', city: 'Cairo', country: 'Egypt', image: '' },
  { hotelKey: 'g3-d1', name: 'Paris One', city: 'Paris', country: 'France', image: '' },
  ],
}));

vi.mock('@/lib/agent-utils', () => ({
  AGENT_NAMES: { PRICE_CACHE: 'price-cache' },
  verifyCronAuth: vi.fn(() => ({ authorized: true })),
  runAgent: vi.fn(async (name: string, fn: () => Promise<unknown>) => ({
    status: 'completed',
    name,
    result: await fn(),
  })),
  withConcurrency: vi.fn(async (items: unknown[], _concurrency: number, fn: (item: unknown) => Promise<unknown>) => {
    const results = [];
    for (const item of items) {
      results.push({ status: 'fulfilled', value: await fn(item) });
    }
    return results;
  }),
}));

vi.mock('@/lib/hotels-catalog', () => ({
  HOTELS: mockedHotels,
  findHotel: vi.fn((hotelKey: string) => mockedHotels.find((hotel) => hotel.hotelKey === hotelKey) || null),
}));

vi.mock('@/lib/price-cache', () => ({
  getCachedRates: vi.fn(async (params: { hotelKey: string }) => ({
    fromCache: params.hotelKey === 'g1-d2',
    freshness: params.hotelKey === 'g1-d2' ? 'fresh' : 'live',
    rates: [],
  })),
  getCachedHeatmap: vi.fn(async () => ({
    fromCache: false,
    priceSource: 'heatmap',
  })),
}));

vi.mock('@/lib/kv', () => {
  const store = new Map<string, unknown>();
  return {
    __store: store,
    kv: {
      get: vi.fn(async (key: string) => store.get(key) || null),
    },
  };
});

import { GET, buildCatalogDatedRateWorkItems, selectPriorityCatalogHotels } from '@/app/api/agents/auto/price-cache/route';
import { getCachedHeatmap, getCachedRates } from '@/lib/price-cache';
import { PRICE_ALERT_USER_INDEX_KEY, userDataKey } from '@/lib/user-data';

describe('price cache agent', () => {
  beforeEach(async () => {
    const mod = await import('@/lib/kv') as Record<string, unknown>;
    (mod.__store as Map<string, unknown>).clear();
    vi.clearAllMocks();
  });

  it('selects catalog hotels deterministically by observed catalog density', () => {
    const selected = selectPriorityCatalogHotels(mockedHotels, 3, 0, {});

    expect(selected.map((hotel) => hotel.hotelKey)).toEqual(['g1-d1', 'g1-d2', 'g2-d1']);
  });

  it('prioritizes popular hotels over city density', () => {
    const popularity = { 'g3-d1': 50, 'g2-d1': 30 };
    const selected = selectPriorityCatalogHotels(mockedHotels, 3, 0, popularity);

    // Paris One (50 requests) and Cairo One (30 requests) should come first
    expect(selected[0].hotelKey).toBe('g3-d1');
    expect(selected[1].hotelKey).toBe('g2-d1');
  });

  it('builds dated provider-rate work items instead of heatmap-only work', () => {
    const workItems = buildCatalogDatedRateWorkItems({
      today: '2026-05-14',
      hotels: mockedHotels,
      limit: 2,
      cohort: 0,
    } as Parameters<typeof buildCatalogDatedRateWorkItems>[0]);

    // 2 hotels × 4 offsets (3, 7, 14, 30 days) = 8 work items
    expect(workItems).toHaveLength(8);
    // First item uses the 3-day offset
    expect(workItems[0]).toMatchObject({
      source: 'catalog-priority',
      hotelKey: 'g1-d1',
      checkIn: '2026-05-17',
      checkOut: '2026-05-19',
      currency: 'USD',
    });
  });

  it('prewarms active alert rates before catalog rates and keeps heatmaps separate', async () => {
    const mod = await import('@/lib/kv') as Record<string, unknown>;
    const store = mod.__store as Map<string, unknown>;
    store.set(PRICE_ALERT_USER_INDEX_KEY, ['user_1']);
    store.set(userDataKey('user_1', 'priceAlerts'), [{
      id: 'h_alert',
      status: 'active',
      hotelKey: 'g3-d1',
      checkIn: '2026-07-01',
      checkOut: '2026-07-04',
      currency: 'EUR',
    }]);

    const response = await GET(new Request('http://localhost:3000/api/agents/auto/price-cache?catalogLimit=2&heatmapLimit=2&cohort=0', {
      headers: { host: 'localhost:3000' },
    }));
    const body = await response!.json();

    expect(response!.status).toBe(200);
    expect(response!.headers.get('Cache-Control')).toBe('no-store');
    expect(body.result.mode).toBe('dated-provider-rates-plus-heatmap-price-sources');
    expect(body.result.config).toEqual({
      catalogDatedHotelLimit: 2,
      heatmapHotelLimit: 2,
      cohort: 0,
      totalCohorts: 2,
    });
    // 1 alert + 2 hotels × 4 offsets = 9 dated, 2 hotels × 4 offsets = 8 heatmaps
    expect(body.result.datedRates.totalRequests).toBe(9);
    expect(body.result.datedRates.bySource).toEqual({
      'active-price-alert': 1,
      'catalog-priority': 8,
    });
    expect(body.result.heatmaps.totalRequests).toBe(8);
    expect(getCachedRates).toHaveBeenCalledTimes(9);
    expect(getCachedRates).toHaveBeenNthCalledWith(1, expect.objectContaining({
      hotelKey: 'g3-d1',
      checkIn: '2026-07-01',
      checkOut: '2026-07-04',
      currency: 'EUR',
    }));
    expect(getCachedHeatmap).toHaveBeenCalledTimes(8);
  });
});
