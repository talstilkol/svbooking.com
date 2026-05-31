import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

async function readProjectFile(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), 'utf8');
  } catch {
    fail(`Missing required public API URL safety file: ${relativePath}`);
    return '';
  }
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) {
      fail(`${relativePath} is missing public API URL safety guard: ${snippet}`);
    }
  }
}

const [
  packageRaw,
  ci,
  runtimeTest,
  readme,
  runbook,
] = await Promise.all([
  readProjectFile('package.json'),
  readProjectFile('.github/workflows/ci.yml'),
  readProjectFile('tests/e2e/public-api-url-safety.spec.ts'),
  readProjectFile('README.md'),
  readProjectFile('PRODUCTION-RUNBOOK.md'),
]);

let packageJson = null;
try {
  packageJson = JSON.parse(packageRaw);
} catch {
  fail('package.json is not valid JSON');
}

if (!packageJson?.scripts?.['audit:public-api-urls']) {
  fail('package.json is missing script: audit:public-api-urls');
}

requireIncludes(ci, '.github/workflows/ci.yml', [
  'npm run audit:public-api-urls',
  'npm run test:e2e',
]);

requireIncludes(runtimeTest, 'tests/e2e/public-api-url-safety.spec.ts', [
  'PUBLIC_API_URL_CASES',
  'unsafeAbsoluteUrls',
  'public API URL safety runtime audit',
  '/api/compare',
  '/api/search?city=Paris',
  '/api/destination-intel',
  '/api/city-info',
  '/api/weather',
  '/api/holidays',
  '/api/exchange-rates?from=USD&to=USD&amount=100',
  '/api/events?city=Paris',
  '/api/reviews/',
  '/api/property-content/',
  '/api/price-history',
  '/api/health',
  'script/data URL',
  'non-HTTPS URL',
  'URL credentials',
  'private or local hostname',
]);

requireIncludes(readme, 'README.md', [
  'npm run audit:public-api-urls',
  'public API URL safety',
]);

requireIncludes(runbook, 'PRODUCTION-RUNBOOK.md', [
  'npm run audit:public-api-urls',
  'public API URL safety',
]);

if (failures.length > 0) {
  console.error('Public API URL safety audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Public API URL safety audit passed');
