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

  it('always includes top popular hotels regardless of cohort rotation', () => {
    // With high popularity data and a large enough limit, top hotels appear in every cohort
    const popularity = { 'g3-d1': 100, 'g2-d1': 50 };
    // limit=3 with 4 hotels: Math.floor(3*0.3)=0 → too small for always-warm
    // So we test with a limit of 4 which can hold 1 always-warm (floor(4*0.3)=1)
    const cohort0 = selectPriorityCatalogHotels(mockedHotels, 4, 0, popularity);
    const cohort1 = selectPriorityCatalogHotels(mockedHotels, 4, 1, popularity);

    // With limit=4 and only 4 hotels, both cohorts return all hotels
    expect(cohort0).toHaveLength(4);
    expect(cohort1).toHaveLength(4);

    // Most popular hotel (g3-d1) should appear first in both cohorts
    expect(cohort0[0].hotelKey).toBe('g3-d1');
    expect(cohort1[0].hotelKey).toBe('g3-d1');
  });

  it('without popularity data skips always-warm tier', () => {
    // No popularity → pure cohort rotation (backwards compatible)
    const cohort0 = selectPriorityCatalogHotels(mockedHotels, 2, 0, {});
    const cohort1 = selectPriorityCatalogHotels(mockedHotels, 2, 1, {});

    // Different cohorts should give different hotels (deterministic rotation)
    expect(cohort0.map((h) => h.hotelKey)).not.toEqual(cohort1.map((h) => h.hotelKey));
  });

  it('builds dated provider-rate work items with static + weekend offsets', () => {
    // 2026-05-14 is a Thursday → next Friday is May 15 (1 day), second Friday is May 22 (8 days)
    // Static offsets: 3, 7, 14, 30 → combined unique with weekends: 1, 3, 7, 8, 14, 30 = 6 offsets
    const workItems = buildCatalogDatedRateWorkItems({
      today: '2026-05-14',
      hotels: mockedHotels,
      limit: 2,
      cohort: 0,
    } as Parameters<typeof buildCatalogDatedRateWorkItems>[0]);

    // 2 hotels × 6 unique offsets = 12 work items
    expect(workItems).toHaveLength(12);

    // Check that weekend Friday (May 15) is included
    const checkIns = workItems.filter((w) => w.hotelKey === 'g1-d1').map((w) => w.checkIn);
    expect(checkIns).toContain('2026-05-15'); // next Friday
    expect(checkIns).toContain('2026-05-22'); // second Friday (also 8 days)
    expect(checkIns).toContain('2026-05-17'); // +3 days
    expect(checkIns).toContain('2026-05-21'); // +7 days

    expect(workItems[0]).toMatchObject({
      source: 'catalog-priority',
      hotelKey: 'g1-d1',
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
      alwaysWarmHotels: 0,
    });
    // Work items = 1 alert + 2 hotels × (4 static + 2 weekend offsets, deduped).
    // Exact count depends on what day the test simulates — check structure not exact count.
    expect(body.result.datedRates.totalRequests).toBeGreaterThanOrEqual(9);
    expect(body.result.datedRates.bySource['active-price-alert']).toBe(1);
    expect(body.result.datedRates.bySource['catalog-priority']).toBeGreaterThanOrEqual(8);
    // Heatmaps still use HEATMAP_CHECK_OUT_OFFSETS (from static offsets only)
    expect(body.result.heatmaps.totalRequests).toBe(8);
    expect(getCachedRates).toHaveBeenCalledTimes(body.result.datedRates.totalRequests);
    expect(getCachedRates).toHaveBeenNthCalledWith(1, expect.objectContaining({
      hotelKey: 'g3-d1',
      checkIn: '2026-07-01',
      checkOut: '2026-07-04',
      currency: 'EUR',
    }));
    expect(getCachedHeatmap).toHaveBeenCalledTimes(8);
  });
});
