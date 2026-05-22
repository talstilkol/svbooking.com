import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('renders hero, navbar and stats', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: /main navigation/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /compare hotel rates/i })).toBeVisible();
    await expect(page.getByLabel(/search for a hotel or city/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /how it works/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Catalog destinations', exact: true })).toBeVisible();
  });

  test('hero search navigates to /search', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/search for a hotel or city/i).fill('Paris');
    await page.getByRole('option', { name: /Browse all hotels/i }).click();
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
    for (const label of ['Search', 'Compare', 'Trips', 'Favorites']) {
      await expect(page.getByRole('link', { name: new RegExp(`^${label}$`, 'i') }).first()).toBeVisible();
    }
    await expect(page.getByRole('link', { name: /SV Booking home/i })).toBeVisible();
  });
});
