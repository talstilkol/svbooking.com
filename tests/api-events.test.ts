import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
  kvGet: vi.fn(async (key: string) => mocks.store.get(key) ?? null),
  kvSetWithTTL: vi.fn(async (key: string, value: unknown) => {
    mocks.store.set(key, value);
  }),
  isConfigured: vi.fn(() => true),
  getEvents: vi.fn(async () => [{
    name: 'Roland Garros',
    month: 'Jul 15',
    icon: '',
    description: 'Court Philippe-Chatrier',
    date: '2026-07-15',
    priceRange: '',
    ticketUrl: 'https://www.ticketmaster.fr/roland-garros',
    venue: 'Court Philippe-Chatrier',
  }]),
  getCityCoordinate: vi.fn((city: string) => (
    city === 'Paris' ? { lat: 48.8566, lng: 2.3522 } : null
  )),
  rateLimitCheck: vi.fn(async () => ({ success: true, reset: 1_800_000_000_000 })),
}));

vi.mock('@/lib/kv', () => ({
  kv: {
    get: mocks.kvGet,
    setWithTTL: mocks.kvSetWithTTL,
  },
}));

vi.mock('@/lib/ticketmaster', () => ({
  isConfigured: mocks.isConfigured,
  getEvents: mocks.getEvents,
}));

vi.mock('@/lib/city-coordinates', () => ({
  getCityCoordinate: mocks.getCityCoordinate,
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({ check: mocks.rateLimitCheck })),
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimitResponse: vi.fn((reset: number) => Response.json({ error: 'Rate limit exceeded', reset }, { status: 429 })),
}));

import { GET } from '@/app/api/events/route';

function request(query: string) {
  return new Request(`http://localhost:3000/api/events?${query}`);
}

describe('GET /api/events', () => {
  beforeEach(() => {
    mocks.store.clear();
    mocks.kvGet.mockClear();
    mocks.kvSetWithTTL.mockClear();
    mocks.isConfigured.mockReturnValue(true);
    mocks.getEvents.mockClear();
    mocks.getCityCoordinate.mockClear();
    mocks.rateLimitCheck.mockClear();
  });

  it('rejects malformed decimal coordinates before cache or provider access', async () => {
    const response = await GET(request('lat=48abc&lon=2.3522&startDate=2026-07-01&endDate=2026-07-31'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.error).toBe('lat/lon must be valid decimal degrees');
    expect(mocks.kvGet).not.toHaveBeenCalled();
    expect(mocks.getEvents).not.toHaveBeenCalled();
  });

  it('rejects out-of-range coordinates before cache or provider access', async () => {
    const response = await GET(request('lat=91&lon=2.3522&startDate=2026-07-01&endDate=2026-07-31'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('lat/lon must be within valid coordinate bounds');
    expect(mocks.kvGet).not.toHaveBeenCalled();
    expect(mocks.getEvents).not.toHaveBeenCalled();
  });

  it('rejects invalid event date filters before cache or provider access', async () => {
    const response = await GET(request('city=Paris&startDate=2026-02-30&endDate=2026-07-31'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('startDate must be a valid YYYY-MM-DD date');
    expect(mocks.kvGet).not.toHaveBeenCalled();
    expect(mocks.getEvents).not.toHaveBeenCalled();
  });

  it('rejects reversed event date ranges before cache or provider access', async () => {
    const response = await GET(request('city=Paris&startDate=2026-08-01&endDate=2026-07-31'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('startDate must be on or before endDate');
    expect(mocks.kvGet).not.toHaveBeenCalled();
    expect(mocks.getEvents).not.toHaveBeenCalled();
  });

  it('fetches and caches events for validated coordinates and dates', async () => {
    const response = await GET(request('lat=48.8566&lon=2.3522&startDate=2026-07-01&endDate=2026-07-31'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe('ticketmaster');
    expect(body.events).toHaveLength(1);
    expect(mocks.getEvents).toHaveBeenCalledWith(expect.objectContaining({
      lat: 48.8566,
      lon: 2.3522,
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    }));
    expect(mocks.kvSetWithTTL).toHaveBeenCalledWith(
      'events:live:48.9:2.4:2026-07-01:2026-07-31',
      body.events,
      21600
    );
  });

  it('serves cached validated event data without calling the provider', async () => {
    const cachedEvents = [{ name: 'Roland Garros', date: '2026-07-15' }];
    mocks.store.set('events:live:48.9:2.4:2026-07-01:2026-07-31', cachedEvents);

    const response = await GET(request('city=Paris&startDate=2026-07-01&endDate=2026-07-31'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe('cache');
    expect(body.city).toBe('Paris');
    expect(body.events).toEqual(cachedEvents);
    expect(mocks.getEvents).not.toHaveBeenCalled();
  });
});
