import { test, expect } from '@playwright/test';

async function expectRedirectToLogin(page: import('@playwright/test').Page, path: string) {
  const requestedUrls: string[] = [];
  page.on('request', (request) => {
    requestedUrls.push(request.url());
  });

  await page.goto(path, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await expect.poll(
    () => requestedUrls.some((url) => /auth|kinde|login/i.test(url)),
    { timeout: 10_000 }
  ).toBe(true);
}

test.describe('Auth-protected pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/^https:\/\/auth\.svbooking\.test.*/u, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>Auth</title>',
      });
    });
  });

  test('unauthenticated /dashboard redirects to login', async ({ page }) => {
    await expectRedirectToLogin(page, '/dashboard');
  });

  test('unauthenticated /agents redirects to login', async ({ page }) => {
    await expectRedirectToLogin(page, '/agents');
  });

  test('unauthenticated /profile redirects to login', async ({ page }) => {
    await expectRedirectToLogin(page, '/profile');
  });
});
