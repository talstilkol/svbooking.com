import { test, expect } from '@playwright/test';

const HOTELS = [
  {
    hotelKey: 'g187147-d188728',
    name: 'Le Meurice',
    city: 'Paris',
    country: 'France',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
  },
  {
    hotelKey: 'g297930-d305178',
    name: 'Patong Beach Hotel',
    city: 'Phuket',
    country: 'Thailand',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
  },
];

function comparisonBody(hotel: typeof HOTELS[number], total: number, source: string, deepLink: string | null) {
  const rate = {
    provider: 'Verified Provider',
    code: 'verified-provider',
    rate: total,
    tax: 0,
    total,
    currency: 'USD',
    source,
    freshness: 'live',
    partial: false,
    deepLink,
    taxesIncluded: true,
    priceAccuracyState: 'unobserved',
  };

  return {
    hotel,
    checkIn: '2027-03-01',
    checkOut: '2027-03-03',
    currency: 'USD',
    rates: [rate],
    cheapest: rate,
    mostExpensive: rate,
    savingsPct: 0,
    savingsAmount: 0,
    providerCount: 1,
  };
}

test.describe('Side-by-side hotel comparison', () => {
  test('accepts saved compare keys and discloses rate provenance per hotel', async ({ page }) => {
    await page.route('**/api/compare**', async (route) => {
      const url = new URL(route.request().url());
      const hotelKey = url.searchParams.get('hotelKey');

      if (!hotelKey) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ cities: ['Paris', 'Phuket'], hotels: HOTELS }),
        });
        return;
      }

      const hotel = HOTELS.find((entry) => entry.hotelKey === hotelKey)!;
      const body = hotelKey === 'g187147-d188728'
        ? comparisonBody(hotel, 520, 'xotelo', null)
        : comparisonBody(hotel, 140, 'partner-provider', 'https://provider.example/hotel');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });

    await page.goto('/compare-hotels?keys=g187147-d188728,g297930-d305178');
    await expect(page.getByText(/Le Meurice/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Patong Beach Hotel/i)).toBeVisible();
    await page.getByRole('button', { name: /Compare 2 hotels/i }).click();

    await expect(page.getByText(/Source: xotelo/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Source: partner-provider/i).first()).toBeVisible();
    await expect(page.getByText(/Freshness: live/i).first()).toBeVisible();
    await expect(page.getByText(/Complete provider response/i).first()).toBeVisible();
    await expect(page.getByText(/Taxes included/i).first()).toBeVisible();
    await expect(page.getByText(/Accuracy: unobserved/i).first()).toBeVisible();
    await expect(page.getByText(/Provider search unavailable/i)).toBeVisible();
    await expect(page.getByText(/Provider link returned/i)).toBeVisible();
  });
});
