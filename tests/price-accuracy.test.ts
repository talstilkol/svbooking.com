import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();

vi.mock('@/lib/kv', () => ({
  kv: {
    get: vi.fn(async (key: string) => store.get(key) || null),
    setWithTTL: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({
    check: vi.fn(async () => ({ success: true, reset: Date.now() + 60000 })),
  })),
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimitResponse: vi.fn((reset: number) => Response.json({ error: 'Rate limit exceeded', reset }, { status: 429 })),
}));

import { GET, POST } from '@/app/api/price-accuracy/route';
import { getPriceAccuracyMetrics, recordPriceObservation } from '@/lib/price-accuracy';

function post(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Request('http://localhost:3000/api/price-accuracy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('price accuracy ledger', () => {
  beforeEach(() => {
    store.clear();
    vi.stubEnv('ADMIN_API_SECRET', 'admin-price-secret');
    vi.stubEnv('CRON_SECRET', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('records mismatch reports only for known providers with numeric totals', async () => {
    const invalidProvider = await POST(post({
      hotelKey: 'g1-d1',
      provider: 'Unknown Provider',
      quotedTotal: 100,
      observedTotal: 120,
    }));
    expect(invalidProvider.status).toBe(400);

    const response = await POST(post({
      hotelKey: 'g1-d1',
      provider: 'Booking.com',
      quotedTotal: 100,
      observedTotal: 120,
      currency: 'USD',
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.recorded).toBe(true);
    expect(body.mismatch.quotedTotal).toBe(100);
    expect(body.mismatch.observedTotal).toBe(120);
  });

  it('rejects cross-origin price accuracy reports', async () => {
    const response = await POST(post(
      {
        hotelKey: 'g1-d1',
        provider: 'Booking.com',
        quotedTotal: 100,
        observedTotal: 120,
      },
      { origin: 'https://evil.example' }
    ));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.error).toBe('Same-origin request required');
  });

  it('requires admin auth for metrics and reports mismatch rate from real observations', async () => {
    await recordPriceObservation({
      hotelKey: 'g1-d1',
      provider: 'Booking.com',
      quotedTotal: 100,
      currency: 'USD',
      source: 'test',
    });
    await POST(post({
      hotelKey: 'g1-d1',
      provider: 'Booking.com',
      quotedTotal: 100,
      observedTotal: 120,
    }));

    const denied = await GET(new Request('http://localhost:3000/api/price-accuracy?days=1'));
    expect(denied.status).toBe(401);

    const accepted = await GET(new Request('http://localhost:3000/api/price-accuracy?days=1', {
      headers: { Authorization: 'Bearer admin-price-secret' },
    }));
    const body = await accepted.json();

    expect(accepted.status).toBe(200);
    expect(body.observations).toBe(1);
    expect(body.mismatches).toBe(1);
    expect(body.byProvider['Booking.com'].mismatchRate).toBe(1);
  });

  it('returns null mismatch rate when there is no observation denominator', async () => {
    const metrics = await getPriceAccuracyMetrics({ days: 1 });
    expect(metrics.mismatchRate).toBeNull();
  });
});
