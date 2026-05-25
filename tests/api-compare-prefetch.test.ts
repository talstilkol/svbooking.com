import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/price-cache', () => ({
  getCachedRates: vi.fn(async () => ({
    rates: [{ name: 'Provider A', rate: 100, tax: 20 }],
    currency: 'USD',
    freshness: 'live',
    fromCache: false,
  })),
}));

vi.mock('@/lib/kv', () => ({
  kv: {
    get: vi.fn(async () => null),
    setWithTTL: vi.fn(async () => undefined),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({
    check: vi.fn(async () => ({ success: true, reset: Date.now() + 60000 })),
  })),
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimitResponse: vi.fn((reset: number) =>
    Response.json({ error: 'Rate limit exceeded', reset }, { status: 429 })
  ),
}));

import { GET, buildPrefetchDates, nextFriday } from '@/app/api/compare/prefetch/route';
import { getCachedRates } from '@/lib/price-cache';

function prefetchRequest(hotelKey?: string) {
  const url = hotelKey
    ? `http://localhost:3000/api/compare/prefetch?hotelKey=${hotelKey}`
    : 'http://localhost:3000/api/compare/prefetch';
  return new Request(url);
}

describe('GET /api/compare/prefetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 202 immediately and triggers background cache warming', async () => {
    const response = await GET(prefetchRequest('g187147-d188728'));

    expect(response.status).toBe(202);
    expect(response.headers.get('Cache-Control')).toBe('no-store');

    // Give background promises a tick to fire
    await new Promise((r) => setTimeout(r, 10));

    // Should have called getCachedRates 3 times (weekend, +7d, +14d)
    expect(getCachedRates).toHaveBeenCalledTimes(3);
  });

  it('returns 400 for missing hotelKey', async () => {
    const response = await GET(prefetchRequest());
    expect(response.status).toBe(400);
  });

  it('returns 404 for unknown hotel', async () => {
    const response = await GET(prefetchRequest('g0-d0-invalid'));
    expect(response.status).toBe(404);
  });
});

describe('prefetch date helpers', () => {
  it('nextFriday returns the coming Friday', () => {
    // 2026-05-25 is a Monday
    expect(nextFriday('2026-05-25')).toBe('2026-05-29');

    // 2026-05-29 is a Friday — should return NEXT Friday, not same day
    expect(nextFriday('2026-05-29')).toBe('2026-06-05');

    // 2026-05-31 is a Sunday
    expect(nextFriday('2026-05-31')).toBe('2026-06-05');
  });

  it('buildPrefetchDates returns 3 date ranges', () => {
    const dates = buildPrefetchDates('2026-05-25'); // Monday

    expect(dates).toHaveLength(3);

    // Next Friday (May 29) for 2 nights
    expect(dates[0]).toEqual({ checkIn: '2026-05-29', checkOut: '2026-05-31' });

    // +7 days (June 1) for 2 nights
    expect(dates[1]).toEqual({ checkIn: '2026-06-01', checkOut: '2026-06-03' });

    // +14 days (June 8) for 2 nights
    expect(dates[2]).toEqual({ checkIn: '2026-06-08', checkOut: '2026-06-10' });
  });
});
