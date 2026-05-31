import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCachedRates: vi.fn(),
  getVerifiedRateObservations: vi.fn(),
  findHotel: vi.fn(),
  limiterCheck: vi.fn(),
}));

vi.mock('@/lib/price-cache', () => ({
  getCachedRates: mocks.getCachedRates,
}));

vi.mock('@/lib/cheaper-dates', () => ({
  getVerifiedRateObservations: mocks.getVerifiedRateObservations,
}));

vi.mock('@/lib/hotels-catalog', () => ({
  findHotel: mocks.findHotel,
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({
    check: mocks.limiterCheck,
  })),
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimitResponse: vi.fn((reset: number) => Response.json({ error: 'Rate limit exceeded', reset }, { status: 429 })),
}));

import { handlePriceRecommendationRequest } from '@/lib/agent-price-recommendation';

function request() {
  return new Request('http://localhost:3000/api/agents/price-recommendation?hotelKey=g1-d1&checkIn=2026-06-01&checkOut=2026-06-03');
}

describe('agent price recommendation handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findHotel.mockReturnValue({
      hotelKey: 'g1-d1',
      name: 'Verified Hotel',
      city: 'Paris',
      country: 'France',
    });
    mocks.limiterCheck.mockResolvedValue({ success: true, reset: Date.now() + 60_000 });
  });

  it('uses result currency when verified observations omit their own currency', async () => {
    mocks.getCachedRates.mockResolvedValueOnce({
      provider: 'provider-registry',
      source: 'provider-registry',
      currency: 'EUR',
      rates: [],
    });
    mocks.getVerifiedRateObservations.mockReturnValueOnce([
      { provider: 'Provider A', total: 120, rate: 100, tax: 20 },
    ]);

    const response = await handlePriceRecommendationRequest(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ranked[0]).toMatchObject({
      provider: 'Provider A',
      currency: 'EUR',
      scoreBasis: 'verified-price',
    });
  });

  it('falls back to USD and zero savings percentage when verified totals are zero', async () => {
    mocks.getCachedRates.mockResolvedValueOnce({
      provider: 'provider-registry',
      source: 'provider-registry',
      rates: [],
    });
    mocks.getVerifiedRateObservations.mockReturnValueOnce([
      { provider: 'Provider A', total: 0, rate: 0, tax: 0 },
    ]);

    const response = await handlePriceRecommendationRequest(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.currency).toBe('USD');
    expect(body.savingsPct).toBe(0);
    expect(body.ranked[0].currency).toBe('USD');
  });
});
