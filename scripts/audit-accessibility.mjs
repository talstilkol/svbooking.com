import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const scanRoots = ['app', 'components'];
const scanExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const ignoredDirectories = new Set(['.git', '.next', 'node_modules', 'coverage', 'test-results', 'playwright-report']);

function fail(message) {
  failures.push(message);
}

async function readProjectFile(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

async function requireFile(relativePath) {
  try {
    await access(path.join(root, relativePath));
  } catch {
    fail(`Missing required accessibility file: ${relativePath}`);
  }
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) fail(`${relativePath} is missing: ${snippet}`);
  }
}

function requireCountAtLeast(source, relativePath, snippet, minimum) {
  const count = source.split(snippet).length - 1;
  if (count < minimum) fail(`${relativePath} has ${count} occurrence(s) of ${snippet}; expected at least ${minimum}`);
}

async function* walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
      continue;
    }
    if (entry.isFile() && scanExtensions.has(path.extname(entry.name))) {
      yield fullPath;
    }
  }
}

function lineNumberForIndex(source, index) {
  return source.slice(0, index).split('\n').length;
}

function auditImageAlt(relativePath, source) {
  const imagePattern = /<(Image|img)\b[\s\S]*?>/g;
  for (const match of source.matchAll(imagePattern)) {
    const tagSource = match[0];
    if (/\salt\s*=/.test(tagSource)) continue;
    fail(`${relativePath}:${lineNumberForIndex(source, match.index || 0)} image is missing an alt attribute`);
  }
}

await requireFile('app/layout.tsx');
await requireFile('components/Navbar.tsx');
await requireFile('components/AccessibilityPanel.tsx');
await requireFile('components/ProviderInfo.tsx');
await requireFile('tests/e2e/ui-quality.spec.ts');
await requireFile('package.json');
await requireFile('.github/workflows/ci.yml');

const packageJson = JSON.parse(await readProjectFile('package.json'));
if (!packageJson.scripts?.['audit:accessibility']) fail('package.json is missing script: audit:accessibility');

const ci = await readProjectFile('.github/workflows/ci.yml');
requireIncludes(ci, '.github/workflows/ci.yml', ['npm run audit:accessibility']);

const layout = await readProjectFile('app/layout.tsx');
requireIncludes(layout, 'app/layout.tsx', [
  'import type { Metadata, Viewport } from "next";',
  'export const viewport: Viewport',
  "width: 'device-width'",
  'initialScale: 1',
  'themeColor',
  'colorScheme',
  'lang="en"',
  'href="#main-content"',
  '<main id="main-content"',
]);

const navbar = await readProjectFile('components/Navbar.tsx');
requireIncludes(navbar, 'components/Navbar.tsx', [
  'aria-expanded={mobileOpen}',
  'aria-controls="mobile-nav"',
  'aria-label="Mobile navigation"',
]);
requireCountAtLeast(navbar, 'components/Navbar.tsx', "aria-current={active ? 'page' : undefined}", 2);
if (navbar.includes('role="menu"') || navbar.includes("role='menu'")) {
  fail('components/Navbar.tsx must not use ARIA menu roles for normal navigation links');
}

const accessibilityPanel = await readProjectFile('components/AccessibilityPanel.tsx');
requireIncludes(accessibilityPanel, 'components/AccessibilityPanel.tsx', [
  "const panelId = 'accessibility-settings-panel'",
  "const headingId = 'accessibility-settings-title'",
  'aria-expanded={open}',
  'aria-controls={panelId}',
  'role="dialog"',
  'aria-modal="true"',
  'aria-labelledby={headingId}',
  'id={headingId}',
  'aria-hidden="true"',
  "useLocale",
  "t('accessibilitySettings')",
  "t('accessibilityTitle')",
  "t('accessibilityClose')",
]);

const providerInfo = await readProjectFile('components/ProviderInfo.tsx');
requireIncludes(providerInfo, 'components/ProviderInfo.tsx', [
  'useId',
  'const panelId = useId()',
  'aria-expanded={open}',
  'aria-controls={open ? panelId : undefined}',
  'aria-describedby={open ? panelId : undefined}',
  'role="tooltip"',
  'aria-hidden="true"',
]);

const uiQuality = await readProjectFile('tests/e2e/ui-quality.spec.ts');
requireIncludes(uiQuality, 'tests/e2e/ui-quality.spec.ts', [
  'visibleInteractiveWithoutName',
  "querySelectorAll('img')",
  "page.locator('main')",
  "page.locator('h1')",
]);

for (const relativeRoot of scanRoots) {
  const absoluteRoot = path.join(root, relativeRoot);
  for await (const filePath of walk(absoluteRoot)) {
    const source = await readFile(filePath, 'utf8');
    auditImageAlt(path.relative(root, filePath), source);
  }
}

if (failures.length > 0) {
  console.error('Accessibility audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Accessibility audit passed');
