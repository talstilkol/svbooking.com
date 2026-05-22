import { test, expect } from '@playwright/test';

test.describe('Hotel detail trust states', () => {
  test('shows unavailable review/rating states before provider comparison', async ({ page }) => {
    await page.route('**/api/hotel-amenities?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hotelKey: 'g297930-d305178',
          amenities: null,
          source: 'not-in-osm',
        }),
      });
    });

    await page.goto('/hotel/g297930-d305178');

    await expect(page.getByRole('heading', { name: 'Patong Beach Hotel', exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Rating unavailable/i).first()).toBeVisible();
    await expect(page.getByText(/Select dates above to compare provider-returned prices when available/i)).toBeVisible();
    await expect(page.getByText(/Verified amenity data is unavailable/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Verified guest review data/i)).toBeVisible({ timeout: 10_000 });
  });

  test('does not fabricate booking links and saves price watch locally when delivery is unavailable', async ({ page }) => {
    await page.route('**/api/compare?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hotel: {
            hotelKey: 'g297930-d305178',
            name: 'Patong Beach Hotel',
            city: 'Phuket',
            country: 'Thailand',
            image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
          },
          checkIn: '2027-01-10',
          checkOut: '2027-01-12',
          currency: 'USD',
          rates: [{
            provider: 'Verified Provider',
            code: 'verified-provider',
            rate: 120,
            tax: 0,
            total: 120,
            currency: 'USD',
            source: 'verified-provider',
            freshness: 'fresh',
            partial: false,
            deepLink: null,
            taxesIncluded: null,
            priceAccuracyState: 'unknown',
          }],
          cheapest: {
            provider: 'Verified Provider',
            code: 'verified-provider',
            rate: 120,
            tax: 0,
            total: 120,
            currency: 'USD',
            source: 'verified-provider',
            freshness: 'fresh',
            partial: false,
            deepLink: null,
            taxesIncluded: null,
            priceAccuracyState: 'unknown',
          },
          savingsPct: 0,
          savingsAmount: 0,
          providerCount: 1,
        }),
      });
    });

    await page.goto('/hotel/g297930-d305178');
    await page.getByLabel('Check-in').fill('2027-01-10');
    await page.getByLabel('Check-out').fill('2027-01-12');
    await page.getByRole('button', { name: /compare prices/i }).click();

    const unavailableProviderButton = page.getByRole('button', { name: 'Unavailable' });
    await expect(unavailableProviderButton).toBeVisible({ timeout: 10_000 });
    await expect(unavailableProviderButton).toBeDisabled();
    await expect(unavailableProviderButton).toHaveAttribute('title', 'Provider search unavailable');

    await page.getByRole('button', { name: /set price alert/i }).click();
    await expect(page.getByText(/verified provider prices only/i)).toBeVisible();
    await page.getByPlaceholder('Target price/night').fill('95');
    await page.getByRole('button', { name: /^Save$/ }).click();
    await expect(page.getByText(/Alert set: USD 95\/night/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Delivery unavailable until account storage/i)).toBeVisible();

    const stored = await page.evaluate(() => localStorage.getItem('price-alerts'));
    const alerts = JSON.parse(stored as string);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      hotelKey: 'g297930-d305178',
      hotelName: 'Patong Beach Hotel',
      city: 'Phuket',
      targetPrice: 95,
      currency: 'USD',
      storage: 'local',
      unsubscribeStatus: 'not-configured',
      sourcePolicy: 'verified-provider-prices-only',
    });
  });
});
