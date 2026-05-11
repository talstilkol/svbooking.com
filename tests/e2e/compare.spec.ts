import { test, expect } from '@playwright/test';

test.describe('Compare page', () => {
  test('renders with empty state', async ({ page }) => {
    await page.goto('/compare');
    await expect(page.getByRole('heading', { name: /compare hotel/i })).toBeVisible();
    await expect(page.getByText(/pick a hotel and dates/i)).toBeVisible();
  });

  test('loads live comparison via URL param', async ({ page }) => {
    await page.goto('/compare?hotelKey=g297930-d305178');
    // Live result from Xotelo - look for "Best deal" badge or providers list
    await expect(page.getByText(/Best deal/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/All providers/i)).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('Compare API', () => {
  test('catalog returns 15 hotels in 10 cities', async ({ request }) => {
    const res = await request.get('/api/compare');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.hotels.length).toBeGreaterThanOrEqual(15);
    expect(body.cities.length).toBeGreaterThanOrEqual(10);
  });

  test('live price comparison returns rates', async ({ request }) => {
    const res = await request.get('/api/compare?hotelKey=g297930-d305178&checkIn=2026-06-01&checkOut=2026-06-05');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.rates).toBeDefined();
    expect(body.rates.length).toBeGreaterThan(0);
    expect(body.cheapest).toBeTruthy();
    expect(body.cheapest.total).toBeGreaterThan(0);
  });
});
