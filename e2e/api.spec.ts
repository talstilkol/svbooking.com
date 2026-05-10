import { test, expect } from '@playwright/test';

test.describe('API Routes', () => {
  test('GET /api/compare returns hotel catalog', async ({ request }) => {
    const res = await request.get('/api/compare');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.hotels).toBeDefined();
    expect(Array.isArray(data.hotels)).toBeTruthy();
    expect(data.hotels.length).toBeGreaterThan(0);
    expect(data.cities).toBeDefined();

    const hotel = data.hotels[0];
    expect(hotel.hotelKey).toBeDefined();
    expect(hotel.name).toBeDefined();
    expect(hotel.city).toBeDefined();
    expect(hotel.country).toBeDefined();
    expect(hotel.image).toBeDefined();
  });

  test('GET /api/compare with hotelKey returns rates structure', async ({ request }) => {
    const catalogRes = await request.get('/api/compare');
    const catalog = await catalogRes.json();
    const hotel = catalog.hotels[0];

    const today = new Date();
    const checkIn = new Date(today.getTime() + 5 * 86400000).toISOString().slice(0, 10);
    const checkOut = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);

    const res = await request.get(`/api/compare?hotelKey=${hotel.hotelKey}&checkIn=${checkIn}&checkOut=${checkOut}`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.hotel).toBeDefined();
    expect(data.rates).toBeDefined();
    expect(Array.isArray(data.rates)).toBeTruthy();
  });

  test('GET /api/deals returns response', async ({ request }) => {
    const res = await request.get('/api/deals?continent=europe');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.deals).toBeDefined();
    expect(Array.isArray(data.deals)).toBeTruthy();
  });

  test('GET /api/agents/health-check returns status', async ({ request }) => {
    const res = await request.get('/api/agents/health-check');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.status).toBeDefined();
  });
});
