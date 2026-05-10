import { test, expect } from '@playwright/test';

test.describe('Explore Page', () => {
  test('renders continent buttons', async ({ page }) => {
    await page.goto('/explore', { waitUntil: 'networkidle' });
    await expect(page.locator('h1')).toContainText('Explore Destinations');
    await expect(page.locator('button', { hasText: 'Europe' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Asia' })).toBeVisible();
  });

  test('selecting continent shows countries', async ({ page }) => {
    await page.goto('/explore', { waitUntil: 'networkidle' });
    await page.locator('button', { hasText: 'Europe' }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('button', { hasText: /France|Italy|UK|Spain/ }).first()).toBeVisible();
  });

  test('date filters are present', async ({ page }) => {
    await page.goto('/explore', { waitUntil: 'networkidle' });
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
  });
});
