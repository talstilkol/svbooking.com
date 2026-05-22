import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/price-cache', () => ({
  getCachedRates: vi.fn(async () => ({
    rates: [
      {
        provider: 'Booking.com',
        code: 'bookingcom',
        rate: 100,
        tax: 20,
        total: 120,
        currency: 'USD',
        source: 'xotelo',
        freshness: 'live',
        partial: false,
        deepLink: 'https://www.booking.com/hotel/example.html',
        taxesIncluded: true,
        priceAccuracyState: 'unobserved',
        lastCheckedAt: '2026-05-14T12:00:00.000Z',
      },
      {
        name: 'Provider Without Link',
        code: 'nolink',
        rate: 130,
        tax: 0,
      },
    ],
    currency: 'USD',
    provider: 'Xotelo',
    source: 'xotelo',
    freshness: 'live',
    partial: false,
    fromCache: false,
    lastCheckedAt: '2026-05-14T12:00:00.000Z',
    chk_in: '2026-06-01',
    chk_out: '2026-06-03',
  })),
}));

vi.mock('@/lib/kv', () => ({
  kv: {
    get: vi.fn(async () => []),
    setWithTTL: vi.fn(async () => undefined),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({
    check: vi.fn(async () => ({ success: true, reset: Date.now() + 60000 })),
  })),
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimitResponse: vi.fn((reset: number) => Response.json({ error: 'Rate limit exceeded', reset }, { status: 429 })),
}));

import { GET } from '@/app/api/compare/route';
import { getCachedRates } from '@/lib/price-cache';

function datedCompareRequest() {
  return new Request('http://localhost:3000/api/compare?hotelKey=g187147-d188728&checkIn=2026-06-01&checkOut=2026-06-03');
}

describe('GET /api/compare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the unified price cache and returns public rate metadata', async () => {
    const response = await GET(datedCompareRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getCachedRates).toHaveBeenCalledWith(expect.objectContaining({
      hotelKey: 'g187147-d188728',
      hotelName: 'Le Meurice',
      city: 'Paris',
      currency: 'USD',
    }));
    expect(body.providerCount).toBe(2);
    expect(body.cheapest.provider).toBe('Booking.com');
    expect(body.fromCache).toBe(false);
    expect(body.freshness).toBe('live');
    expect(body.rates[0]).toEqual(expect.objectContaining({
      provider: 'Booking.com',
      source: 'xotelo',
      freshness: 'live',
      partial: false,
      deepLink: 'https://www.booking.com/hotel/example.html',
      taxesIncluded: true,
      priceAccuracyState: 'unobserved',
    }));
  });

  it('does not fabricate deep links for providers that did not return one', async () => {
    const response = await GET(datedCompareRequest());
    const body = await response.json();
    const noLinkRate = body.rates.find((rate: { provider: string }) => rate.provider === 'Provider Without Link');

    expect(noLinkRate).toBeDefined();
    expect(noLinkRate.deepLink).toBeNull();
  });

  it('marks hotel-not-found errors as no-store', async () => {
    const response = await GET(new Request('http://localhost:3000/api/compare?hotelKey=g0-d0'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body.error).toBe('Hotel not found');
  });
});
