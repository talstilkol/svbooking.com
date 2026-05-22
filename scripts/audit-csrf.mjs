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
    fail(`Missing required CSRF file: ${relativePath}`);
  }
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) fail(`${relativePath} is missing: ${snippet}`);
  }
}

await requireFile('lib/request-origin.js');
await requireFile('tests/request-origin.test.ts');
await requireFile('tests/me-data.test.ts');
await requireFile('tests/price-alerts.test.ts');
await requireFile('tests/api-click.test.ts');
await requireFile('tests/price-accuracy.test.ts');
await requireFile('tests/api-agent-recommendations.test.ts');
await requireFile('tests/admin-auth.test.ts');
await requireFile('tests/catalog-candidates-api.test.ts');
await requireFile('package.json');
await requireFile('.github/workflows/ci.yml');

const requestOrigin = await readProjectFile('lib/request-origin.js');
requireIncludes(requestOrigin, 'lib/request-origin.js', [
  'expectedRequestOrigin',
  'isSameOriginRequest',
  'assertSameOrigin',
  'sec-fetch-site',
  'referer',
  "['http:', 'https:']",
  'Same-origin request required',
]);

const requestOriginTest = await readProjectFile('tests/request-origin.test.ts');
requireIncludes(requestOriginTest, 'tests/request-origin.test.ts', [
  'rejects cross-origin referer when Origin is absent',
  'rejects unsupported origin protocols',
  'allows non-browser clients without Origin or fetch metadata',
]);

const mutationRoutes = [
  'app/api/me/favorites/route.js',
  'app/api/me/trips/route.js',
  'app/api/me/prefs/route.js',
  'app/api/me/data/route.js',
  'app/api/price-alerts/route.js',
  'app/api/click/route.js',
  'app/api/price-accuracy/route.js',
  'app/api/agents/recommendations/route.js',
  'app/api/agents/providers/route.js',
  'app/api/agents/discovered/route.js',
  'app/api/catalog/validate/route.js',
  'app/api/catalog/candidates/route.js',
];

for (const route of mutationRoutes) {
  const source = await readProjectFile(route);
  requireIncludes(source, route, [
    "import { assertSameOrigin } from '@/lib/request-origin';",
    'assertSameOrigin(request);',
  ]);
}

const packageJson = JSON.parse(await readProjectFile('package.json'));
if (!packageJson.scripts?.['audit:csrf']) fail('package.json is missing script: audit:csrf');

const ci = await readProjectFile('.github/workflows/ci.yml');
requireIncludes(ci, '.github/workflows/ci.yml', ['npm run audit:csrf']);

const meDataTest = await readProjectFile('tests/me-data.test.ts');
requireIncludes(meDataTest, 'tests/me-data.test.ts', [
  'rejects cross-origin account deletion requests',
  'Same-origin request required',
]);

const priceAlertsTest = await readProjectFile('tests/price-alerts.test.ts');
requireIncludes(priceAlertsTest, 'tests/price-alerts.test.ts', [
  'rejects cross-origin alert mutations',
  'Same-origin request required',
]);

const apiClickTest = await readProjectFile('tests/api-click.test.ts');
requireIncludes(apiClickTest, 'tests/api-click.test.ts', [
  'rejects cross-origin click tracking requests',
  'Same-origin request required',
]);

const priceAccuracyTest = await readProjectFile('tests/price-accuracy.test.ts');
requireIncludes(priceAccuracyTest, 'tests/price-accuracy.test.ts', [
  'rejects cross-origin price accuracy reports',
  'Same-origin request required',
]);

const agentRecommendationsTest = await readProjectFile('tests/api-agent-recommendations.test.ts');
requireIncludes(agentRecommendationsTest, 'tests/api-agent-recommendations.test.ts', [
  'rejects cross-origin agent recommendation mutations',
  'Same-origin request required',
]);

const adminAuthTest = await readProjectFile('tests/admin-auth.test.ts');
requireIncludes(adminAuthTest, 'tests/admin-auth.test.ts', [
  'rejects cross-origin admin provider reset mutations',
  'rejects cross-origin discovered candidate mutations',
  'rejects cross-origin catalog validation mutations before provider calls',
  'Same-origin request required',
]);

const catalogCandidatesTest = await readProjectFile('tests/catalog-candidates-api.test.ts');
requireIncludes(catalogCandidatesTest, 'tests/catalog-candidates-api.test.ts', [
  'rejects cross-origin catalog candidate mutations',
  'Same-origin request required',
]);

if (failures.length > 0) {
  console.error('CSRF audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('CSRF audit passed');
