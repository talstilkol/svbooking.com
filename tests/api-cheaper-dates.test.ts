import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();

vi.mock('@/lib/kv', () => ({
  kv: {
    get: vi.fn(async (key: string) => store.get(key) || null),
    setWithTTL: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
  },
}));

vi.mock('@/lib/hotels-catalog', () => ({
  findHotel: vi.fn((hotelKey: string) => (
    hotelKey === 'g187147-d188732'
      ? { hotelKey, name: 'Le Meurice', city: 'Paris', country: 'France' }
      : null
  )),
}));

vi.mock('@/lib/price-cache', () => ({
  getCachedRates: vi.fn(async () => ({
    rates: [{ provider: 'Booking.com', total: 240, source: 'xotelo' }],
    source: 'xotelo',
    freshness: 'live',
  })),
  getCachedHeatmap: vi.fn(async () => ({
    data: [{ date: '2026-06-01', price: 210 }],
  })),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({
    check: vi.fn(async () => ({ success: true, reset: Date.now() + 60000 })),
  })),
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimitResponse: vi.fn((reset: number) => Response.json({ error: 'Rate limit exceeded', reset }, { status: 429 })),
}));

import { GET } from '@/app/api/cheaper-dates/route';

function request(query: string) {
  return new Request(`http://localhost:3000/api/cheaper-dates?${query}`);
}

describe('GET /api/cheaper-dates', () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it('rejects unknown hotel keys instead of creating placeholder hotel data', async () => {
    const response = await GET(request('hotelKey=g0-d0&checkIn=2026-06-01&checkOut=2026-06-03'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Hotel not found');
  });

  it('returns calendar heatmap as source observations only', async () => {
    const response = await GET(request('hotelKey=g187147-d188732&checkIn=2026-06-01&checkOut=2026-06-03&mode=heatmap'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.hotel.name).toBe('Le Meurice');
    expect(body.hasRealData).toBe(true);
    expect(body.bookingProvider).toBe(false);
    expect(body.dataPolicy).toBe('verified-provider-or-source-observations-only');
    expect(body.heatmap[0]).toEqual(expect.objectContaining({
      date: '2026-06-01',
      price: 210,
      priceSource: 'xotelo-heatmap',
      bookingProvider: false,
    }));
  });
});
