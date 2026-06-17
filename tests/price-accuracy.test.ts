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
import { getPriceAccuracyMetrics, recordPriceMismatch, recordPriceObservation } from '@/lib/price-accuracy';

type ProviderAccuracyStats = {
  observations: number;
  mismatches: number;
  mismatchRate: number | null;
};

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
    vi.useRealTimers();
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
    expect(denied!.status).toBe(401);

    const accepted = await GET(new Request('http://localhost:3000/api/price-accuracy?days=1', {
      headers: { Authorization: 'Bearer admin-price-secret' },
    }));
    const body = await accepted!.json();

    expect(accepted!.status).toBe(200);
    expect(body.observations).toBe(1);
    expect(body.mismatches).toBe(1);
    expect(body.byProvider['Booking.com'].mismatchRate).toBe(1);
  });

  it('returns null mismatch rate when there is no observation denominator', async () => {
    const metrics = await getPriceAccuracyMetrics({ days: 1 });
    expect(metrics.mismatchRate).toBeNull();
  });

  it('normalizes missing observation fields and caps daily ledgers', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T12:00:00.000Z'));
    store.set('price:observations:2026-05-31', Array.from({ length: 1005 }, (_value, index) => ({
      id: `existing-observation-${index}`,
      provider: 'Booking.com',
    })));
    store.set('price:mismatches:2026-05-31', Array.from({ length: 505 }, (_value, index) => ({
      id: `existing-mismatch-${index}`,
      provider: 'Booking.com',
    })));

    const observation = await recordPriceObservation({
      hotelKey: '',
      provider: '',
      quotedTotal: 'not-a-number',
      currency: 'EUR',
      taxesIncluded: true as unknown as null,
      source: 'click',
    });
    const mismatch = await recordPriceMismatch({
      hotelKey: '',
      provider: 'Expedia',
      quotedTotal: 'bad-quote',
      observedTotal: 'bad-observed',
      currency: 'EUR',
    });
    const anonymousMismatch = await recordPriceMismatch({
      hotelKey: '',
      provider: '',
      quotedTotal: 0,
      observedTotal: 0,
      currency: 'EUR',
    });

    expect(observation).toMatchObject({
      hotelKey: 'unknown',
      provider: 'unknown',
      quotedTotal: null,
      currency: 'EUR',
      taxesIncluded: true,
    });
    expect(mismatch).toMatchObject({
      hotelKey: 'unknown',
      provider: 'Expedia',
      quotedTotal: null,
      observedTotal: null,
    });
    expect(anonymousMismatch).toMatchObject({
      hotelKey: 'unknown',
      provider: 'unknown',
      quotedTotal: 0,
      observedTotal: 0,
    });
    expect((store.get('price:observations:2026-05-31') as unknown[])).toHaveLength(1000);
    expect((store.get('price:mismatches:2026-05-31') as unknown[])).toHaveLength(500);
  });

  it('caps metric windows and reports mismatch-only providers without a denominator', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T12:00:00.000Z'));
    store.set('price:observations:2026-05-31', [
      { provider: 'Booking.com' },
      {},
    ]);
    store.set('price:mismatches:2026-05-31', [
      { provider: 'Expedia' },
      {},
    ]);

    const capped = await getPriceAccuracyMetrics({ days: 60 });
    const defaulted = await getPriceAccuracyMetrics({ days: 'not-a-number' as unknown as number });
    const byProvider = capped.byProvider as Record<string, ProviderAccuracyStats>;

    expect(capped.days).toBe(30);
    expect(capped.observations).toBe(2);
    expect(capped.mismatches).toBe(2);
    expect(capped.mismatchRate).toBe(1);
    expect(byProvider['Booking.com']).toMatchObject({ observations: 1, mismatches: 0, mismatchRate: 0 });
    expect(byProvider.unknown).toMatchObject({ observations: 1, mismatches: 1, mismatchRate: 1 });
    expect(byProvider.Expedia).toMatchObject({ observations: 0, mismatches: 1, mismatchRate: null });
    expect(defaulted.days).toBe(7);
  });
});
