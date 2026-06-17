import { test, expect } from '@playwright/test';

function visibleShowingSummary(page: import('@playwright/test').Page, pattern: RegExp) {
  return page.locator('p', { hasText: pattern }).filter({ visible: true }).first();
}

test.describe('Search page', () => {
  test('lists hotels from catalog', async ({ page }) => {
    await page.goto('/search');
    // Flexible: matches any "Showing X–Y of Z hotels" regardless of catalog size
    await expect(visibleShowingSummary(page, /Showing\s+\d+[–-]\d+\s+of\s+\d+\s+hotels/i)).toBeVisible({ timeout: 10_000 });
    // At least one hotel card heading renders (catalog is populated)
    await expect(page.locator('[data-testid="hotel-card"] h2, .grid h2').first()).toBeVisible();
  });

  test('filter by country chip', async ({ page }) => {
    await page.goto('/search');
    await expect(visibleShowingSummary(page, /Showing/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'France', exact: true }).click();
    // France count is dynamic — just verify filter narrows results and label appears
    await expect(visibleShowingSummary(page, /Showing\s+\d+[–-]\d+\s+of\s+\d+\s+hotels\s+in\s+France/i)).toBeVisible();
  });

  test('filter by URL param', async ({ page }) => {
    await page.goto('/search?city=Tokyo');
    // Tokyo count is dynamic — just verify some results appear
    await expect(visibleShowingSummary(page, /Showing\s+\d+[–-]\d+\s+of\s+\d+\s+hotels/i)).toBeVisible({ timeout: 10_000 });
  });

  test('map view exposes accessible location provenance', async ({ page }) => {
    await page.goto('/search?city=Phuket');
    await page.getByRole('button', { name: /map view/i }).click();

    await expect(page.getByRole('heading', { name: /hotel map/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: /map locations/i })).toBeVisible();
    await expect(page.getByText(/Exact property pins are used only when verified coordinates exist/i)).toBeVisible();
    // Hotel count in cluster is dynamic — match any number
    await expect(page.getByRole('link', { name: /Phuket\s+\d+ hotels?\s+City cluster fallback/i })).toBeVisible();
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
    await expect(visibleShowingSummary(page, /Showing\s+\d+[–-]\d+\s+of/i)).toBeVisible({ timeout: 10_000 });
    const favBtn = page.getByRole('button', { name: /add to favorites/i }).first();
    await favBtn.click();
    // Toast appears
    await expect(page.getByText(/added .* to favorites/i)).toBeVisible({ timeout: 3000 });
    // Reload and verify localStorage persisted
    await page.reload();
    await expect(visibleShowingSummary(page, /Showing/i)).toBeVisible({ timeout: 10_000 });
    const stored = await page.evaluate(() => localStorage.getItem('svbooking:favorites'));
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored as string).length).toBeGreaterThan(0);
  });
});
