import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock KV and affiliate modules
const mockStore = new Map<string, unknown>();
vi.mock('@/lib/kv', () => ({
  kv: {
    get: vi.fn(async (key: string) => mockStore.get(key) || null),
    set: vi.fn(async (key: string, value: unknown) => mockStore.set(key, value)),
    setWithTTL: vi.fn(async (key: string, value: unknown) => mockStore.set(key, value)),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({
    check: vi.fn(async () => ({ success: true, remaining: 59, reset: Date.now() + 60000 })),
  }),
  getClientIp: () => '127.0.0.1',
  rateLimitResponse: () => Response.json({ error: 'Too many requests' }, { status: 429 }),
}));

import { POST, GET } from '@/app/api/click/route';

function makePostRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/click', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it('returns 400 when url is missing', async () => {
    const res = await POST(makePostRequest({ provider: 'Booking.com' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when provider is missing', async () => {
    const res = await POST(makePostRequest({ url: 'https://booking.com/hotel' }));
    expect(res.status).toBe(400);
  });

  it('returns redirect URL for valid click', async () => {
    const res = await POST(makePostRequest({
      hotelKey: 'g123-d456',
      provider: 'Booking.com',
      url: 'https://www.booking.com/hotel/test',
      price: 200,
      currency: 'USD',
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.redirectUrl).toBeDefined();
    expect(data.redirectUrl).toContain('booking.com');
  });

  it('sets no-store cache header', async () => {
    const res = await POST(makePostRequest({
      provider: 'Expedia',
      url: 'https://expedia.com/hotel',
    }));
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('GET /api/click/stats', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it('returns stats with zero clicks when no data', async () => {
    const req = new Request('http://localhost:3000/api/click?days=7');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalClicks).toBe(0);
    expect(data.byProvider).toBeDefined();
    expect(data.byDay).toBeDefined();
  });

  it('caps days at 30', async () => {
    const req = new Request('http://localhost:3000/api/click?days=100');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    // Should have at most 30 day entries
    expect(Object.keys(data.byDay).length).toBeLessThanOrEqual(30);
  });

  it('returns click counts by provider', async () => {
    const today = new Date().toISOString().split('T')[0];
    mockStore.set(`clicks:${today}`, [
      { hotelKey: 'g123-d456', provider: 'Booking.com', price: 200, currency: 'USD', ts: Date.now() },
      { hotelKey: 'g123-d789', provider: 'Expedia', price: 150, currency: 'USD', ts: Date.now() },
      { hotelKey: 'g123-d456', provider: 'Booking.com', price: 180, currency: 'USD', ts: Date.now() },
    ]);

    const req = new Request('http://localhost:3000/api/click?days=1');
    const res = await GET(req);
    const data = await res.json();
    expect(data.totalClicks).toBe(3);
    expect(data.byProvider['Booking.com']).toBe(2);
    expect(data.byProvider['Expedia']).toBe(1);
  });
});
