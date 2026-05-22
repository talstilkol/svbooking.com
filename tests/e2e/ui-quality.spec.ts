import { test, expect, type Page } from '@playwright/test';

const pages = [
  '/',
  '/search',
  '/compare',
  '/deals',
  '/trips',
  '/favorites',
];

const viewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
];

async function visibleInteractiveWithoutName(page: Page) {
  return page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('a, button, input, select, textarea'));
    return elements
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          !element.closest('[aria-hidden="true"]')
        );
      })
      .map((element) => {
        const labelledBy = element.getAttribute('aria-labelledby');
        const labelledByText = labelledBy
          ? labelledBy
              .split(/\s+/)
              .map((id) => document.getElementById(id)?.textContent || '')
              .join(' ')
          : '';
        const labelsText = 'labels' in element && (element as HTMLInputElement).labels
          ? Array.from((element as HTMLInputElement).labels!).map((label: HTMLLabelElement) => label.textContent || '').join(' ')
          : '';
        const descendantImageAlt = Array.from(element.querySelectorAll('img'))
          .map((image) => image.getAttribute('alt') || '')
          .join(' ');
        const text = [
          element.textContent,
          element.getAttribute('aria-label'),
          element.getAttribute('title'),
          element.getAttribute('placeholder'),
          element.getAttribute('alt'),
          labelledByText,
          labelsText,
          descendantImageAlt,
        ]
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        return {
          tag: element.tagName.toLowerCase(),
          name: text,
          href: element.getAttribute('href'),
          type: element.getAttribute('type'),
        };
      })
      .filter((entry) => entry.name.length === 0)
      .slice(0, 10);
  });
}

test.describe('UI quality guardrails', () => {
  for (const viewport of viewports) {
    for (const path of pages) {
      test(`${path} has stable ${viewport.name} layout and accessible controls`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(path, { waitUntil: 'domcontentloaded' });

        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('h1').first()).toBeVisible();

        const layout = await page.evaluate(() => ({
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
        }));
        expect(Math.max(layout.documentWidth, layout.bodyWidth)).toBeLessThanOrEqual(layout.viewportWidth + 1);

        const unnamed = await visibleInteractiveWithoutName(page);
        expect(unnamed).toEqual([]);
      });
    }
  }
});
