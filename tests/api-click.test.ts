import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';

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

function makePostRequest(body: Record<string, unknown>, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function makeStatsRequest(token?: string): Request {
  return new Request('http://localhost:3000/api/click?days=7', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function makeAuthedStatsRequest(path = 'http://localhost:3000/api/click?days=7'): Request {
  return new Request(path, {
    headers: { Authorization: 'Bearer admin-click-secret' },
  });
}

describe('POST /api/click', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it('returns 400 when url is missing', async () => {
    const res = await POST(makePostRequest({ provider: 'Booking.com' }));
    expect(res.status).toBe(400);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('rejects cross-origin click tracking requests', async () => {
    const res = await POST(makePostRequest(
      {
        provider: 'Booking.com',
        url: 'https://www.booking.com/searchresults.html?ss=Patong%20Beach%20Hotel',
      },
      { origin: 'https://evil.example' }
    ));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(body.error).toBe('Same-origin request required');
  });

  it('returns 400 when provider is missing', async () => {
    const res = await POST(makePostRequest({ url: 'https://booking.com/hotel' }));
    expect(res.status).toBe(400);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns 400 for unknown providers', async () => {
    const res = await POST(makePostRequest({
      provider: 'Unknown Provider',
      url: 'https://www.booking.com/searchresults.html?ss=Patong%20Beach%20Hotel',
    }));
    expect(res.status).toBe(400);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns 400 for non-http redirect URLs', async () => {
    const res = await POST(makePostRequest({
      provider: 'Booking.com',
      url: 'javascript:alert(1)',
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-HTTPS provider redirect URLs', async () => {
    const res = await POST(makePostRequest({
      provider: 'Booking.com',
      url: 'http://www.booking.com/searchresults.html?ss=Paris',
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when URL domain does not match provider allowlist', async () => {
    const res = await POST(makePostRequest({
      provider: 'Booking.com',
      url: 'https://www.expedia.com/hotel',
    }));
    expect(res.status).toBe(400);
  });

  it('returns redirect URL for valid click', async () => {
    const res = await POST(makePostRequest({
      hotelKey: 'g297930-d305178',
      provider: 'Booking.com',
      url: 'https://www.booking.com/searchresults.html?ss=Patong%20Beach%20Hotel',
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
      url: 'https://www.expedia.com/Hotel-Search?destination=Phuket',
    }));
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('GET /api/click/stats', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.stubEnv('ADMIN_API_SECRET', 'admin-click-secret');
    vi.stubEnv('CRON_SECRET', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('fails closed when no admin secret is configured', async () => {
    vi.stubEnv('ADMIN_API_SECRET', '');
    vi.stubEnv('CRON_SECRET', '');

    const res = await GET(makeStatsRequest());
    expect(res!.status).toBe(403);
  });

  it('rejects missing bearer token when admin secret exists', async () => {
    const res = await GET(makeStatsRequest());
    expect(res!.status).toBe(401);
  });

  it('returns stats with zero clicks when authenticated and no data exists', async () => {
    const res = await GET(makeAuthedStatsRequest());
    expect(res!.status).toBe(200);
    expect(res!.headers.get('Cache-Control')).toBe('no-store');
    const data = await res!.json();
    expect(data.totalClicks).toBe(0);
    expect(data.byProvider).toBeDefined();
    expect(data.byDay).toBeDefined();
  });

  it('caps days at 30', async () => {
    const req = makeAuthedStatsRequest('http://localhost:3000/api/click?days=100');
    const res = await GET(req);
    expect(res!.status).toBe(200);
    const data = await res!.json();
    // Should have at most 30 day entries
    expect(Object.keys(data.byDay).length).toBeLessThanOrEqual(30);
  });

  it('returns click counts by provider', async () => {
    const today = new Date().toISOString().split('T')[0];
    mockStore.set(`clicks:${today}`, [
      { hotelKey: 'g297930-d305178', provider: 'Booking.com', price: 200, currency: 'USD', ts: Date.now() },
      { hotelKey: 'g187147-d188728', provider: 'Expedia', price: 150, currency: 'USD', ts: Date.now() },
      { hotelKey: 'g297930-d305178', provider: 'Booking.com', price: 180, currency: 'USD', ts: Date.now() },
    ]);

    const req = makeAuthedStatsRequest('http://localhost:3000/api/click?days=1');
    const res = await GET(req);
    const data = await res!.json();
    expect(data.totalClicks).toBe(3);
    expect(data.byProvider['Booking.com']).toBe(2);
    expect(data.byProvider['Expedia']).toBe(1);
  });
});
