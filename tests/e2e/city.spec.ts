import { test, expect } from '@playwright/test';

test.describe('City page verified content states', () => {
  test('does not render static city-guide claims when source data is unavailable', async ({ page }) => {
    await page.route('**/api/travel-guide?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          city: 'Paris',
          section: 'overview',
          data: null,
          source: 'not-found',
        }),
      });
    });

    await page.goto('/city/Paris');

    await expect(page.getByRole('heading', { name: /Hotels in Paris/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Paris Guide Source/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/City-guide summary unavailable/i)).toBeVisible();
    await expect(page.getByText(/Best time/i)).toHaveCount(0);
    await expect(page.getByText(/Beach lovers|Foodies|Nightlife|Romance/i)).toHaveCount(0);
  });
});
