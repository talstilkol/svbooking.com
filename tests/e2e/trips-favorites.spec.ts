import { test, expect } from '@playwright/test';

test.describe('Trips page', () => {
  test('shows empty state', async ({ page }) => {
    await page.goto('/trips');
    await expect(page.getByRole('heading', { name: /my trips/i })).toBeVisible();
    await expect(page.getByText(/no trips planned yet/i)).toBeVisible();
  });

  test('opens form when New trip clicked', async ({ page }) => {
    await page.goto('/trips');
    await page.getByRole('button', { name: /new trip/i }).click();
    await expect(page.getByRole('button', { name: /save trip/i })).toBeVisible();
  });

  test('validates date order in form', async ({ page }) => {
    await page.goto('/trips');
    await page.getByRole('button', { name: /new trip/i }).click();
    await page.locator('select').first().selectOption({ index: 1 });
    const ins = page.locator('input[type="date"]');
    await ins.nth(0).fill('2027-01-10');
    await ins.nth(1).fill('2027-01-05');
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
            image: 'https://example.com/x.jpg',
            addedAt: new Date().toISOString(),
          },
        ])
      );
    });
    await page.goto('/favorites');
    await expect(page.getByText(/Patong Beach Hotel/i)).toBeVisible({ timeout: 10_000 });
  });
});
