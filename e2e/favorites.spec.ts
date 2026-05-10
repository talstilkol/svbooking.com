import { test, expect } from '@playwright/test';

test.describe('Favorites Page', () => {
  test('shows empty state initially', async ({ page }) => {
    await page.goto('/favorites', { waitUntil: 'networkidle' });
    await expect(page.locator('h1')).toContainText('My Favorite Hotels');
    await expect(page.getByText('No favorites yet')).toBeVisible();
  });

  test('favorites persist in localStorage', async ({ page }) => {
    await page.goto('/favorites', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      const fav = [{
        hotelKey: 'test-hotel',
        name: 'Test Hotel',
        city: 'Paris',
        country: 'France',
        image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600'
      }];
      localStorage.setItem('svbooking:favorites', JSON.stringify(fav));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText('Test Hotel')).toBeVisible({ timeout: 5000 });
  });
});
