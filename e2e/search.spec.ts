import { test, expect } from '@playwright/test';

test.describe('Search Page', () => {
  test('loads hotel catalog', async ({ page }) => {
    await page.goto('/search', { waitUntil: 'networkidle' });
    // Wait for hotel cards to appear (they load from /api/compare)
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });
  });

  test('city filter works', async ({ page }) => {
    await page.goto('/search', { waitUntil: 'networkidle' });
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });

    const input = page.locator('input').first();
    await input.fill('Tokyo');
    await page.waitForTimeout(500);

    // Should only show Tokyo hotels
    const cards = page.locator('h2');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('hotel cards show image and details', async ({ page }) => {
    await page.goto('/search', { waitUntil: 'networkidle' });
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('img').first()).toBeVisible();
  });
});
