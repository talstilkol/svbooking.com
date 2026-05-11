import { test, expect } from '@playwright/test';

test.describe('Auth-protected pages', () => {
  test('unauthenticated /dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/auth|kinde|login/i, { timeout: 10_000 }).catch(() => {});
    expect(page.url()).toMatch(/auth|kinde|login/i);
  });

  test('unauthenticated /profile redirects to login', async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/auth|kinde|login/i, { timeout: 10_000 }).catch(() => {});
    expect(page.url()).toMatch(/auth|kinde|login/i);
  });
});
