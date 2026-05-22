import { beforeEach, describe, expect, it, vi } from 'vitest';

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
});
