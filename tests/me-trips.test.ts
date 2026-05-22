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
  },
}));

import { DELETE, POST } from '@/app/api/me/trips/route';

function makePostRequest(body: Record<string, unknown>, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/me/trips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('/api/me/trips', () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it('preserves a valid deterministic client trip id for local/cloud sync', async () => {
    const res = await POST(makePostRequest({
      id: 'h_abc123',
      hotelKey: 'g297930-d305178',
      hotelName: 'Verified Hotel',
      checkIn: '2026-06-01',
      checkOut: '2026-06-05',
      guests: 2,
    }));

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = await res.json();
    expect(body.trip.id).toBe('h_abc123');
  });

  it('falls back to a server-generated deterministic id for invalid client ids', async () => {
    const res = await POST(makePostRequest({
      id: '../bad',
      hotelKey: 'g297930-d305178',
      hotelName: 'Verified Hotel',
      checkIn: '2026-06-01',
      checkOut: '2026-06-05',
      guests: 2,
    }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.trip.id).toMatch(/^h_[0-9a-z]+$/);
    expect(body.trip.id).not.toBe('../bad');
  });

  it('deletes a client-synced trip by the same deterministic id', async () => {
    await POST(makePostRequest({
      id: 'h_delete1',
      hotelKey: 'g297930-d305178',
      hotelName: 'Verified Hotel',
      checkIn: '2026-06-01',
      checkOut: '2026-06-05',
      guests: 2,
    }));

    const res = await DELETE(
      new Request('http://localhost:3000/api/me/trips?id=h_delete1', { method: 'DELETE' })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = await res.json();
    expect(body.trips).toEqual([]);
  });

  it('rate-limits repeated user trip mutations before writing more trips', async () => {
    const headers = { 'x-forwarded-for': '198.51.100.30' };

    for (let index = 0; index < 30; index += 1) {
      const res = await POST(makePostRequest({
        id: `h_${index.toString(36)}`,
        hotelKey: 'g297930-d305178',
        hotelName: 'Verified Hotel',
        checkIn: '2026-06-01',
        checkOut: '2026-06-05',
        guests: 2,
      }, headers));
      expect(res.status).toBe(200);
    }

    const blocked = await POST(makePostRequest({
      id: 'h_blocked',
      hotelKey: 'g297930-d305178',
      hotelName: 'Verified Hotel',
      checkIn: '2026-06-01',
      checkOut: '2026-06-05',
      guests: 2,
    }, headers));
    const body = await blocked.json();

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Cache-Control')).toBe('no-store');
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
    expect(body.error).toBe('Too many requests. Please try again later.');
    expect(store.get('user:user-1:trips')).toHaveLength(30);
  });
});
