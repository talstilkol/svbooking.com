import { test, expect } from '@playwright/test';

test.describe('Search page', () => {
  test('lists hotels from catalog', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByText(/Showing\s+1[–-]18\s+of\s+\d+\s+hotels/i)).toBeVisible({ timeout: 10_000 });
    const cards = page.locator('h2:has-text("Hilton"), h2:has-text("Le Meurice"), h2:has-text("The Savoy")');
    await expect(cards.first()).toBeVisible();
  });

  test('filter by country chip', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByText(/Showing/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'France', exact: true }).click();
    await expect(page.getByText(/Showing\s+1[–-]5\s+of\s+5\s+hotels/i)).toBeVisible();
  });

  test('filter by URL param', async ({ page }) => {
    await page.goto('/search?city=Tokyo');
    await expect(page.getByText(/Showing\s+1[–-]4\s+of\s+4\s+hotels/i)).toBeVisible({ timeout: 10_000 });
  });

  test('map view exposes accessible location provenance', async ({ page }) => {
    await page.goto('/search?city=Phuket');
    await page.getByRole('button', { name: /map view/i }).click();

    await expect(page.getByRole('heading', { name: /hotel map/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: /map locations/i })).toBeVisible();
    await expect(page.getByText(/Exact property pins are used only when verified coordinates exist/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Phuket\s+2 hotels\s+City cluster fallback/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /City cluster: Phuket/i })).toBeVisible();
  });

  test('advanced filters disclose unavailable verified-data state', async ({ page }) => {
    await page.goto('/search');
    await page.getByRole('button', { name: /filters/i }).click();
    await expect(page.getByText(/disabled until verified property data is connected/i)).toBeVisible();
    await expect(page.getByRole('button', { name: '5+' })).toBeDisabled();
    await expect(page.getByPlaceholder('Min')).toBeDisabled();
  });

  test('favorite toggle persists in localStorage', async ({ page }) => {
    await page.goto('/search?city=Tokyo');
    await expect(page.getByText(/Showing\s+1[–-]4\s+of/i)).toBeVisible({ timeout: 10_000 });
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
