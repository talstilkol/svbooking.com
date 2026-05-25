import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/price-cache', () => ({
  getCachedRates: vi.fn(async (params: { hotelKey: string }) => ({
    rates: [
      {
        provider: 'Booking.com',
        code: 'bookingcom',
        rate: params.hotelKey === 'g187147-d188728' ? 100 : 200,
        tax: 20,
        total: params.hotelKey === 'g187147-d188728' ? 120 : 220,
        currency: 'USD',
        source: 'xotelo',
        freshness: 'live',
        partial: false,
        deepLink: 'https://www.booking.com/hotel/example.html',
        taxesIncluded: true,
        priceAccuracyState: 'unobserved',
        lastCheckedAt: '2026-05-14T12:00:00.000Z',
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
    get: vi.fn(async () => null),
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

import { POST } from '@/app/api/compare/batch/route';
import { getCachedRates } from '@/lib/price-cache';

function batchRequest(body: unknown) {
  return new Request('http://localhost:3000/api/compare/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/compare/batch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns comparison results for multiple hotels in one response', async () => {
    const response = await POST(batchRequest({
      hotelKeys: ['g187147-d188728', 'g187147-d197539'],
      checkIn: '2026-06-01',
      checkOut: '2026-06-03',
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalHotels).toBe(2);
    expect(body.successCount).toBe(2);
    expect(body.failedKeys).toEqual([]);

    // Both hotels should have results
    expect(body.results['g187147-d188728']).toBeDefined();
    expect(body.results['g187147-d197539']).toBeDefined();

    // First hotel has lower price
    expect(body.results['g187147-d188728'].cheapest.total).toBe(120);
    expect(body.results['g187147-d197539'].cheapest.total).toBe(220);

    // Should call getCachedRates once per hotel
    expect(getCachedRates).toHaveBeenCalledTimes(2);
  });

  it('reports unknown hotel keys in failedKeys', async () => {
    const response = await POST(batchRequest({
      hotelKeys: ['g187147-d188728', 'g0-d0-invalid'],
      checkIn: '2026-06-01',
      checkOut: '2026-06-03',
    }));
    const body = await response.json();

    expect(body.totalHotels).toBe(2);
    expect(body.successCount).toBe(1);
    expect(body.failedKeys).toContain('g0-d0-invalid');
    expect(body.results['g187147-d188728']).toBeDefined();
  });

  it('deduplicates hotel keys', async () => {
    const response = await POST(batchRequest({
      hotelKeys: ['g187147-d188728', 'g187147-d188728', 'g187147-d188728'],
      checkIn: '2026-06-01',
      checkOut: '2026-06-03',
    }));
    const body = await response.json();

    expect(body.totalHotels).toBe(1);
    expect(getCachedRates).toHaveBeenCalledTimes(1);
  });

  it('rejects requests missing required fields', async () => {
    const response = await POST(batchRequest({ hotelKeys: ['g187147-d188728'] }));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toContain('Missing required fields');
  });

  it('enforces batch size limit of 5', async () => {
    const keys = Array.from({ length: 10 }, (_, i) => `g187147-d${188728 + i}`);
    const response = await POST(batchRequest({
      hotelKeys: keys,
      checkIn: '2026-06-01',
      checkOut: '2026-06-03',
    }));
    const body = await response.json();

    // Only first 5 unique keys processed
    expect(body.totalHotels).toBe(5);
  });
});
