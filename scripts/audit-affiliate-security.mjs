import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];

async function readProjectFile(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), 'utf8');
  } catch {
    failures.push(`Missing required affiliate-security file: ${relativePath}`);
    return '';
  }
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) failures.push(`${relativePath} is missing: ${snippet}`);
  }
}

function rejectIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (source.includes(snippet)) failures.push(`${relativePath} must not contain: ${snippet}`);
  }
}

function auditPackage(packageRaw) {
  let packageJson;
  try {
    packageJson = JSON.parse(packageRaw);
  } catch {
    failures.push('package.json is not valid JSON');
    return;
  }

  if (!packageJson.scripts?.['audit:affiliate-security']) {
    failures.push('package.json is missing script: audit:affiliate-security');
  }
}

const [
  affiliate,
  clickRoute,
  affiliateTest,
  clickTest,
  packageRaw,
  ci,
  readme,
  runbook,
] = await Promise.all([
  readProjectFile('lib/affiliate.ts'),
  readProjectFile('app/api/click/route.js'),
  readProjectFile('tests/affiliate.test.ts'),
  readProjectFile('tests/api-click.test.ts'),
  readProjectFile('package.json'),
  readProjectFile('.github/workflows/ci.yml'),
  readProjectFile('README.md'),
  readProjectFile('PRODUCTION-RUNBOOK.md'),
]);

requireIncludes(affiliate, 'lib/affiliate.ts', [
  "url.protocol !== 'https:'",
  'hostname === domain || hostname.endsWith',
  'return baseUrl;',
]);
rejectIncludes(affiliate, 'lib/affiliate.ts', [
  "url.protocol)) return false",
  'append params manually',
  'baseUrl.includes',
  'encodeURIComponent(affiliateId)',
]);

requireIncludes(clickRoute, 'app/api/click/route.js', [
  'isAllowedProviderUrl',
  'Provider URL is not allowed',
  'Cache-Control',
  'no-store',
]);

requireIncludes(affiliateTest, 'tests/affiliate.test.ts', [
  'leaves invalid URLs unchanged',
  'leaves non-HTTPS URLs unchanged',
  'allows HTTPS provider domains only',
]);

requireIncludes(clickTest, 'tests/api-click.test.ts', [
  'returns 400 for non-HTTPS provider redirect URLs',
]);

auditPackage(packageRaw);
requireIncludes(ci, '.github/workflows/ci.yml', ['npm run audit:affiliate-security']);
requireIncludes(readme, 'README.md', ['npm run audit:affiliate-security']);
requireIncludes(runbook, 'PRODUCTION-RUNBOOK.md', ['npm run audit:affiliate-security']);

if (failures.length > 0) {
  console.error('Affiliate security audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Affiliate security audit passed');
