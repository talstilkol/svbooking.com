import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();

vi.mock('@/lib/kv', () => ({
  kv: {
    get: vi.fn(async (key: string) => store.get(key) || null),
    setWithTTL: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
  },
}));

vi.mock('@/lib/hotels-catalog', () => ({
  findHotel: vi.fn((hotelKey: string) => (
    hotelKey === 'g187147-d188732'
      ? { hotelKey, name: 'Le Meurice', city: 'Paris', country: 'France' }
      : null
  )),
}));

vi.mock('@/lib/city-coordinates', () => ({
  getCityCoordinate: vi.fn(() => ({ lat: 48.8566, lng: 2.3522 })),
}));

vi.mock('@/lib/overpass-pois', () => ({
  getHotelAmenities: vi.fn(async () => ({
    stars: 5,
  })),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({
    check: vi.fn(async () => ({ success: true, reset: Date.now() + 60000 })),
  })),
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimitResponse: vi.fn((reset: number) => Response.json({ error: 'Rate limit exceeded', reset }, { status: 429 })),
}));

import { GET } from '@/app/api/hotel-amenities/route';

function request(hotelKey: string) {
  return new Request(`http://localhost:3000/api/hotel-amenities?key=${hotelKey}`);
}

describe('GET /api/hotel-amenities', () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it('rejects unknown hotel keys instead of returning placeholder amenity state', async () => {
    const response = await GET(request('g0-d0'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Hotel not found');
    expect(body.amenities).toBeNull();
  });

  it('labels live and cached amenity data as OSM-sourced', async () => {
    const live = await GET(request('g187147-d188732'));
    const liveBody = await live.json();

    expect(live.status).toBe(200);
    expect(liveBody.source).toBe('osm');
    expect(liveBody.amenities).toBeNull();
    expect(liveBody.stars).toBe(5);

    const cached = await GET(request('g187147-d188732'));
    const cachedBody = await cached.json();

    expect(cached.status).toBe(200);
    expect(cachedBody.source).toBe('osm-cache');
    expect(cachedBody.amenities).toBeNull();
    expect(cachedBody.stars).toBe(5);
  });
});
