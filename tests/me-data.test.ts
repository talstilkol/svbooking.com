import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();

vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn(async () => ({ id: 'user-1' })),
}));

vi.mock('@/lib/kv', () => ({
  kv: {
    get: vi.fn(async (key: string) => store.get(key) || null),
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    setWithTTL: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    del: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  },
}));

import { DELETE, GET } from '@/app/api/me/data/route';
import { kv } from '@/lib/kv';
import {
  PRICE_ALERT_EVENTS_KEY,
  PRICE_ALERT_USER_INDEX_KEY,
  USER_DATA_DELETE_CONFIRMATION,
  priceAlertUserFingerprint,
  userDataKey,
} from '@/lib/user-data';

function makeDataRequest(method = 'GET', headers: Record<string, string> = {}) {
  return new Request('http://localhost:3000/api/me/data', { method, headers });
}

function userDataGetCallCount() {
  return vi.mocked(kv.get).mock.calls.filter(([key]) => String(key).startsWith('user:')).length;
}

describe('/api/me/data', () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it('exports user-owned cloud data without exposing the raw auth subject', async () => {
    store.set(userDataKey('user-1', 'favorites'), [{ hotelKey: 'g1-d1', name: 'Verified Hotel' }]);
    store.set(userDataKey('user-1', 'trips'), [{ id: 'h_trip1', hotelKey: 'g1-d1' }]);
    store.set(userDataKey('user-1', 'preferences'), { currency: 'USD' });
    store.set(userDataKey('user-1', 'priceAlerts'), [{ id: 'h_alert1', hotelKey: 'g1-d1' }]);

    const response = await GET(makeDataRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body.datasets.favorites).toHaveLength(1);
    expect(body.datasets.trips).toHaveLength(1);
    expect(body.datasets.priceAlerts).toHaveLength(1);
    expect(body.datasets.prefs.currency).toBe('USD');
    expect(body.counts).toMatchObject({ favorites: 1, trips: 1, priceAlerts: 1, prefs: 1 });
    expect(body.subjectFingerprint).toMatch(/^h_[0-9a-z]+$/);
    expect(JSON.stringify(body)).not.toContain('user-1');
  });

  it('rate-limits repeated account data exports before reading user datasets again', async () => {
    const headers = { 'x-forwarded-for': '198.51.100.44' };

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await GET(makeDataRequest('GET', headers));
      expect(response.status).toBe(200);
    }

    const userDataReadsBeforeBlockedRequest = userDataGetCallCount();
    const blocked = await GET(makeDataRequest('GET', headers));
    const body = await blocked.json();

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Cache-Control')).toBe('no-store');
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
    expect(body.error).toBe('Too many requests. Please try again later.');
    expect(userDataGetCallCount()).toBe(userDataReadsBeforeBlockedRequest);
  });

  it('requires an explicit confirmation header before deleting account data', async () => {
    const response = await DELETE(makeDataRequest('DELETE'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Deletion confirmation header required');
  });

  it('rejects cross-origin account deletion requests', async () => {
    const response = await DELETE(new Request('http://localhost:3000/api/me/data', {
      method: 'DELETE',
      headers: {
        origin: 'https://evil.example',
        host: 'localhost:3000',
        'x-sv-confirm-delete': USER_DATA_DELETE_CONFIRMATION,
      },
    }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Same-origin request required');
  });

  it('rate-limits repeated account data deletions before deleting again', async () => {
    const headers = {
      'x-forwarded-for': '198.51.100.45',
      'x-sv-confirm-delete': USER_DATA_DELETE_CONFIRMATION,
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await DELETE(makeDataRequest('DELETE', headers));
      expect(response.status).toBe(200);
    }

    const deleteCallsBeforeBlockedRequest = vi.mocked(kv.del).mock.calls.length;
    const blocked = await DELETE(makeDataRequest('DELETE', headers));
    const body = await blocked.json();

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Cache-Control')).toBe('no-store');
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
    expect(body.error).toBe('Too many requests. Please try again later.');
    expect(vi.mocked(kv.del)).toHaveBeenCalledTimes(deleteCallsBeforeBlockedRequest);
  });

  it('deletes user-owned cloud data and removes fingerprinted alert events', async () => {
    const fingerprint = priceAlertUserFingerprint('user-1');
    store.set(userDataKey('user-1', 'favorites'), [{ hotelKey: 'g1-d1', name: 'Verified Hotel' }]);
    store.set(userDataKey('user-1', 'trips'), [{ id: 'h_trip1', hotelKey: 'g1-d1' }]);
    store.set(userDataKey('user-1', 'preferences'), { currency: 'USD' });
    store.set(userDataKey('user-1', 'priceAlerts'), [{ id: 'h_alert1', hotelKey: 'g1-d1' }]);
    store.set(PRICE_ALERT_USER_INDEX_KEY, ['user-1', 'user-2']);
    store.set(PRICE_ALERT_EVENTS_KEY, [
      { id: 'event-1', userFingerprint: fingerprint },
      { id: 'event-2', userFingerprint: priceAlertUserFingerprint('user-2') },
    ]);

    const response = await DELETE(new Request('http://localhost:3000/api/me/data', {
      method: 'DELETE',
      headers: { 'x-sv-confirm-delete': USER_DATA_DELETE_CONFIRMATION },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body.deleted).toBe(true);
    expect(body.countsBeforeDeletion).toMatchObject({ favorites: 1, trips: 1, prefs: 1, priceAlerts: 1 });
    expect(body.operationalCleanup).toMatchObject({
      removedPriceAlertIndexEntries: 1,
      removedPriceAlertEvents: 1,
      rawUserIdInOperationalEvents: false,
    });
    expect(store.get(userDataKey('user-1', 'favorites'))).toBeUndefined();
    expect(store.get(userDataKey('user-1', 'trips'))).toBeUndefined();
    expect(store.get(userDataKey('user-1', 'preferences'))).toBeUndefined();
    expect(store.get(userDataKey('user-1', 'priceAlerts'))).toBeUndefined();
    expect(store.get(PRICE_ALERT_USER_INDEX_KEY)).toEqual(['user-2']);
    expect(store.get(PRICE_ALERT_EVENTS_KEY)).toEqual([{ id: 'event-2', userFingerprint: priceAlertUserFingerprint('user-2') }]);
    expect(JSON.stringify(body)).not.toContain('user-1');
  });
});
