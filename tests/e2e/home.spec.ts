import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('renders hero, navbar and stats', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByRole('heading', { name: /find the best hotel deal/i })).toBeVisible();
    await expect(page.getByPlaceholder(/where do you want to go/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /how it works/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /trending destinations/i })).toBeVisible();
  });

  test('hero search navigates to /search', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/where do you want to go/i).fill('Paris');
    await page.getByRole('button', { name: /explore/i }).click();
    await expect(page).toHaveURL(/\/search\?city=Paris/i);
  });

  test('popular chips navigate', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Tel Aviv' }).first().click();
    await expect(page).toHaveURL(/\/search\?city=/i);
  });

  test('navbar links are visible on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    for (const label of ['Home', 'Hotels', 'Compare', 'Trips', 'Favorites']) {
      await expect(page.getByRole('link', { name: new RegExp(`^${label}$`, 'i') }).first()).toBeVisible();
    }
  });
});
