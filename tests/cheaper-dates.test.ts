import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/price-cache', () => ({
  getCachedRates: vi.fn(),
  getCachedHeatmap: vi.fn(),
}));

import { findCheaperDates, getHeatmapCalendar, getVerifiedRateObservations } from '@/lib/cheaper-dates';
import { getCachedHeatmap, getCachedRates } from '@/lib/price-cache';

describe('cheaper date price intelligence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses only verified provider rates for provider-backed observations', () => {
    const rates = getVerifiedRateObservations({
      rates: [
        { provider: 'unknown', total: 70 },
        { provider: 'Expedia', total: 0 },
        { provider: 'Booking.com', total: 120, source: 'xotelo', freshness: 'live' },
        { name: 'Tripadvisor', rate: 115, tax: 15, source: 'xotelo' },
      ],
      source: 'xotelo',
    });

    expect(rates).toEqual([
      expect.objectContaining({ provider: 'Booking.com', total: 120 }),
      expect.objectContaining({ provider: 'Tripadvisor', total: 130 }),
    ]);
  });

  it('sanitizes provider currencies and deep links before reuse by public APIs', () => {
    const rates = getVerifiedRateObservations({
      rates: [
        { provider: 'Booking.com', total: 120, currency: 'eur', deepLink: 'https://www.booking.com/hotel/fr/le-meurice.html' },
        { provider: 'Expedia', total: 130, currency: 'US', deepLink: 'javascript:alert(1)' },
        { provider: 'Agoda', total: 140, currency: 'gbp', deepLink: 'http://www.agoda.com/rooms' },
        { provider: 'Trip.com', total: 150, currency: 'usd', deepLink: 'https://127.0.0.1/internal' },
      ],
      currency: 'usd',
      source: 'provider-registry',
    });

    expect(rates).toEqual([
      expect.objectContaining({
        provider: 'Booking.com',
        currency: 'EUR',
        deepLink: 'https://www.booking.com/hotel/fr/le-meurice.html',
      }),
      expect.objectContaining({
        provider: 'Expedia',
        currency: 'USD',
        deepLink: null,
      }),
      expect.objectContaining({
        provider: 'Agoda',
        currency: 'GBP',
        deepLink: null,
      }),
      expect.objectContaining({
        provider: 'Trip.com',
        currency: 'USD',
        deepLink: null,
      }),
    ]);
  });

  it('returns heatmap calendar entries as source observations, not booking offers', async () => {
    vi.mocked(getCachedHeatmap).mockResolvedValueOnce({
      data: [
        { date: '2026-06-01', price: 220 },
        { date: '2026-06-02', price: 0 },
        { date: '2026-02-30', price: 180 },
        { date: '2026-05-01', price: 150 },
      ],
    });

    const points = await getHeatmapCalendar({
      hotelKey: 'g187147-d188732',
      checkOut: '2026-06-03',
      today: '2026-05-15',
    });

    expect(points).toEqual([
      {
        date: '2026-06-01',
        price: 220,
        source: 'xotelo-heatmap',
        priceSource: 'xotelo-heatmap',
        priceSourceLabel: 'Xotelo heatmap observation',
        bookingProvider: false,
      },
    ]);
  });

  it('builds cheaper-date alternatives from verified heatmap observations', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
    vi.mocked(getCachedRates).mockResolvedValue({
      rates: [{ provider: 'Booking.com', total: 300, currency: 'USD', source: 'provider-registry' }],
      source: 'provider-registry',
    });
    vi.mocked(getCachedHeatmap).mockImplementation(async ({ checkOut }) => {
      const target = new Date(`${checkOut}T00:00:00Z`);
      target.setUTCDate(target.getUTCDate() - 2);
      return { data: [{ date: target.toISOString().slice(0, 10), price: 120 }] };
    });

    const result = await findCheaperDates('g187147-d188732', '2026-06-10', '2026-06-12');

    expect(result).toMatchObject({
      originalPrice: 300,
      originalProvider: 'Booking.com',
      hasRealData: true,
      method: 'heatmap-source-observations',
      dataPolicy: 'verified-provider-or-source-observations-only',
    });
    expect(result.cheapestOverall).toEqual(expect.objectContaining({
      price: 240,
      source: 'xotelo-heatmap',
      bookingProvider: false,
      savings: 60,
      savingsPct: 20,
    }));
    expect(result.alternatives.near.length).toBeGreaterThan(0);
    expect(result.alternatives.week.length).toBeGreaterThan(0);
    expect(result.alternatives.month.length).toBeGreaterThan(0);
  });

  it('marks cheaper-date output unavailable when no verified observations exist', async () => {
    vi.mocked(getCachedRates).mockResolvedValue({
      rates: [{ provider: 'unknown', total: 99 }],
      source: 'xotelo',
    });
    vi.mocked(getCachedHeatmap).mockResolvedValue({ data: [] });

    const result = await findCheaperDates('g187147-d188732', '2026-06-01', '2026-06-03');

    expect(result.hasRealData).toBe(false);
    expect(result.dataPolicy).toBe('verified-provider-or-source-observations-only');
    expect(result.originalPrice).toBeNull();
    expect(result.cheapestOverall).toBeNull();
  });

  it('falls back to verified provider rates when heatmaps have no usable observations', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
    vi.mocked(getCachedHeatmap).mockResolvedValue({ data: [] });
    vi.mocked(getCachedRates).mockImplementation(async ({ checkIn }) => {
      if (checkIn === '2026-06-10') {
        return {
          rates: [{ provider: 'Booking.com', total: 300, currency: 'USD', source: 'provider-registry' }],
          source: 'provider-registry',
        };
      }
      if (checkIn === '2026-06-07') {
        return {
          rates: [{
            provider: 'Expedia',
            total: 240,
            currency: 'USD',
            source: 'provider-registry',
            freshness: 'live',
            partial: false,
            lastCheckedAt: '2026-06-01T00:00:00.000Z',
            priceAccuracyState: 'unobserved',
          }],
          source: 'provider-registry',
        };
      }
      return {
        rates: [{ provider: 'unknown', total: 999 }],
        source: 'provider-registry',
      };
    });

    const result = await findCheaperDates('g187147-d188732', '2026-06-10', '2026-06-12');

    expect(result).toMatchObject({
      originalPrice: 300,
      method: 'provider-rates-fallback',
      hasRealData: true,
    });
    expect(result.cheapestOverall).toEqual(expect.objectContaining({
      checkIn: '2026-06-07',
      checkOut: '2026-06-09',
      price: 240,
      provider: 'Expedia',
      priceSource: 'provider-rate',
      bookingProvider: true,
      savings: 60,
      savingsPct: 20,
    }));
  });

  it('reports timeout when the heatmap budget is already exhausted', async () => {
    let nowMs = 1;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
    vi.mocked(getCachedRates).mockImplementation(async () => {
      nowMs = 45_002;
      return {
        rates: [],
        source: 'provider-registry',
      };
    });
    vi.mocked(getCachedHeatmap).mockResolvedValue({ data: [{ date: '2026-06-09', price: 120 }] });

    try {
      const result = await findCheaperDates('g187147-d188732', '2026-06-10', '2026-06-12');

      expect(result.timedOut).toBe(true);
      expect(result.method).toBe('unavailable');
      expect(result.hasRealData).toBe(false);
      expect(getCachedHeatmap).not.toHaveBeenCalled();
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('fails closed for invalid direct cheaper-date calls before provider access', async () => {
    const result = await findCheaperDates('g187147-d188732', '2026-02-30', '2026-06-03');

    expect(result).toMatchObject({
      hasRealData: false,
      method: 'unavailable',
      originalPrice: null,
      cheapestOverall: null,
      availabilityReason: 'Invalid date input for cheaper-date lookup',
    });
    expect(result.alternatives).toEqual({ near: [], week: [], month: [] });
    expect(getCachedRates).not.toHaveBeenCalled();
    expect(getCachedHeatmap).not.toHaveBeenCalled();
  });

  it('fails closed for reversed direct cheaper-date calls before provider access', async () => {
    const result = await findCheaperDates('g187147-d188732', '2026-06-03', '2026-06-01');

    expect(result).toMatchObject({
      hasRealData: false,
      method: 'unavailable',
      originalDates: { checkIn: '2026-06-03', checkOut: '2026-06-01', nights: -2 },
      availabilityReason: 'checkIn must be before checkOut for cheaper-date lookup',
    });
    expect(getCachedRates).not.toHaveBeenCalled();
    expect(getCachedHeatmap).not.toHaveBeenCalled();
  });

  it('skips heatmap calendar provider access when direct input dates are invalid', async () => {
    await expect(getHeatmapCalendar({
      hotelKey: 'g187147-d188732',
      checkOut: '2026-02-30',
      today: 'not-a-date',
    })).resolves.toEqual([]);

    expect(getCachedHeatmap).not.toHaveBeenCalled();
  });

  it('accepts heatmap calendar arrays and daily payloads while normalizing bad today input', async () => {
    vi.mocked(getCachedHeatmap)
      .mockResolvedValueOnce([
        { chk_in: '2026-06-04', min_rate: 210 },
        { chk_in: '2026-06-03', min_rate: 220 },
      ])
      .mockResolvedValueOnce({
        daily: [
          { date: '2026-06-05', rate: 230 },
          { date: '2026-06-06', rate: 'bad-rate' },
        ],
      });

    await expect(getHeatmapCalendar({
      hotelKey: 'g187147-d188732',
      checkOut: '2026-06-07',
      today: 'not-a-date',
    })).resolves.toEqual([
      expect.objectContaining({ date: '2026-06-03', price: 220 }),
      expect.objectContaining({ date: '2026-06-04', price: 210 }),
    ]);
    await expect(getHeatmapCalendar({
      hotelKey: 'g187147-d188732',
      checkOut: '2026-06-07',
      today: '2026-06-01',
    })).resolves.toEqual([
      expect.objectContaining({ date: '2026-06-05', price: 230 }),
    ]);
  });
});
