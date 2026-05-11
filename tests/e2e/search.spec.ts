import { test, expect } from '@playwright/test';

test.describe('Search page', () => {
  test('lists hotels from catalog', async ({ page }) => {
    await page.goto('/search');
    // Catalog loads 15 hotels
    await expect(page.getByText(/Showing \d+ of \d+ hotels/i)).toBeVisible({ timeout: 10_000 });
    const cards = page.locator('h2:has-text("Hilton"), h2:has-text("Le Meurice"), h2:has-text("The Savoy")');
    await expect(cards.first()).toBeVisible();
  });

  test('filter by city via chip', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByText(/Showing/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Paris', exact: true }).click();
    await expect(page.getByText(/Showing 2 of 15 hotels/i)).toBeVisible();
  });

  test('filter by URL param', async ({ page }) => {
    await page.goto('/search?city=Tokyo');
    await expect(page.getByText(/Showing 1 of 15 hotels/i)).toBeVisible({ timeout: 10_000 });
  });

  test('favorite toggle persists in localStorage', async ({ page }) => {
    await page.goto('/search?city=Tokyo');
    await expect(page.getByText(/Showing 1 of/i)).toBeVisible({ timeout: 10_000 });
    const favBtn = page.getByRole('button', { name: /add to favorites/i }).first();
    await favBtn.click();
    // Toast appears
    await expect(page.getByText(/added .* to favorites/i)).toBeVisible({ timeout: 3000 });
    // Reload and verify localStorage persisted
    await page.reload();
    await expect(page.getByText(/Showing/i)).toBeVisible({ timeout: 10_000 });
    const stored = await page.evaluate(() => localStorage.getItem('svbooking:favorites'));
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored as string).length).toBeGreaterThan(0);
  });
});
