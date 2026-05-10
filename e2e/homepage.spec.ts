import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('renders hero section with search', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('h1')).toContainText('Find Your Perfect Stay');
  });

  test('search bar is present', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const input = page.locator('input').first();
    await expect(input).toBeVisible();
  });

  test('feature cards are displayed', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByText('Wide Selection')).toBeVisible();
    await expect(page.getByText('Best Prices')).toBeVisible();
  });

  test('quick links navigate correctly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('a[href="/compare"]', { hasText: 'Compare Prices' }).click();
    await page.waitForURL('/compare');
  });

  test('destination explorer section loads', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByText('Explore Destinations').first()).toBeVisible();
  });
});
