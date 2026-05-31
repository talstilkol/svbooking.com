import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn(async () => ({ id: 'user_1' })),
}));

vi.mock('@/lib/kv', () => {
  const store = new Map<string, unknown>();
  return {
    __store: store,
    kv: {
      get: vi.fn(async (key: string) => store.get(key) || null),
      set: vi.fn(async (key: string, value: unknown) => {
        store.set(key, value);
      }),
      setWithTTL: vi.fn(async (key: string, value: unknown) => {
        store.set(key, value);
      }),
      keys: vi.fn(async () => [...store.keys()]),
    },
  };
});

vi.mock('@/lib/hotels-catalog', () => ({
  findHotel: vi.fn((hotelKey: string) => (
    hotelKey === 'g1-d1'
      ? { hotelKey, name: 'Verified Hotel', city: 'Paris', country: 'France' }
      : null
  )),
}));

vi.mock('@/lib/price-cache', () => ({
  getCachedRates: vi.fn(async () => ({
    rates: [{ name: 'Provider A', rate: 90, tax: 5 }],
    currency: 'USD',
    provider: 'Provider A',
    source: 'provider-a',
    freshness: 'fresh',
  })),
}));

import { DELETE as cancelAlert, GET as listAlerts, POST as createAlert } from '@/app/api/price-alerts/route';
import { GET as evaluateAlerts } from '@/app/api/price-alerts/evaluate/route';
import { GET as getAlertEvents } from '@/app/api/price-alerts/events/route';
import { GET as getAlertHistory } from '@/app/api/price-alerts/history/route';
import { GET as unsubscribeAlert } from '@/app/api/price-alerts/unsubscribe/route';
import { kv } from '@/lib/kv';
import { getCachedRates } from '@/lib/price-cache';
import { PRICE_ALERT_EVENTS_KEY, priceAlertUserFingerprint } from '@/lib/user-data';

describe('price alerts API', () => {
  beforeEach(async () => {
    const mod = await import('@/lib/kv') as Record<string, unknown>;
    (mod.__store as Map<string, unknown>).clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects alerts without observed or target price data', async () => {
    const response = await createAlert(new Request('http://localhost:3000/api/price-alerts', {
      method: 'POST',
      body: JSON.stringify({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03' }),
    }));

    expect(response.status).toBe(400);
  });

  it('rejects cross-origin alert mutations', async () => {
    const response = await createAlert(new Request('http://localhost:3000/api/price-alerts', {
      method: 'POST',
      headers: {
        origin: 'https://evil.example',
        host: 'localhost:3000',
      },
      body: JSON.stringify({
        hotelKey: 'g1-d1',
        checkIn: '2026-06-01',
        checkOut: '2026-06-03',
        currentPrice: 120,
        currency: 'USD',
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Same-origin request required');
  });

  it('creates deterministic alerts for verified catalog hotels only', async () => {
    const response = await createAlert(new Request('http://localhost:3000/api/price-alerts', {
      method: 'POST',
      body: JSON.stringify({
        hotelKey: 'g1-d1',
        checkIn: '2026-06-01',
        checkOut: '2026-06-03',
        currentPrice: 120,
        currency: 'USD',
      }),
    }));

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.alert.id).toMatch(/^h_[0-9a-z]+$/);
    expect(body.alert.sourcePolicy).toBe('verified-provider-prices-only');
    expect(body.alert.baselinePrice).toBe(120);
    expect(body.alert.unsubscribeStatus).toBe('not-configured');
  });

  it('rate-limits repeated price alert mutations before writing more alerts', async () => {
    const headers = { 'x-forwarded-for': '198.51.100.20' };

    for (let index = 0; index < 20; index += 1) {
      const response = await createAlert(new Request('http://localhost:3000/api/price-alerts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: `h_${index.toString(36)}`,
          hotelKey: 'g1-d1',
          checkIn: '2026-06-01',
          checkOut: '2026-06-03',
          currentPrice: 120 + index,
          currency: 'USD',
        }),
      }));
      expect(response.status).toBe(200);
    }

    const blocked = await createAlert(new Request('http://localhost:3000/api/price-alerts', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: 'h_blocked',
        hotelKey: 'g1-d1',
        checkIn: '2026-06-01',
        checkOut: '2026-06-03',
        currentPrice: 200,
        currency: 'USD',
      }),
    }));
    const body = await blocked.json();
    const listed = await listAlerts();
    const listedBody = await listed.json();

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Cache-Control')).toBe('no-store');
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
    expect(body.error).toBe('Too many requests. Please try again later.');
    expect(listedBody.alerts).toHaveLength(20);
  });

  it('creates deterministic unsubscribe tokens when configured and cancels by public token', async () => {
    vi.stubEnv('PRICE_ALERT_UNSUBSCRIBE_SECRET', 'svbooking-unsubscribe-secret-0001');

    const created = await createAlert(new Request('http://localhost:3000/api/price-alerts', {
      method: 'POST',
      body: JSON.stringify({
        hotelKey: 'g1-d1',
        checkIn: '2026-06-01',
        checkOut: '2026-06-03',
        currentPrice: 120,
        currency: 'USD',
      }),
    }));
    const createdBody = await created.json();

    expect(createdBody.alert.unsubscribeToken).toMatch(/^u_[0-9a-f]{32}$/);
    expect(createdBody.alert.unsubscribePath).toContain('/api/price-alerts/unsubscribe?token=');
    expect(createdBody.alert.unsubscribeStatus).toBe('configured');

    const unsubscribed = await unsubscribeAlert(new Request(
      `http://localhost:3000/api/price-alerts/unsubscribe?token=${createdBody.alert.unsubscribeToken}`
    ));
    const unsubscribeBody = await unsubscribed.json();

    expect(unsubscribed.status).toBe(200);
    expect(unsubscribeBody.unsubscribed).toBe(true);
    expect(unsubscribeBody.userFingerprint).toMatch(/^h_[0-9a-z]+$/);
    expect(JSON.stringify(unsubscribeBody)).not.toContain('user_1');

    const listed = await listAlerts();
    const listedBody = await listed.json();
    expect(listedBody.alerts[0].status).toBe('cancelled');
  });

  it('rate-limits repeated unsubscribe token attempts', async () => {
    const headers = { 'x-forwarded-for': '198.51.100.10' };

    for (let index = 0; index < 10; index += 1) {
      const response = await unsubscribeAlert(new Request(
        'http://localhost:3000/api/price-alerts/unsubscribe?token=bad-token',
        { headers }
      ));
      expect(response.status).toBe(400);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    }

    const blocked = await unsubscribeAlert(new Request(
      'http://localhost:3000/api/price-alerts/unsubscribe?token=bad-token',
      { headers }
    ));
    const body = await blocked.json();

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Cache-Control')).toBe('no-store');
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
    expect(body.error).toBe('Too many requests. Please try again later.');
  });

  it('rate-limits repeated price alert history reads before scanning stored events', async () => {
    const headers = { 'x-forwarded-for': '198.51.100.60' };
    const userFingerprint = priceAlertUserFingerprint('user_1');
    const mod = await import('@/lib/kv') as Record<string, unknown>;
    (mod.__store as Map<string, unknown>).set(PRICE_ALERT_EVENTS_KEY, [{
      id: 'event-1',
      alertId: 'h_alert1',
      hotelKey: 'g1-d1',
      userFingerprint,
      observedPrice: 90,
      targetPrice: 100,
      currency: 'USD',
      at: '2026-05-22T00:00:00.000Z',
    }]);

    for (let index = 0; index < 20; index += 1) {
      const response = await getAlertHistory(new Request('http://localhost:3000/api/price-alerts/history', { headers }));
      expect(response.status).toBe(200);
    }

    const eventReadsBeforeBlockedRequest = vi.mocked(kv.get).mock.calls
      .filter(([key]) => key === PRICE_ALERT_EVENTS_KEY).length;
    const blocked = await getAlertHistory(new Request('http://localhost:3000/api/price-alerts/history', { headers }));
    const body = await blocked.json();

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Cache-Control')).toBe('no-store');
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
    expect(body.error).toBe('Too many requests. Please try again later.');
    expect(vi.mocked(kv.get).mock.calls.filter(([key]) => key === PRICE_ALERT_EVENTS_KEY)).toHaveLength(eventReadsBeforeBlockedRequest);
  });

  it('cancels server alerts without deleting audit state', async () => {
    const created = await createAlert(new Request('http://localhost:3000/api/price-alerts', {
      method: 'POST',
      body: JSON.stringify({
        hotelKey: 'g1-d1',
        checkIn: '2026-06-01',
        checkOut: '2026-06-03',
        currentPrice: 120,
        currency: 'USD',
      }),
    }));
    const createdBody = await created.json();

    const cancelled = await cancelAlert(new Request(
      `http://localhost:3000/api/price-alerts?id=${createdBody.alert.id}`,
      { method: 'DELETE' }
    ));
    const cancelBody = await cancelled.json();

    expect(cancelled.status).toBe(200);
    expect(cancelBody.alert.status).toBe('cancelled');
    expect(cancelBody.alert.cancelledAt).toBeTruthy();

    const listed = await listAlerts();
    const listedBody = await listed.json();
    expect(listedBody.alerts).toHaveLength(1);
    expect(listedBody.alerts[0].status).toBe('cancelled');
  });

  it('indexes users and evaluates alerts from verified provider prices only', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-test-secret');
    vi.stubEnv('CRON_SECRET', 'cron-test-secret');

    await createAlert(new Request('http://localhost:3000/api/price-alerts', {
      method: 'POST',
      body: JSON.stringify({
        hotelKey: 'g1-d1',
        checkIn: '2026-06-01',
        checkOut: '2026-06-03',
        targetPrice: 100,
        currentPrice: 120,
        currency: 'USD',
      }),
    }));

    const response = await evaluateAlerts(new Request('http://localhost:3000/api/price-alerts/evaluate', {
      headers: { Authorization: 'Bearer cron-test-secret', host: 'localhost:3000' },
    }));
    const body = await response!.json();

    expect(response!.status).toBe(200);
    expect(body.evaluated).toBe(1);
    expect(body.triggered).toBe(1);
    expect(body.delivery).toBe('not-configured');

    const denied = await getAlertEvents(new Request('http://localhost:3000/api/price-alerts/events'));
    expect(denied!.status).toBe(401);

    const accepted = await getAlertEvents(new Request('http://localhost:3000/api/price-alerts/events', {
      headers: { Authorization: 'Bearer admin-test-secret' },
    }));
    const eventsBody = await accepted!.json();

    expect(accepted!.status).toBe(200);
    expect(eventsBody.deliveryStatus).toBe('not-configured');
    expect(eventsBody.events).toHaveLength(1);
    expect(eventsBody.events[0].userFingerprint).toMatch(/^h_[0-9a-z]+$/);
    expect(JSON.stringify(eventsBody)).not.toContain('user_1');

    const history = await getAlertHistory(new Request('http://localhost:3000/api/price-alerts/history'));
    const historyBody = await history.json();

    expect(history.status).toBe(200);
    expect(historyBody.count).toBe(1);
    expect(historyBody.events[0].alertId).toBe(eventsBody.events[0].alertId);
    expect(historyBody.events[0].unsubscribeToken).toBeUndefined();
    expect(JSON.stringify(historyBody)).not.toContain('user_1');
  });

  it('does not trigger alerts from stale or partial price data', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-test-secret');
    vi.stubEnv('CRON_SECRET', 'cron-test-secret');
    vi.mocked(getCachedRates).mockResolvedValueOnce({
      rates: [{
        provider: 'Cached Provider',
        source: 'cached-provider',
        total: 80,
        freshness: 'stale',
        partial: true,
      }],
      currency: 'USD',
      provider: 'Cached Provider',
      source: 'cached-provider',
      freshness: 'stale',
      partial: true,
    });

    await createAlert(new Request('http://localhost:3000/api/price-alerts', {
      method: 'POST',
      body: JSON.stringify({
        hotelKey: 'g1-d1',
        checkIn: '2026-06-01',
        checkOut: '2026-06-03',
        targetPrice: 100,
        currentPrice: 120,
        currency: 'USD',
      }),
    }));

    const response = await evaluateAlerts(new Request('http://localhost:3000/api/price-alerts/evaluate', {
      headers: { Authorization: 'Bearer cron-test-secret', host: 'localhost:3000' },
    }));
    const body = await response!.json();

    expect(response!.status).toBe(200);
    expect(body.evaluated).toBe(1);
    expect(body.triggered).toBe(0);

    const events = await getAlertEvents(new Request('http://localhost:3000/api/price-alerts/events', {
      headers: { Authorization: 'Bearer admin-test-secret' },
    }));
    const eventsBody = await events!.json();
    expect(eventsBody.events).toHaveLength(0);

    const listed = await listAlerts();
    const listedBody = await listed.json();
    expect(listedBody.alerts[0].lastEvaluationStatus).toBe('unavailable');
    expect(listedBody.alerts[0].lastEvaluationSkippedReason).toBe('stale-or-partial-price');
  });
});
