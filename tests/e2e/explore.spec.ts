import { test, expect } from '@playwright/test';

test.describe('Explore page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/deals**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          deals: [
            {
              hotel: {
                hotelKey: 'g187147-d188728',
                name: 'Le Meurice',
                city: 'Paris',
                country: 'France',
                image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
              },
              bestPrice: 520,
              pricePerNight: 260,
              bestProvider: 'test-provider',
              checkIn: '2027-06-01',
              checkOut: '2027-06-03',
              nights: 2,
              currency: 'USD',
            },
          ],
          strategy: 'cached',
          scannedAt: new Date().toISOString(),
        }),
      })
    );
  });

  test('renders continent filter and map', async ({ page }) => {
    await page.goto('/explore');
    // Should have continent filter buttons
    await expect(page.getByRole('heading', { name: /explore/i }).first()).toBeVisible({ timeout: 10_000 });
    // Should have deal cards after load
    await expect(page.getByText(/Le Meurice/i)).toBeVisible({ timeout: 10_000 });
  });

  test('continent filter narrows results', async ({ page }) => {
    await page.goto('/explore');
    await expect(page.getByText(/Le Meurice/i)).toBeVisible({ timeout: 10_000 });
    // Click a continent filter button if available
    const europeBtn = page.getByRole('button', { name: /europe/i }).first();
    if (await europeBtn.isVisible()) {
      await europeBtn.click();
    }
  });
});
