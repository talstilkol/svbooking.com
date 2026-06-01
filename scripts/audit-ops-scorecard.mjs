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
await requireFile('lib/competitor-parity.js');
await requireFile('lib/catalog-media-quality.js');
await requireFile('lib/launch-services.mjs');
await requireFile('app/api/ops/scorecard/route.js');

const scorecard = await readProjectFile('lib/ops-scorecard.js');
requireIncludes(scorecard, 'lib/ops-scorecard.js', [
  'buildOpsScorecard',
  'buildCompetitorParity',
  'buildCatalogMediaQuality',
  'buildLaunchServiceBlockers',
  'areLaunchServicesReady',
  'productTruth',
  'freeOnlyLaunchReady',
  'production-readiness',
  'inventory-scale',
  'catalog-media-quality',
  'catalogMediaQuality',
  'reviews-and-property-content',
  'mobile-retention',
  'observability',
  'competitor-parity',
  'competitorParity',
  'blockers',
]);

const launchServices = await readProjectFile('lib/launch-services.mjs');
requireIncludes(launchServices, 'lib/launch-services.mjs', [
  'summarizeLaunchServices',
  'areLaunchServicesReady',
  'buildLaunchServiceBlockers',
  'Price alert unsubscribe secret is not configured',
]);

const catalogMediaQuality = await readProjectFile('lib/catalog-media-quality.js');
requireIncludes(catalogMediaQuality, 'lib/catalog-media-quality.js', [
  'buildCatalogMediaQuality',
  'buildCatalogMediaActionLedger',
  'MAX_REUSE_CITIES_PER_IMAGE',
  'actionLedger',
  'reusedImages',
  'licensedImageSourceMetadata',
  'Replace reused catalog media',
]);

const competitorParity = await readProjectFile('lib/competitor-parity.js');
requireIncludes(competitorParity, 'lib/competitor-parity.js', [
  'buildCompetitorParity',
  'official-or-platform-owned-public-pages-only',
  'booking',
  'google-travel',
  'kayak-hotelscombined',
  'expedia',
  'trivago',
  'fattal',
  'isrotel',
  'inventory-breadth',
  'price-freshness',
  'mobile-installability',
  'reviews-property-content',
  'alerts-retention',
  'booking-handoff-quality',
  'local-market-coverage',
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
