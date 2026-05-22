import { test, expect } from '@playwright/test';

test.describe('Trips page', () => {
  test('shows empty state', async ({ page }) => {
    await page.goto('/trips');
    await expect(page.getByRole('heading', { name: /my trips/i })).toBeVisible();
    await expect(page.getByText(/no trips planned yet/i)).toBeVisible();
  });

  test('shows the trip form', async ({ page }) => {
    await page.goto('/trips');
    await expect(page.getByRole('heading', { name: /plan a new trip/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /save trip/i })).toBeVisible();
  });

  test('validates date order in form', async ({ page }) => {
    await page.goto('/trips');
    await page.getByLabel('Hotel').selectOption('g297930-d305178');
    await page.getByLabel('Check-in').fill('2027-01-10');
    await page.getByLabel('Check-out').fill('2027-01-05');
    await page.getByRole('button', { name: /save trip/i }).click();
    await expect(page.getByText(/check-in must be before check-out/i)).toBeVisible();
  });

  test('with ?hotelKey opens form pre-filled', async ({ page }) => {
    await page.goto('/trips?hotelKey=g297930-d305178');
    await expect(page.getByRole('button', { name: /save trip/i })).toBeVisible();
  });
});

test.describe('Favorites page', () => {
  test('empty state by default', async ({ page }) => {
    await page.goto('/favorites');
    await expect(page.getByRole('heading', { name: /my favorites/i })).toBeVisible();
    await expect(page.getByText(/no favorites yet/i)).toBeVisible();
  });

  test('seeded localStorage shows favorite', async ({ page, context }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem(
        'svbooking:favorites',
        JSON.stringify([
          {
            hotelKey: 'g297930-d305178',
            name: 'Patong Beach Hotel',
            city: 'Phuket',
            country: 'Thailand',
            image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
            addedAt: new Date().toISOString(),
          },
        ])
      );
    });
    await page.goto('/favorites');
    await expect(page.getByText(/Patong Beach Hotel/i)).toBeVisible({ timeout: 10_000 });
  });

  test('price-watch dashboard shows only valid active local alerts', async ({ page, context }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem(
        'price-alerts',
        JSON.stringify([
          {
            hotelKey: 'g297930-d305178',
            hotelName: 'Patong Beach Hotel',
            city: 'Phuket',
            targetPrice: 120,
            currency: 'USD',
            storage: 'local',
            sourcePolicy: 'verified-provider-prices-only',
            createdAt: '2026-06-01T00:00:00.000Z',
          },
          {
            hotelKey: 'g3145596-d3145596',
            hotelName: 'Le Meurice',
            city: 'Paris',
            targetPrice: 480,
            currency: 'EUR',
            status: 'cancelled',
            createdAt: '2026-06-01T00:00:00.000Z',
          },
          {
            hotelKey: 'incomplete-alert',
            hotelName: 'Incomplete alert',
            city: 'Paris',
          },
        ])
      );
    });

    await page.goto('/favorites');
    await expect(page.getByRole('heading', { name: /price alerts/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Patong Beach Hotel/i)).toBeVisible();
    await expect(page.getByText(/Local device/i)).toBeVisible();
    await expect(page.getByText(/Delivery unavailable until account storage/i)).toBeVisible();
    await expect(page.getByText(/Le Meurice/i)).toHaveCount(0);
    await expect(page.getByText(/Incomplete alert/i)).toHaveCount(0);

    await page.getByRole('button', { name: /remove alert for Patong Beach Hotel/i }).click();
    await expect(page.getByRole('heading', { name: /price alerts/i })).toHaveCount(0);
    const stored = await page.evaluate(() => localStorage.getItem('price-alerts'));
    expect(JSON.parse(stored as string)).toEqual([]);
  });
});
