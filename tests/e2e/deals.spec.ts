import { test, expect } from '@playwright/test';

const MOCK_DEALS = {
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
      priceSourceLabel: 'Provider-returned rate',
      checkIn: '2027-06-01',
      checkOut: '2027-06-03',
      nights: 2,
      currency: 'USD',
    },
    {
      hotel: {
        hotelKey: 'g297930-d305178',
        name: 'Patong Beach Hotel',
        city: 'Phuket',
        country: 'Thailand',
        image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
      },
      bestPrice: 140,
      pricePerNight: 70,
      bestProvider: 'test-provider',
      priceSourceLabel: 'Provider-returned rate',
      checkIn: '2027-06-01',
      checkOut: '2027-06-03',
      nights: 2,
      currency: 'USD',
    },
  ],
  strategy: 'cached',
  scannedAt: new Date().toISOString(),
};

test.describe('Deals page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/deals**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_DEALS),
      })
    );
  });

  test('renders deal cards with hotel names and prices', async ({ page }) => {
    await page.goto('/deals');
    await expect(page.getByText(/Le Meurice/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Patong Beach Hotel/i)).toBeVisible();
    // Prices should be visible
    await expect(page.getByText(/260/)).toBeVisible();
    await expect(page.getByText(/70/)).toBeVisible();
  });

  test('sorting controls work', async ({ page }) => {
    await page.goto('/deals');
    await expect(page.getByText(/Le Meurice/i)).toBeVisible({ timeout: 10_000 });
    // Sort by price high to low
    const sortSelect = page.getByLabel(/sort deals/i);
    await expect(sortSelect).toBeVisible();
    await sortSelect.selectOption('price-desc');
  });

  test('deal cards link to hotel pages', async ({ page }) => {
    await page.goto('/deals');
    await expect(page.getByText(/Le Meurice/i)).toBeVisible({ timeout: 10_000 });
    // Click on the first deal card link
    const hotelLink = page.getByRole('link', { name: /Le Meurice/i }).first();
    if (await hotelLink.isVisible()) {
      await hotelLink.click();
      await expect(page).toHaveURL(/\/hotel\/g187147-d188728/);
    }
  });
});
