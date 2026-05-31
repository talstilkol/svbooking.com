import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const scanRoots = ['app', 'lib', 'scripts'];
const extensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx']);
const ignoredDirectories = new Set(['.git', '.next', 'node_modules', 'coverage', 'test-results', 'playwright-report']);
const directExternalFetchPattern = /\b(?:globalThis\.)?fetch\s*\(\s*(?:'https?:\/\/|"https?:\/\/|`https?:\/\/)/u;

function fail(message) {
  failures.push(message);
}

async function readProjectFile(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), 'utf8');
  } catch {
    fail(`Missing required external-fetch file: ${relativePath}`);
    return '';
  }
}

async function collectSourceFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    const relativePath = path.relative(root, fullPath);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...await collectSourceFiles(fullPath));
      }
      continue;
    }
    if (extensions.has(path.extname(entry.name))) {
      files.push(relativePath);
    }
  }
  return files;
}

function auditNoDirectExternalFetch(relativePath, source) {
  const lines = source.split('\n');
  for (const [index, line] of lines.entries()) {
    if (directExternalFetchPattern.test(line)) {
      fail(`${relativePath}:${index + 1} uses direct external fetch; use lib/utils/fetch-with-timeout.js`);
    }
  }
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) fail(`${relativePath} is missing: ${snippet}`);
  }
}

function auditPackage(packageRaw) {
  let packageJson;
  try {
    packageJson = JSON.parse(packageRaw);
  } catch {
    fail('package.json is not valid JSON');
    return;
  }
  if (!packageJson.scripts?.['audit:external-fetches']) {
    fail('package.json is missing script: audit:external-fetches');
  }
}

const sourceFiles = (await Promise.all(
  scanRoots.map((relativePath) => collectSourceFiles(path.join(root, relativePath)))
)).flat();

await Promise.all(sourceFiles.map(async (relativePath) => {
  const source = await readProjectFile(relativePath);
  auditNoDirectExternalFetch(relativePath, source);
}));

const [
  helper,
  healthMonitor,
  destinationIntel,
  wikidataClient,
  wikipediaClient,
  wikivoyageClient,
  dbpediaClient,
  opentripmapClient,
  publicUrlSafety,
  wikidataTest,
  contentDiscoveryTest,
  discoverySourceHardeningTest,
  publicUrlSafetyTest,
  packageRaw,
  ci,
  readme,
  runbook,
] = await Promise.all([
  readProjectFile('lib/utils/fetch-with-timeout.js'),
  readProjectFile('app/api/agents/auto/health-monitor/route.js'),
  readProjectFile('app/api/destination-intel/route.js'),
  readProjectFile('lib/wikidata.js'),
  readProjectFile('lib/wikipedia.js'),
  readProjectFile('lib/wikivoyage.js'),
  readProjectFile('lib/dbpedia.js'),
  readProjectFile('lib/opentripmap.js'),
  readProjectFile('lib/utils/public-url-safety.js'),
  readProjectFile('tests/wikidata-client.test.ts'),
  readProjectFile('tests/content-discovery-helpers.test.ts'),
  readProjectFile('tests/discovery-source-hardening.test.ts'),
  readProjectFile('tests/public-url-safety.test.ts'),
  readProjectFile('package.json'),
  readProjectFile('.github/workflows/ci.yml'),
  readProjectFile('README.md'),
  readProjectFile('PRODUCTION-RUNBOOK.md'),
]);

requireIncludes(helper, 'lib/utils/fetch-with-timeout.js', [
  'AbortController',
  'setTimeout',
  'clearTimeout',
  'timeoutMs',
  'signal',
  'fetchJsonWithTimeout',
]);

requireIncludes(healthMonitor, 'app/api/agents/auto/health-monitor/route.js', [
  'fetchWithTimeout',
  'PROBE_TIMEOUT_MS',
  'Probe unavailable',
]);

requireIncludes(destinationIntel, 'app/api/destination-intel/route.js', [
  'fetchJsonWithTimeout',
  'SUNRISE_SUNSET_TIMEOUT_MS',
  'Destination intelligence unavailable',
]);

requireIncludes(wikidataClient, 'lib/wikidata.js', [
  'fetchWithTimeout',
  'WIKIDATA_TIMEOUT_MS',
  "cache: 'no-store'",
  'sparqlString',
  'sparqlEnglishLiteral',
  'parseLimit',
]);

requireIncludes(wikidataTest, 'tests/wikidata-client.test.ts', [
  'escapes country and city filters',
  'bounds unsafe discovery limits',
  'deduplicates and escapes city label lookups',
  'AbortSignal',
]);

requireIncludes(publicUrlSafety, 'lib/utils/public-url-safety.js', [
  'export function normalizeHttpsUrl',
  "url.protocol !== 'https:'",
  'url.username || url.password',
  'isPrivateHostname',
  'a === 100 && b >= 64 && b <= 127',
  "host.startsWith('::ffff:')",
]);

for (const [relativePath, source] of [
  ['lib/wikipedia.js', wikipediaClient],
  ['lib/wikivoyage.js', wikivoyageClient],
  ['lib/dbpedia.js', dbpediaClient],
  ['lib/opentripmap.js', opentripmapClient],
]) {
  requireIncludes(source, relativePath, [
    'fetchWithTimeout',
    'normalizeHttpsUrl',
  ]);
}

requireIncludes(contentDiscoveryTest, 'tests/content-discovery-helpers.test.ts', [
  'drops unsafe Wikipedia media URLs and bounds search limits',
  'srlimit',
]);

requireIncludes(discoverySourceHardeningTest, 'tests/discovery-source-hardening.test.ts', [
  'drops unsafe travel guide media URLs',
  'Unsafe Coordinate Hotel',
]);

requireIncludes(publicUrlSafetyTest, 'tests/public-url-safety.test.ts', [
  'rejects unsafe public response links',
  'https://localhost:3000/internal',
  'https://127.0.0.1/internal',
  'https://100.64.0.1/internal',
  'https://[::ffff:127.0.0.1]/internal',
]);

auditPackage(packageRaw);
requireIncludes(ci, '.github/workflows/ci.yml', ['npm run audit:external-fetches']);
requireIncludes(readme, 'README.md', ['npm run audit:external-fetches']);
requireIncludes(runbook, 'PRODUCTION-RUNBOOK.md', ['npm run audit:external-fetches']);

if (failures.length > 0) {
  console.error('External fetch audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('External fetch audit passed');
