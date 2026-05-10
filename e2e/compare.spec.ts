import { test, expect } from '@playwright/test';

test.describe('Compare Page', () => {
  test('loads with city filter and date pickers', async ({ page }) => {
    await page.goto('/compare', { waitUntil: 'networkidle' });
    await expect(page.locator('h1')).toContainText('Hotel Price Comparison');
    await expect(page.locator('select')).toBeVisible();
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
    await expect(page.locator('input[type="date"]').nth(1)).toBeVisible();
  });

  test('loads hotel cards from catalog', async ({ page }) => {
    await page.goto('/compare', { waitUntil: 'networkidle' });
    const buttons = page.locator('button', { hasText: 'Compare prices' });
    await expect(buttons.first()).toBeVisible({ timeout: 15000 });
  });

  test('city filter narrows hotel list', async ({ page }) => {
    await page.goto('/compare', { waitUntil: 'networkidle' });
    await expect(page.locator('button', { hasText: 'Compare prices' }).first()).toBeVisible({ timeout: 15000 });

    const select = page.locator('select');
    await select.selectOption({ index: 1 });
    await page.waitForTimeout(300);

    const buttons = page.locator('button', { hasText: 'Compare prices' });
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(15);
  });

  test('compare button triggers price fetch', async ({ page }) => {
    await page.goto('/compare', { waitUntil: 'networkidle' });
    await expect(page.locator('button', { hasText: 'Compare prices' }).first()).toBeVisible({ timeout: 15000 });

    await page.locator('button', { hasText: 'Compare prices' }).first().click();
    await expect(page.locator('button', { hasText: 'Comparing...' }).first()).toBeVisible();

    // Wait for response
    await page.waitForTimeout(15000);

    // Should show either rates or "No rates available" or "Refresh prices"
    const hasResult = await page.locator('button', { hasText: /Refresh prices/ }).first().isVisible()
      .catch(() => false);
    const noRates = await page.getByText('No rates available').isVisible().catch(() => false);
    expect(hasResult || noRates).toBeTruthy();
  });

  test('external booking links have correct attributes', async ({ page }) => {
    await page.goto('/compare', { waitUntil: 'networkidle' });
    await expect(page.locator('button', { hasText: 'Compare prices' }).first()).toBeVisible({ timeout: 15000 });

    await page.locator('button', { hasText: 'Compare prices' }).first().click();
    await page.waitForTimeout(15000);

    const rateLinks = page.locator('a[target="_blank"][rel="noopener noreferrer"]');
    const count = await rateLinks.count();
    if (count > 0) {
      const href = await rateLinks.first().getAttribute('href');
      expect(href).toMatch(/^https:\/\//);
    }
  });
});
