import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

async function readProjectFile(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), 'utf8');
  } catch {
    fail(`Missing required documentation file: ${relativePath}`);
    return '';
  }
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) {
      fail(`${relativePath} is missing required current-state text: ${snippet}`);
    }
  }
}

function rejectMatches(source, relativePath, checks) {
  for (const check of checks) {
    if (check.pattern.test(source)) {
      fail(`${relativePath} contains stale documentation claim: ${check.label}`);
    }
  }
}

async function loadCatalogSnapshot() {
  try {
    const catalogUrl = pathToFileURL(path.join(root, 'lib/hotels-catalog.js')).href;
    const catalog = await import(catalogUrl);
    return {
      hotels: Array.isArray(catalog.HOTELS) ? catalog.HOTELS.length : 0,
      cities: typeof catalog.listCities === 'function' ? catalog.listCities().length : 0,
      countries: typeof catalog.listCountries === 'function' ? catalog.listCountries().length : 0,
    };
  } catch {
    fail('Unable to load lib/hotels-catalog.js for documentation count audit');
    return { hotels: 0, cities: 0, countries: 0 };
  }
}

const [readme, masterPlan, auditReport, packageRaw, ci] = await Promise.all([
  readProjectFile('README.md'),
  readProjectFile('MASTER-PLAN.md'),
  readProjectFile('AUDIT-REPORT.md'),
  readProjectFile('package.json'),
  readProjectFile('.github/workflows/ci.yml'),
]);

const catalog = await loadCatalogSnapshot();
const forbiddenRandomApi = ['Math', 'random'].join('.');
const currentCountSnippets = [
  `${catalog.hotels} hotels`,
  `${catalog.cities} cities`,
  `${catalog.countries} countries`,
];

const staleClaims = [
  { label: 'removed listings API route', pattern: /\/api\/listings\b/i },
  { label: 'removed bookings API route', pattern: /\/api\/bookings\b/i },
  { label: 'old MongoDB architecture', pattern: /\bMongoDB\b/i },
  { label: 'old Mongoose architecture', pattern: /\bMongoose\b/i },
  { label: 'old 15-hotel catalog size', pattern: /\b15 hotels\b/i },
  { label: 'obsolete no-auth gap', pattern: /\bNo Auth\b/i },
  { label: 'obsolete no-database gap', pattern: /\bNo Database\b/i },
  { label: 'obsolete no-rate-limit gap', pattern: /\bNo rate limiting\b/i },
  { label: 'obsolete no-unit-tests gap', pattern: /\bNo unit tests\b/i },
  { label: 'old localStorage-only data claim', pattern: /all data is localStorage \+ static JS array/i },
  { label: 'old single-provider claim', pattern: /\bOnly Xotelo\b/i },
  { label: 'seed-script stale data claim', pattern: /\bSeed sample listings\b/i },
];

for (const [relativePath, source] of [
  ['README.md', readme],
  ['MASTER-PLAN.md', masterPlan],
  ['AUDIT-REPORT.md', auditReport],
]) {
  rejectMatches(source, relativePath, staleClaims);
  requireIncludes(source, relativePath, currentCountSnippets);
  requireIncludes(source, relativePath, [
    `${forbiddenRandomApi}()`,
    'fabricated',
    'npm run audit:production:strict',
  ]);
}

requireIncludes(readme, 'README.md', [
  'Next.js 16 App Router',
  'Upstash Redis/KV',
  'Kinde',
  'npm run audit:env',
  'npm run audit:secrets',
  'npm run audit:runtime',
  'npm run audit:external-fetches',
  'npm run audit:affiliate-security',
  'npm run audit:security-responses',
  'npm run audit:api-errors',
  'npm run audit:cron-cache',
  'npm audit',
  'dependency metadata',
  'npm run release:state',
]);

requireIncludes(masterPlan, 'MASTER-PLAN.md', [
  'Release hygiene',
  'Strict readiness fails without admin, cron, Redis, Kinde, and partner-provider env',
  'Never use invented secrets',
]);

requireIncludes(auditReport, 'AUDIT-REPORT.md', [
  '150 test files, 702 tests passed',
  '61 Playwright tests passed',
  'Go-live readiness',
  'Worktree is clean',
  'audit:release-deletions',
]);

requireIncludes(packageRaw, 'package.json', [
  '"audit:env"',
  '"audit:secrets"',
  '"audit:runtime"',
  '"audit:external-fetches"',
  '"audit:affiliate-security"',
  '"audit:security-responses"',
  '"audit:api-errors"',
  '"audit:cron-cache"',
  '"release:state"',
  '"release:state:strict"',
  '"audit:release-deletions"',
]);

let packageJson = null;
try {
  packageJson = JSON.parse(packageRaw);
} catch {
  fail('package.json is not valid JSON');
}

if (!packageJson?.scripts?.['audit:docs']) {
  fail('package.json is missing script: audit:docs');
}

requireIncludes(ci, '.github/workflows/ci.yml', [
  'npm run audit:docs',
  'npm run audit:env',
  'npm run audit:secrets',
  'npm run audit:runtime',
  'npm run audit:external-fetches',
  'npm run audit:affiliate-security',
  'npm run audit:security-responses',
  'npm run audit:api-errors',
  'npm run audit:cron-cache',
  'npm run audit:release-deletions',
  'npm run release:state:strict',
]);

if (failures.length > 0) {
  console.error('Documentation audit failures:');
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log(`Documentation audit passed: ${catalog.hotels} hotels, ${catalog.cities} cities, ${catalog.countries} countries`);
