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
    fail(`Missing required provenance file: ${relativePath}`);
    return '';
  }
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) {
      fail(`${relativePath} is missing provenance guard: ${snippet}`);
    }
  }
}

const [
  packageRaw,
  ci,
  readme,
  runbook,
  masterPlan,
  catalogCandidates,
  hotelsCatalog,
  priceCache,
  publicUrlSafety,
] = await Promise.all([
  readProjectFile('package.json'),
  readProjectFile('.github/workflows/ci.yml'),
  readProjectFile('README.md'),
  readProjectFile('PRODUCTION-RUNBOOK.md'),
  readProjectFile('MASTER-PLAN.md'),
  readProjectFile('lib/catalog-candidates.js'),
  readProjectFile('lib/hotels-catalog.js'),
  readProjectFile('lib/price-cache.js'),
  readProjectFile('lib/utils/public-url-safety.js'),
]);

requireIncludes(packageRaw, 'package.json', [
  '"audit:provenance"',
  '"smoke:deployment"',
]);

requireIncludes(ci, '.github/workflows/ci.yml', [
  'npm run audit:provenance',
]);

requireIncludes(readme, 'README.md', [
  'npm run audit:provenance',
  'npm run smoke:deployment',
]);

requireIncludes(runbook, 'PRODUCTION-RUNBOOK.md', [
  'npm run audit:provenance',
  'SITE_URL=',
  'npm run smoke:deployment',
]);

requireIncludes(masterPlan, 'MASTER-PLAN.md', [
  'provenance audit',
  'deployment smoke',
]);

requireIncludes(catalogCandidates, 'lib/catalog-candidates.js', [
  'normalizeHttpsUrl',
  'hasUsableProvenance',
  'missing-provenance',
  'missing-location',
  'approveCandidate',
  'addAndPersistHotel',
]);

requireIncludes(hotelsCatalog, 'lib/hotels-catalog.js', [
  'HOTEL_KEY_PATTERN',
  'BLOCKED_CATALOG_TEXT_VALUES',
  'sourceUrl: normalizeHttpsUrl',
  'provenance: normalizeNullableObject',
]);

requireIncludes(priceCache, 'lib/price-cache.js', [
  'normalizeHttpsUrl(rate?.url)',
  'normalizeHttpsUrl(rate?.deepLink || rate?.url)',
  'priceAccuracyState',
  'unobserved',
]);

requireIncludes(publicUrlSafety, 'lib/utils/public-url-safety.js', [
  'normalizeHttpsUrl',
  'localhost',
  "url.protocol !== 'https:'",
  'url.username || url.password',
  'isPrivateHostname',
]);

if (failures.length > 0) {
  console.error('Provenance audit failures:');
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log('Provenance audit passed');
