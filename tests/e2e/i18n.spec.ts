import { test, expect } from '@playwright/test';

test.describe('i18n and RTL runtime', () => {
  test('i18n API selects Hebrew from query and formats sample values', async ({ request }) => {
    const response = await request.get('/api/i18n?locale=he&date=2026-06-01&amount=120&currency=USD');
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.selected.locale).toBe('he');
    expect(body.selected.dir).toBe('rtl');
    expect(body.selected.dictionary.priceUnavailable).toBe('מחיר לא זמין');
    expect(body.selected.formatting.date).toContain('2026');
    expect(body.selected.formatting.currency).toContain('120');
  });

  test('applies Hebrew RTL document direction on desktop when requested', async ({ page }) => {
    await page.goto('/?locale=he');
    await expect(page.locator('html')).toHaveAttribute('lang', 'he');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('data-locale-direction', 'rtl');

    const savedLocale = await page.evaluate(() => localStorage.getItem('svbooking:locale'));
    expect(JSON.parse(savedLocale as string)).toBe('he');
  });

  test('applies saved Hebrew RTL preference on mobile-sized viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?locale=he');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'he');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('applies non-public QA locale directions without claiming translated content', async ({ page, request }) => {
    const response = await request.get('/api/i18n?locale=ar&date=2026-06-01&amount=120&currency=USD');
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.selected.locale).toBe('ar');
    expect(body.selected.dir).toBe('rtl');
    expect(body.selected.contentTranslation).toBe('fallback-only');
    expect(body.selected.dictionary.searchHotels).toBe('Search hotels');

    await page.goto('/?locale=ar');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('data-locale-direction', 'rtl');

    await page.goto('/?locale=fr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('data-locale-direction', 'ltr');
  });
});
