import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-accessibility.mjs');

async function createFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-accessibility-'));
  for (const [relativePath, source] of Object.entries(files)) {
    const filePath = path.join(directory, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, source);
  }
  return directory;
}

function runAccessibilityAudit(cwd: string) {
  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
    },
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

const packageJson = JSON.stringify({
  scripts: {
    'audit:accessibility': 'node scripts/audit-accessibility.mjs',
  },
});

const ci = [
  'steps:',
  '  - run: npm run audit:accessibility',
  '',
].join('\n');

const layout = [
  'import type { Metadata, Viewport } from "next";',
  'export const viewport: Viewport = {',
  "  width: 'device-width',",
  '  initialScale: 1,',
  "  themeColor: '#ffffff',",
  "  colorScheme: 'light',",
  '};',
  'export default function RootLayout() {',
  '  return <html lang="en"><body><a href="#main-content">Skip</a><main id="main-content"><img alt="Verified hotel" /></main></body></html>;',
  '}',
  '',
].join('\n');

const navbar = [
  '<button aria-expanded={mobileOpen} aria-controls="mobile-nav" />',
  '<div id="mobile-nav" aria-label="Mobile navigation">',
  "  <a aria-current={active ? 'page' : undefined}>Search</a>",
  "  <a aria-current={active ? 'page' : undefined}>Deals</a>",
  '</div>',
  '',
].join('\n');

const accessibilityPanel = [
  "const panelId = 'accessibility-settings-panel';",
  "const headingId = 'accessibility-settings-title';",
  '<button aria-expanded={open} aria-controls={panelId}>Open</button>',
  '<div aria-hidden="true" />',
  '<div role="dialog" aria-modal="true" aria-labelledby={headingId}>',
  '  <h3 id={headingId}>Accessibility</h3>',
  '  <button aria-label="Close accessibility settings">Close</button>',
  '</div>',
  '',
].join('\n');

const providerInfo = [
  "import { useId } from 'react';",
  'const panelId = useId();',
  '<button aria-expanded={open} aria-controls={open ? panelId : undefined} aria-describedby={open ? panelId : undefined}>Info</button>',
  '<div aria-hidden="true" />',
  '<div role="tooltip" />',
  '',
].join('\n');

const uiQuality = [
  'function visibleInteractiveWithoutName() {}',
  "document.querySelectorAll('img');",
  "page.locator('main');",
  "page.locator('h1');",
  '',
].join('\n');

const validFiles = {
  'package.json': packageJson,
  '.github/workflows/ci.yml': ci,
  'app/layout.tsx': layout,
  'components/Navbar.tsx': navbar,
  'components/AccessibilityPanel.tsx': accessibilityPanel,
  'components/ProviderInfo.tsx': providerInfo,
  'tests/e2e/ui-quality.spec.ts': uiQuality,
};

describe('accessibility audit script', () => {
  it('passes when semantic accessibility guardrails are wired', async () => {
    const cwd = await createFixture(validFiles);

    const result = runAccessibilityAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Accessibility audit passed');
  });

  it('fails when image alt text can regress', async () => {
    const cwd = await createFixture({
      ...validFiles,
      'components/BrokenImage.tsx': '<Image src={hotel.image} />\n',
    });

    const result = runAccessibilityAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('image is missing an alt attribute');
  });
});
