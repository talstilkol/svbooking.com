import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { HOTELS, buildStaticCatalogProvenanceLedger } from '../lib/hotels-catalog.js';

const root = process.cwd();
const failures = [];
const HOTEL_KEY_PATTERN = /^g\d+-d\d+$/;
const ALLOWED_STATIC_IMAGE_HOSTS = new Set(['images.unsplash.com']);
const BLOCKED_CATALOG_TEXT_VALUES = new Set([
  'demo',
  'example',
  'fake',
  'placeholder',
  'sample',
  'test',
  'tbd',
  'unknown',
  'unverified',
]);

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

function requireNotIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (source.includes(snippet)) {
      fail(`${relativePath} must not contain direct catalog promotion path: ${snippet}`);
    }
  }
}

function countOccurrences(source, snippet) {
  return source.split(snippet).length - 1;
}

function normalized(value) {
  return String(value || '').trim().toLowerCase();
}

function validateCatalogText(hotel, field) {
  const value = hotel[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${hotel.hotelKey || 'missing-key'} lacks static catalog ${field} provenance`);
    return;
  }

  if (BLOCKED_CATALOG_TEXT_VALUES.has(normalized(value))) {
    fail(`${hotel.hotelKey} uses blocked catalog ${field} value: ${value}`);
  }
}

function validateStaticCatalogItemProvenance(hotel) {
  validateCatalogText(hotel, 'hotelKey');
  validateCatalogText(hotel, 'name');
  validateCatalogText(hotel, 'city');
  validateCatalogText(hotel, 'country');
  validateCatalogText(hotel, 'image');

  if (!HOTEL_KEY_PATTERN.test(String(hotel.hotelKey || ''))) {
    fail(`${hotel.hotelKey || 'missing-key'} is not a TripAdvisor/Xotelo source key`);
  }

  let imageUrl;
  try {
    imageUrl = new URL(hotel.image);
  } catch {
    fail(`${hotel.hotelKey || 'missing-key'} image source is not a valid URL`);
    return;
  }

  if (imageUrl.protocol !== 'https:') {
    fail(`${hotel.hotelKey} image source must be HTTPS`);
  }
  if (!ALLOWED_STATIC_IMAGE_HOSTS.has(imageUrl.hostname)) {
    fail(`${hotel.hotelKey} image source host is not allowlisted: ${imageUrl.hostname}`);
  }
  if (!imageUrl.searchParams.has('w') || !imageUrl.searchParams.has('q')) {
    fail(`${hotel.hotelKey} image source must include explicit width and quality parameters`);
  }
}

const [
  packageRaw,
  ci,
  readme,
  runbook,
  masterPlan,
  catalogCandidates,
  catalogCandidatesRoute,
  agentsDiscoveredRoute,
  autoDiscoveryRoute,
  autoBulkDiscoveryRoute,
  autoOsmScannerRoute,
  autoXoteloDiscoveryRoute,
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
  readProjectFile('app/api/catalog/candidates/route.js'),
  readProjectFile('app/api/agents/discovered/route.js'),
  readProjectFile('app/api/agents/auto/discovery/route.js'),
  readProjectFile('app/api/agents/auto/bulk-discovery/route.js'),
  readProjectFile('app/api/agents/auto/osm-scanner/route.js'),
  readProjectFile('app/api/agents/auto/xotelo-discovery/route.js'),
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
  'do not auto-promote discovered hotels',
]);

requireIncludes(catalogCandidates, 'lib/catalog-candidates.js', [
  'normalizeHttpsUrl',
  'hasUsableProvenance',
  'hasVerifiedLocation',
  'function assertPromotable',
  'missing-provenance',
  'missing-location',
  'Candidate is missing usable provenance',
  'Candidate is missing verified latitude/longitude',
  'export async function approveCandidate',
  'addAndPersistHotel',
  'sourceUrl: candidate.sourceUrl',
  'externalIds: candidate.externalIds',
  'provenance: candidate.provenance',
]);

if (countOccurrences(catalogCandidates, 'addAndPersistHotel') !== 2) {
  fail('lib/catalog-candidates.js must only import addAndPersistHotel and call it inside approveCandidate');
}

for (const [relativePath, source] of [
  ['app/api/catalog/candidates/route.js', catalogCandidatesRoute],
  ['app/api/agents/discovered/route.js', agentsDiscoveredRoute],
]) {
  requireIncludes(source, relativePath, [
    'assertSameOrigin(request)',
    'recordAdminAuditEvent',
    'upsertCandidate',
    'approveCandidate',
    'NO_STORE_HEADERS',
  ]);
  requireNotIncludes(source, relativePath, ['addAndPersistHotel']);
}

for (const [relativePath, source] of [
  ['app/api/agents/auto/discovery/route.js', autoDiscoveryRoute],
  ['app/api/agents/auto/bulk-discovery/route.js', autoBulkDiscoveryRoute],
  ['app/api/agents/auto/osm-scanner/route.js', autoOsmScannerRoute],
  ['app/api/agents/auto/xotelo-discovery/route.js', autoXoteloDiscoveryRoute],
]) {
  requireIncludes(source, relativePath, ['upsertCandidates']);
  requireNotIncludes(source, relativePath, ['addAndPersistHotel', 'approveCandidate']);
}

requireIncludes(hotelsCatalog, 'lib/hotels-catalog.js', [
  'HOTEL_KEY_PATTERN',
  'BLOCKED_CATALOG_TEXT_VALUES',
  'buildStaticCatalogProvenanceLedger',
  'getStaticCatalogItemProvenance',
  'getStaticCatalogImageProvenance',
  'licenseStatus',
  'sourceUrlStatus',
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

if (!Array.isArray(HOTELS) || HOTELS.length === 0) {
  fail('Static catalog provenance cannot be audited because HOTELS is empty');
} else {
  const provenanceLedger = buildStaticCatalogProvenanceLedger({ hotels: HOTELS });
  if (provenanceLedger.length !== HOTELS.length) {
    fail(`Static catalog provenance ledger has ${provenanceLedger.length} entries for ${HOTELS.length} hotels`);
  }

  const seenKeys = new Set();
  for (const [index, hotel] of HOTELS.entries()) {
    const provenance = provenanceLedger[index];
    validateStaticCatalogItemProvenance(hotel);
    if (seenKeys.has(hotel.hotelKey)) {
      fail(`Static catalog provenance has duplicate hotel key: ${hotel.hotelKey}`);
    }
    seenKeys.add(hotel.hotelKey);

    if (provenance?.catalogItem?.status !== 'source-metadata-available') {
      fail(`${hotel.hotelKey} is missing static catalog source metadata`);
    }
    if (provenance?.catalogItem?.source !== 'tripadvisor-xotelo-key') {
      fail(`${hotel.hotelKey} static catalog source must identify the TripAdvisor/Xotelo key policy`);
    }
    if (!provenance?.catalogItem?.externalIds?.tripadvisorLocationId || !provenance?.catalogItem?.externalIds?.tripadvisorHotelId) {
      fail(`${hotel.hotelKey} static catalog provenance must expose derived TripAdvisor IDs`);
    }
    if (!provenance?.catalogItem?.dataPolicy?.includes('identity-only')) {
      fail(`${hotel.hotelKey} static catalog provenance must not imply review, price, or availability claims`);
    }

    if (provenance?.image?.status !== 'source-metadata-available') {
      fail(`${hotel.hotelKey} is missing catalog image source metadata`);
    }
    if (!provenance?.image?.sourceUrl || !provenance?.image?.sourceHost || !provenance?.image?.licenseStatus) {
      fail(`${hotel.hotelKey} catalog image provenance must include source URL, host, and license-status metadata`);
    }
    if (provenance?.image?.approvedLicense === true && provenance?.image?.replacementRequired === true) {
      fail(`${hotel.hotelKey} catalog image provenance cannot both approve the license and require replacement`);
    }
  }
}

if (failures.length > 0) {
  console.error('Provenance audit failures:');
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log('Provenance audit passed');
