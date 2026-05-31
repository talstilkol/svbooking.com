import { beforeEach, describe, expect, it, vi } from 'vitest';

const agentMocks = vi.hoisted(() => ({
  rateLimitCheck: vi.fn(async () => ({ success: true, reset: 123456 })),
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
    check: agentMocks.rateLimitCheck,
  })),
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimitResponse: vi.fn((reset: number) => Response.json({ error: 'Rate limit exceeded', reset }, { status: 429 })),
}));

import { GET as legacyGET } from '@/app/api/agent/route';
import { GET as canonicalGET } from '@/app/api/agents/price-recommendation/route';
import { getCachedRates } from '@/lib/price-cache';

function legacyRequest(query: string) {
  return new Request(`http://localhost:3000/api/agent?${query}`);
}

function canonicalRequest(query: string) {
  return new Request(`http://localhost:3000/api/agents/price-recommendation?${query}`);
}

describe('GET /api/agents/price-recommendation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agentMocks.rateLimitCheck.mockResolvedValue({ success: true, reset: 123456 });
  });

  it('rejects unknown hotel keys instead of creating placeholder hotel data', async () => {
    const response = await canonicalGET(canonicalRequest('hotelKey=g0-d0&checkIn=2026-06-01&checkOut=2026-06-03'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Hotel not found');
  });

  it('rejects missing and invalid date parameters before provider access', async () => {
    const missing = await canonicalGET(canonicalRequest('hotelKey=g187147-d188732&checkIn=2026-06-01'));
    const invalidDate = await canonicalGET(canonicalRequest('hotelKey=g187147-d188732&checkIn=invalid&checkOut=2026-06-03'));
    const reversed = await canonicalGET(canonicalRequest('hotelKey=g187147-d188732&checkIn=2026-06-03&checkOut=2026-06-01'));

    expect(missing.status).toBe(400);
    await expect(missing.json()).resolves.toEqual({ error: 'Missing required params: hotelKey, checkIn, checkOut' });
    expect(invalidDate.status).toBe(400);
    await expect(invalidDate.json()).resolves.toEqual({ error: 'Invalid checkIn' });
    expect(reversed.status).toBe(400);
    await expect(reversed.json()).resolves.toEqual({ error: 'checkIn must be before checkOut' });
    expect(getCachedRates).not.toHaveBeenCalled();
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

  it('returns an explicit no-data recommendation when provider observations are unusable', async () => {
    vi.mocked(getCachedRates).mockResolvedValueOnce({
      rates: [
        { provider: 'unknown', total: 80, source: 'xotelo' },
        { provider: 'Heatmap', total: 90, source: 'xotelo', priceSource: 'heatmap' },
      ],
      source: 'xotelo',
      currency: 'USD',
      freshness: 'live',
      partial: false,
    });

    const response = await canonicalGET(canonicalRequest('hotelKey=g187147-d188732&checkIn=2026-06-01&checkOut=2026-06-03'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.providerCount).toBe(0);
    expect(body.recommended).toBeNull();
    expect(body.verdict).toBe('NO_DATA');
    expect(body.reasoning).toContain('No provider-returned offers');
  });

  it('falls back to safe response metadata when the cache layer returns no payload', async () => {
    vi.mocked(getCachedRates).mockResolvedValueOnce(undefined as Awaited<ReturnType<typeof getCachedRates>>);

    const response = await canonicalGET(canonicalRequest('hotelKey=g187147-d188732&checkIn=2026-06-01&checkOut=2026-06-03'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checkIn).toBe('2026-06-01');
    expect(body.checkOut).toBe('2026-06-03');
    expect(body.currency).toBe('USD');
    expect(body.providerCount).toBe(0);
    expect(body.priceMeta).toEqual({
      provider: null,
      source: null,
      fromCache: false,
      freshness: 'unknown',
      partial: false,
      lastCheckedAt: null,
    });
    expect(body.verdict).toBe('NO_DATA');
  });

  it('keeps savings metadata deterministic for multiple verified rates', async () => {
    vi.mocked(getCachedRates).mockResolvedValueOnce({
      rates: [
        { provider: 'Provider B', total: 200, source: 'xotelo' },
        { provider: 'Provider A', total: 150, source: 'xotelo' },
      ],
      source: 'xotelo',
      currency: 'USD',
      freshness: 'live',
    });

    const response = await canonicalGET(canonicalRequest('hotelKey=g187147-d188732&checkIn=2026-06-01&checkOut=2026-06-03'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.recommended.provider).toBe('Provider A');
    expect(body.savingsVsExpensive).toBe(50);
    expect(body.savingsPct).toBe(25);
    expect(body.ranked.map((rate: { provider: string; score: number }) => [rate.provider, rate.score])).toEqual([
      ['Provider A', 1],
      ['Provider B', 0],
    ]);
  });

  it('fails closed when the recommendation rate limit is exceeded', async () => {
    agentMocks.rateLimitCheck.mockResolvedValueOnce({ success: false, reset: 654321 });

    const response = await canonicalGET(canonicalRequest('hotelKey=g187147-d188732&checkIn=2026-06-01&checkOut=2026-06-03'));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toEqual({ error: 'Rate limit exceeded', reset: 654321 });
    expect(getCachedRates).not.toHaveBeenCalled();
  });

  it('keeps internal provider failures generic', async () => {
    vi.mocked(getCachedRates).mockRejectedValueOnce(new Error('provider token leaked'));

    const response = await canonicalGET(canonicalRequest('hotelKey=g187147-d188732&checkIn=2026-06-01&checkOut=2026-06-03'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toEqual({ error: 'Internal server error' });
    expect(JSON.stringify(body)).not.toContain('provider token leaked');
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
