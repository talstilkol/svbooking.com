import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/hotels-catalog', () => ({
  findHotel: vi.fn(),
  getHotelsByCountry: vi.fn(() => []),
}));

vi.mock('@/lib/price-cache', () => ({
  getCachedRates: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({
    check: vi.fn(async () => ({ success: true, reset: Date.now() + 60000 })),
  })),
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimitResponse: vi.fn((reset: number) => Response.json({ error: 'Rate limit exceeded', reset }, { status: 429 })),
}));

import { POST } from '@/app/api/agents/recommendations/route';
import { findHotel } from '@/lib/hotels-catalog';
import { getCachedRates } from '@/lib/price-cache';

function postRecommendations(headers: Record<string, string> = {}, body: Record<string, unknown> = {}) {
  return new Request('http://localhost:3000/api/agents/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ favorites: [], trips: [], ...body }),
  });
}

describe('POST /api/agents/recommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findHotel).mockReset();
    vi.mocked(getCachedRates).mockReset();
  });

  it('rejects cross-origin agent recommendation mutations', async () => {
    const response = await POST(postRecommendations({ origin: 'https://evil.example' }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.error).toBe('Same-origin request required');
  });

  it('localizes recommendation copy without changing the response shape', async () => {
    vi.mocked(findHotel).mockReturnValue({
      hotelKey: 'hotel-1',
      name: 'Source Hotel',
      city: 'Paris',
      country: 'France',
    });
    vi.mocked(getCachedRates).mockResolvedValue({
      rates: [{ name: 'Booking.com', rate: 120, tax: 20 }],
    });

    const response = await POST(postRecommendations({}, {
      locale: 'he',
      favorites: [{ hotelKey: 'hotel-1' }],
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.recommendations).toHaveLength(1);
    expect(body.recommendations[0]).toMatchObject({
      type: 'new_deal',
      title: expect.stringContaining('Source Hotel החל מ-'),
      description: expect.stringContaining('זמין דרך Booking.com'),
      action: {
        label: 'צפייה במבצע',
        href: expect.stringContaining('/compare?hotelKey=hotel-1'),
      },
    });
  });
});
