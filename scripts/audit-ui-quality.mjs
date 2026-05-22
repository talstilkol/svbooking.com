import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];

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
    fail(`Missing required UI quality file: ${relativePath}`);
  }
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) fail(`${relativePath} is missing: ${snippet}`);
  }
}

await requireFile('tests/e2e/ui-quality.spec.ts');
await requireFile('tests/e2e/compare.spec.ts');
await requireFile('app/compare/page.tsx');
await requireFile('package.json');
await requireFile('.github/workflows/ci.yml');

const packageJson = JSON.parse(await readProjectFile('package.json'));
if (!packageJson.scripts?.['audit:ui-quality']) fail('package.json is missing script: audit:ui-quality');
if (!packageJson.scripts?.['test:e2e']) fail('package.json is missing script: test:e2e');

const ci = await readProjectFile('.github/workflows/ci.yml');
requireIncludes(ci, '.github/workflows/ci.yml', [
  'npm run audit:ui-quality',
  'npm run test:e2e',
]);

const uiQuality = await readProjectFile('tests/e2e/ui-quality.spec.ts');
requireIncludes(uiQuality, 'tests/e2e/ui-quality.spec.ts', [
  "const pages = [",
  "'/'",
  "'/search'",
  "'/compare'",
  "'/deals'",
  "'/trips'",
  "'/favorites'",
  "name: 'desktop'",
  "name: 'mobile'",
  "visibleInteractiveWithoutName",
  "document.documentElement.scrollWidth",
  "document.body.scrollWidth",
  'element.labels',
  "querySelectorAll('img')",
  "page.locator('main')",
  "page.locator('h1')",
  'toBeLessThanOrEqual',
]);

const comparePage = await readProjectFile('app/compare/page.tsx');
requireIncludes(comparePage, 'app/compare/page.tsx', [
  'aria-label={`Open ${hotel.name} details`}',
]);

const compareSpec = await readProjectFile('tests/e2e/compare.spec.ts');
requireIncludes(compareSpec, 'tests/e2e/compare.spec.ts', [
  "getByLabel('City', { exact: true })",
]);

if (failures.length > 0) {
  console.error('UI quality audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('UI quality audit passed');
