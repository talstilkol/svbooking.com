import { test, expect } from '@playwright/test';

test.describe('Compare page', () => {
  test('renders current catalog comparison page', async ({ page }) => {
    await page.goto('/compare');
    await expect(page.getByRole('heading', { name: /hotel price comparison/i })).toBeVisible();
    await expect(page.getByLabel('City', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /compare prices/i }).first()).toBeVisible();
  });

  test('loads current catalog controls without external price dependency', async ({ page }) => {
    await page.goto('/compare');
    await expect(page.getByLabel('City', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /compare prices/i }).first()).toBeVisible();
  });

  test('discloses source, freshness and unavailable provider links for rates', async ({ page }) => {
    await page.route('**/api/compare**', async (route) => {
      const url = new URL(route.request().url());
      if (!url.searchParams.get('hotelKey')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            cities: ['Paris'],
            hotels: [{
              hotelKey: 'g187147-d188728',
              name: 'Le Meurice',
              city: 'Paris',
              country: 'France',
              image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
            }],
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hotel: {
            hotelKey: 'g187147-d188728',
            name: 'Le Meurice',
            city: 'Paris',
            country: 'France',
            image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
          },
          checkIn: '2027-02-01',
          checkOut: '2027-02-03',
          currency: 'USD',
          rates: [{
            provider: 'Provider Without Link',
            code: 'nolink',
            rate: 120,
            tax: 0,
            total: 120,
            currency: 'USD',
            source: 'xotelo',
            freshness: 'live',
            partial: false,
            deepLink: null,
            taxesIncluded: true,
            priceAccuracyState: 'unobserved',
          }],
          cheapest: {
            provider: 'Provider Without Link',
            code: 'nolink',
            rate: 120,
            tax: 0,
            total: 120,
            currency: 'USD',
            source: 'xotelo',
            freshness: 'live',
            partial: false,
            deepLink: null,
            taxesIncluded: true,
            priceAccuracyState: 'unobserved',
          },
          mostExpensive: {
            provider: 'Provider Without Link',
            code: 'nolink',
            rate: 120,
            tax: 0,
            total: 120,
            currency: 'USD',
            source: 'xotelo',
            freshness: 'live',
            partial: false,
            deepLink: null,
            taxesIncluded: true,
            priceAccuracyState: 'unobserved',
          },
          savingsPct: 0,
          savingsAmount: 0,
          providerCount: 1,
        }),
      });
    });

    await page.goto('/compare');
    await page.getByRole('button', { name: /compare prices/i }).first().click();

    await expect(page.getByText(/Source: xotelo/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Freshness: live/i)).toBeVisible();
    await expect(page.getByText(/Complete provider response/i)).toBeVisible();
    await expect(page.getByText(/Taxes included/i)).toBeVisible();
    await expect(page.getByText(/Accuracy: unobserved/i)).toBeVisible();
    await expect(page.getByText(/Provider search unavailable/i)).toBeVisible();
  });
});

test.describe('Compare API', () => {
  test('catalog returns current hotel and city coverage', async ({ request }) => {
    const res = await request.get('/api/compare');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.hotels.length).toBeGreaterThanOrEqual(133);
    expect(body.cities.length).toBeGreaterThanOrEqual(46);
  });

  test('known hotel lookup returns catalog data without external price lookup', async ({ request }) => {
    const res = await request.get('/api/compare?hotelKey=g297930-d305178');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.hotel.hotelKey).toBe('g297930-d305178');
    expect(body.hotel.name).toBe('Patong Beach Hotel');
    expect(body.hotel.city).toBe('Phuket');
  });
});
