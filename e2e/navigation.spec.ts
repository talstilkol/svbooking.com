import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('navbar is visible and has all links', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    await expect(nav.locator('a[href="/"]').first()).toBeVisible();

    const links = ['/search', '/compare', '/explore', '/trips', '/favorites', '/agents'];
    for (const href of links) {
      await expect(nav.locator(`a[href="${href}"]`).first()).toBeVisible();
    }
  });

  test('navbar links navigate to correct pages', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await page.locator('nav a[href="/search"]').first().click();
    await page.waitForURL('/search');

    await page.locator('nav a[href="/compare"]').first().click();
    await page.waitForURL('/compare');

    await page.locator('nav a[href="/explore"]').first().click();
    await page.waitForURL('/explore');

    await page.locator('nav a[href="/favorites"]').first().click();
    await page.waitForURL('/favorites');
  });

  test('mobile menu toggle works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'networkidle' });

    const menuButton = page.locator('button[aria-label="Toggle menu"]');
    await expect(menuButton).toBeVisible();

    await menuButton.click();
    await expect(page.locator('nav a[href="/search"]').last()).toBeVisible();

    await menuButton.click();
    await page.waitForTimeout(300);
  });
});
