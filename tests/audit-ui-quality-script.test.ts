import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-ui-quality.mjs');

async function createFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-ui-quality-'));
  for (const [relativePath, source] of Object.entries(files)) {
    const filePath = path.join(directory, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, source);
  }
  return directory;
}

function runUiQualityAudit(cwd: string) {
  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, PATH: process.env.PATH, HOME: process.env.HOME },
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

const packageJson = JSON.stringify({
  scripts: {
    'audit:ui-quality': 'node scripts/audit-ui-quality.mjs',
    'test:e2e': 'playwright test',
  },
});

const ci = [
  'steps:',
  '  - run: npm run audit:ui-quality',
  '  - run: npm run test:e2e',
  '',
].join('\n');

const comparePage = [
  '<Link href={`/hotel/${hotel.hotelKey}`} aria-label={`Open ${hotel.name} details`}>',
  '  <Image src={hotel.image} alt={hotel.name} />',
  '</Link>',
  '',
].join('\n');

const compareSpec = [
  "await expect(page.getByLabel('City', { exact: true })).toBeVisible();",
  '',
].join('\n');

const validUiQuality = [
  "const pages = ['/', '/search', '/compare', '/deals', '/trips', '/favorites'];",
  "const viewports = [{ name: 'desktop' }, { name: 'mobile' }];",
  'async function visibleInteractiveWithoutName(page) {',
  '  return page.evaluate(() => {',
  "    const labels = 'labels' in element ? element.labels : null;",
  "    const images = element.querySelectorAll('img');",
  '    const documentWidth = document.documentElement.scrollWidth;',
  '    const bodyWidth = document.body.scrollWidth;',
  '    return { labels, images, documentWidth, bodyWidth };',
  '  });',
  '}',
  "await expect(page.locator('main')).toBeVisible();",
  "await expect(page.locator('h1')).toBeVisible();",
  'expect(width).toBeLessThanOrEqual(viewport);',
  '',
].join('\n');

describe('UI quality audit script', () => {
  it('passes when UI quality E2E coverage and compare accessible names are present', async () => {
    const cwd = await createFixture({
      'package.json': packageJson,
      '.github/workflows/ci.yml': ci,
      'tests/e2e/ui-quality.spec.ts': validUiQuality,
      'tests/e2e/compare.spec.ts': compareSpec,
      'app/compare/page.tsx': comparePage,
    });

    const result = runUiQualityAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('UI quality audit passed');
  });

  it('fails when compare image links do not expose an accessible name', async () => {
    const cwd = await createFixture({
      'package.json': packageJson,
      '.github/workflows/ci.yml': ci,
      'tests/e2e/ui-quality.spec.ts': validUiQuality,
      'tests/e2e/compare.spec.ts': compareSpec,
      'app/compare/page.tsx': '<Link href={`/hotel/${hotel.hotelKey}`}><Image alt={hotel.name} /></Link>\n',
    });

    const result = runUiQualityAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('aria-label');
  });
});
