import { test, expect } from '@playwright/test';

test.describe('About page', () => {
  test('renders heading, stats, and team values', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: /about sv booking/i })).toBeVisible();
    // Dynamic catalog stats (number and label are in separate elements)
    await expect(page.getByText('Hotels', { exact: true })).toBeVisible();
    await expect(page.getByText('Cities', { exact: true })).toBeVisible();
    await expect(page.getByText('Countries', { exact: true })).toBeVisible();
    // Team values section
    await expect(page.getByText('What We Stand For')).toBeVisible();
    await expect(page.getByText('Transparency')).toBeVisible();
  });

  test('has correct metadata', async ({ page }) => {
    await page.goto('/about');
    await expect(page).toHaveTitle(/About SV Booking/i);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /\/about$/);
  });

  test('breadcrumb links back to home', async ({ page }) => {
    await page.goto('/about');
    const homeLink = page.getByRole('link', { name: /home/i }).first();
    await expect(homeLink).toBeVisible();
  });
});

test.describe('Contact page', () => {
  test('renders contact methods and FAQ', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: /contact/i }).first()).toBeVisible();
    await expect(page.getByText('hello@svbooking.com')).toBeVisible();
    await expect(page.getByText(/bug reports/i)).toBeVisible();
    await expect(page.getByText(/partnerships/i)).toBeVisible();
  });

  test('has FAQPage JSON-LD structured data', async ({ page }) => {
    await page.goto('/contact');
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    const faqSchema = jsonLd.find((text) => text.includes('FAQPage'));
    expect(faqSchema).toBeDefined();
    const parsed = JSON.parse(faqSchema!);
    expect(parsed['@type']).toBe('FAQPage');
    expect(parsed.mainEntity.length).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Privacy page', () => {
  test('renders privacy policy content', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page).toHaveTitle(/Privacy Policy/i);
    await expect(page.getByRole('heading', { name: /Privacy Policy/i })).toBeVisible();
    await expect(page.getByText(/Data We Collect/i)).toBeVisible();
    await expect(page.getByText(/Last updated/i)).toBeVisible();
  });
});

test.describe('Terms page', () => {
  test('renders terms of service content', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: /Terms of Service/i })).toBeVisible();
    await expect(page.getByText(/Last updated/i)).toBeVisible();
  });
});

test.describe('Offline page', () => {
  test('renders offline fallback content', async ({ page }) => {
    await page.goto('/offline');
    await expect(page.getByText(/offline/i).first()).toBeVisible();
  });
});
