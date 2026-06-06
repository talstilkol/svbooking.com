import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/price-cache', () => ({
  getCachedRates: vi.fn(),
  getCachedHeatmap: vi.fn(),
}));

import { findCheaperDates, getHeatmapCalendar, getVerifiedRateObservations } from '@/lib/cheaper-dates';
import { getCachedHeatmap, getCachedRates } from '@/lib/price-cache';

describe('cheaper date price intelligence', () => {
  beforeEach(() => {
    vi.mocked(getCachedHeatmap).mockReset();
    vi.mocked(getCachedRates).mockReset();
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

  it('filters blocked sources, heatmap price sources, and normalizes negative taxes', () => {
    const rates = getVerifiedRateObservations({
      rates: [
        { provider: 'Booking.com', rate: 100, tax: -20, currency: 'US', source: 'provider-registry' },
        { provider: 'Tripadvisor', rate: 105, total: 110, tax: 'not-a-number', currency: 'gbp', source: 'provider-registry' },
        { provider: 'Expedia', total: 120, source: 'unknown' },
        { provider: 'Agoda', total: 130, priceSource: 'heatmap', source: 'provider-registry' },
        { provider: '', total: 140, source: 'provider-registry' },
      ],
      currency: 'not-a-currency',
      source: 'provider-registry',
    });

    expect(rates).toEqual([
      expect.objectContaining({
        provider: 'Booking.com',
        rate: 100,
        tax: 0,
        total: 100,
        currency: 'USD',
        source: 'provider-registry',
      }),
      expect.objectContaining({
        provider: 'Tripadvisor',
        rate: 105,
        tax: 0,
        total: 110,
        currency: 'GBP',
      }),
    ]);
    expect(getVerifiedRateObservations(null)).toEqual([]);
  });

  it('keeps provider-returned totals when tax/source metadata is unavailable', () => {
    expect(getVerifiedRateObservations({
      rates: [
        { name: 'Direct Provider', total: 101, currency: 'cad' },
      ],
      currency: 'eur',
    })).toEqual([
      expect.objectContaining({
        provider: 'Direct Provider',
        rate: 101,
        tax: 0,
        total: 101,
        source: null,
        currency: 'CAD',
      }),
    ]);

    expect(getVerifiedRateObservations({
      rates: [
        { provider: 'Provider From Result', rate: 90 },
      ],
      provider: 'Registry Provider',
    })).toEqual([
      expect.objectContaining({
        provider: 'Provider From Result',
        source: 'Registry Provider',
        total: 90,
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

  it('returns an empty heatmap calendar when provider payloads are empty or unstructured', async () => {
    vi.mocked(getCachedHeatmap)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({});

    await expect(getHeatmapCalendar({
      hotelKey: 'g187147-d188732',
      checkOut: '2026-06-03',
      today: '2026-06-01',
    })).resolves.toEqual([]);
    await expect(getHeatmapCalendar({
      hotelKey: 'g187147-d188732',
      checkOut: '2026-06-03',
      today: '2026-06-01',
    })).resolves.toEqual([]);
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

  it('chooses a later cheaper heatmap bracket while accepting rate and min_rate fields', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
    vi.mocked(getCachedRates).mockResolvedValue({
      rates: [{ provider: 'Booking.com', total: 600, currency: 'USD', source: 'provider-registry' }],
      source: 'provider-registry',
    });
    vi.mocked(getCachedHeatmap).mockImplementation(async ({ checkOut }) => {
      const offsetDays = Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse('2026-06-12T00:00:00Z')) / 86400000);
      const abs = Math.abs(offsetDays);
      const target = new Date(`${checkOut}T00:00:00Z`);
      target.setUTCDate(target.getUTCDate() - 2);
      const checkIn = target.toISOString().slice(0, 10);
      if (abs <= 3) {
        return { data: [{ chk_in: checkIn, rate: 250 }] };
      }
      if (abs <= 7) {
        return { data: [{ chk_in: checkIn, rate: 150 }] };
      }
      return { data: [{ date: checkIn, min_rate: 90 }] };
    });

    const result = await findCheaperDates('g187147-d188732', '2026-06-10', '2026-06-12');

    expect(result.method).toBe('heatmap-source-observations');
    expect(result.alternatives.near[0].price).toBe(500);
    expect(result.alternatives.week[0].price).toBe(300);
    expect(result.cheapestOverall).toEqual(expect.objectContaining({
      price: 180,
      pricePerNight: 90,
      source: 'xotelo-heatmap',
    }));
  });

  it('marks cheaper-date output unavailable when no verified observations exist', async () => {
    vi.mocked(getCachedRates).mockResolvedValue({
      rates: [{ provider: 'unknown', total: 99 }],
      source: 'xotelo',
    });
    vi.mocked(getCachedHeatmap).mockResolvedValue({
      data: [
        { date: '2026-06-02', price: 0 },
      ],
    });

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

  it('uses provider fallback without inventing savings when the original rate is unavailable', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
    vi.mocked(getCachedHeatmap).mockResolvedValue({ data: [] });
    vi.mocked(getCachedRates).mockImplementation(async ({ checkIn }) => {
      if (checkIn === '2026-06-07') {
        return {
          rates: [{ provider: 'Expedia', total: 250, currency: 'USD', source: 'provider-registry' }],
          source: 'provider-registry',
        };
      }
      return { rates: [], source: 'provider-registry' };
    });

    const result = await findCheaperDates('g187147-d188732', '2026-06-10', '2026-06-12');

    expect(result).toMatchObject({
      originalPrice: null,
      method: 'provider-rates-fallback',
      hasRealData: true,
    });
    expect(result.cheapestOverall).toEqual(expect.objectContaining({
      checkIn: '2026-06-07',
      price: 250,
      savings: 0,
      savingsPct: 0,
      bookingProvider: true,
    }));
  });

  it('stops provider fallback batches when the total time budget expires mid-loop', async () => {
    let nowMs = 1;
    let rateCallCount = 0;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
    vi.mocked(getCachedHeatmap).mockResolvedValue({ data: [] });
    vi.mocked(getCachedRates).mockImplementation(async () => {
      rateCallCount += 1;
      if (rateCallCount > 1) {
        nowMs = 45_002;
      }
      return { rates: [], source: 'provider-registry' };
    });

    try {
      const result = await findCheaperDates('g187147-d188732', '2026-06-10', '2026-06-12');

      expect(result.timedOut).toBe(true);
      expect(result.method).toBe('provider-rates-fallback');
      expect(result.hasRealData).toBe(false);
    } finally {
      nowSpy.mockRestore();
    }
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

  it('returns unavailable immediately when the hotel key is missing', async () => {
    const result = await findCheaperDates('', '2026-06-01', '2026-06-03');

    expect(result).toMatchObject({
      hasRealData: false,
      method: 'unavailable',
      availabilityReason: 'Missing hotel key for cheaper-date lookup',
    });
    expect(getCachedRates).not.toHaveBeenCalled();
    expect(getCachedHeatmap).not.toHaveBeenCalled();
  });

  it('continues with heatmap observations when the original provider-rate lookup fails', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
    vi.mocked(getCachedRates).mockRejectedValue(new Error('provider unavailable'));
    vi.mocked(getCachedHeatmap).mockImplementation(async ({ checkOut }) => {
      const target = new Date(`${checkOut}T00:00:00Z`);
      target.setUTCDate(target.getUTCDate() - 2);
      return { data: [{ date: target.toISOString().slice(0, 10), price: 100 }] };
    });

    const result = await findCheaperDates('g187147-d188732', '2026-06-10', '2026-06-12');

    expect(result.originalPrice).toBeNull();
    expect(result.hasRealData).toBe(true);
    expect(result.method).toBe('heatmap-source-observations');
    expect(result.cheapestOverall).toEqual(expect.objectContaining({
      price: 200,
      savings: 0,
      savingsPct: 0,
      bookingProvider: false,
    }));
  });

  it('uses provider fallback batches even when some provider calls reject', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
    vi.mocked(getCachedHeatmap).mockRejectedValue(new Error('heatmap unavailable'));
    vi.mocked(getCachedRates).mockImplementation(async ({ checkIn }) => {
      if (checkIn === '2026-06-10') {
        return {
          rates: [{ provider: 'Booking.com', total: 300, currency: 'USD', source: 'provider-registry' }],
          source: 'provider-registry',
        };
      }
      if (checkIn === '2026-06-07') {
        throw new Error('candidate unavailable');
      }
      if (checkIn === '2026-06-08') {
        return {
          rates: [{ provider: 'Expedia', total: 250, currency: 'USD', source: 'provider-registry' }],
          source: 'provider-registry',
        };
      }
      return { rates: [], source: 'provider-registry' };
    });

    const result = await findCheaperDates('g187147-d188732', '2026-06-10', '2026-06-12');

    expect(result.method).toBe('provider-rates-fallback');
    expect(result.cheapestOverall).toEqual(expect.objectContaining({
      checkIn: '2026-06-08',
      price: 250,
      provider: 'Expedia',
      bookingProvider: true,
    }));
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
      hotelKey: '',
      checkOut: '2026-06-03',
      today: '2026-06-01',
    })).resolves.toEqual([]);

    await expect(getHeatmapCalendar({
      hotelKey: 'g187147-d188732',
      checkOut: '2026-02-30',
      today: 'not-a-date',
    })).resolves.toEqual([]);

    expect(getCachedHeatmap).not.toHaveBeenCalled();
  });

  it('accepts heatmap calendar arrays and daily payloads while normalizing bad today input', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
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

  it('accepts heatmap calendar rates payloads and rounds observed prices', async () => {
    vi.mocked(getCachedHeatmap).mockResolvedValueOnce({
      rates: [
        { chk_in: '2026-06-05', min_rate: 230.126 },
        { date: '2026-06-06', price: null },
      ],
    });

    await expect(getHeatmapCalendar({
      hotelKey: 'g187147-d188732',
      checkOut: '2026-06-07',
      today: '2026-06-01',
    })).resolves.toEqual([
      expect.objectContaining({
        date: '2026-06-05',
        price: 230.13,
        bookingProvider: false,
      }),
    ]);
  });
});
