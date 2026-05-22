import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/hotels-catalog', () => ({
  findHotel: vi.fn((hotelKey: string) => (
    hotelKey === 'g187147-d188732'
      ? { hotelKey, name: 'Le Meurice', city: 'Paris', country: 'France' }
      : null
  )),
}));

vi.mock('@/lib/price-cache', () => ({
  getCachedRates: vi.fn(async () => ({
    rates: [
      { provider: 'unknown', total: 80, source: 'xotelo' },
      { provider: 'Booking.com', rate: 120, tax: 20, source: 'xotelo' },
    ],
    source: 'xotelo',
    currency: 'USD',
    freshness: 'live',
  })),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({
    check: vi.fn(async () => ({ success: true, reset: Date.now() + 60000 })),
  })),
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimitResponse: vi.fn((reset: number) => Response.json({ error: 'Rate limit exceeded', reset }, { status: 429 })),
}));

import { GET as legacyGET } from '@/app/api/agent/route';
import { GET as canonicalGET } from '@/app/api/agents/price-recommendation/route';

function legacyRequest(query: string) {
  return new Request(`http://localhost:3000/api/agent?${query}`);
}

function canonicalRequest(query: string) {
  return new Request(`http://localhost:3000/api/agents/price-recommendation?${query}`);
}

describe('GET /api/agents/price-recommendation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unknown hotel keys instead of creating placeholder hotel data', async () => {
    const response = await canonicalGET(canonicalRequest('hotelKey=g0-d0&checkIn=2026-06-01&checkOut=2026-06-03'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Hotel not found');
  });

  it('builds recommendations from verified provider prices only', async () => {
    const response = await canonicalGET(canonicalRequest('hotelKey=g187147-d188732&checkIn=2026-06-01&checkOut=2026-06-03'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('deprecation')).toBeNull();
    expect(body.hotel.name).toBe('Le Meurice');
    expect(body.providerCount).toBe(1);
    expect(body.recommended.provider).toBe('Booking.com');
    expect(JSON.stringify(body)).not.toContain('unknown');
  });
});

describe('GET /api/agent legacy compatibility', () => {
  it('advertises the canonical successor endpoint', async () => {
    const response = await legacyGET(legacyRequest('hotelKey=g187147-d188732&checkIn=2026-06-01&checkOut=2026-06-03'));

    expect(response.status).toBe(200);
    expect(response.headers.get('deprecation')).toBe('true');
    expect(response.headers.get('link')).toContain('/api/agents/price-recommendation');
  });
});
