import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];

async function readProjectFile(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

async function requireFile(relativePath) {
  try {
    await access(path.join(root, relativePath));
  } catch {
    failures.push(`Missing required scorecard file: ${relativePath}`);
  }
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) failures.push(`${relativePath} is missing: ${snippet}`);
  }
}

await requireFile('lib/ops-scorecard.js');
await requireFile('app/api/ops/scorecard/route.js');

const scorecard = await readProjectFile('lib/ops-scorecard.js');
requireIncludes(scorecard, 'lib/ops-scorecard.js', [
  'buildOpsScorecard',
  'productTruth',
  'freeOnlyLaunchReady',
  'production-readiness',
  'inventory-scale',
  'reviews-and-property-content',
  'mobile-retention',
  'observability',
  'blockers',
]);

const route = await readProjectFile('app/api/ops/scorecard/route.js');
requireIncludes(route, 'app/api/ops/scorecard/route.js', [
  'verifyAdminAuth',
  'buildOpsScorecard',
  'Cache-Control',
  'no-store',
]);

if (failures.length > 0) {
  console.error('Ops scorecard audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Ops scorecard audit passed');
