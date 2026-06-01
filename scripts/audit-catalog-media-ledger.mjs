import { buildCatalogMediaActionLedger, buildCatalogMediaQuality } from '../lib/catalog-media-quality.js';

const failures = [];

function fail(message) {
  failures.push(message);
}

function countItems(items, reason) {
  return items.filter((item) => item.reasons.includes(reason)).length;
}

const ledger = buildCatalogMediaActionLedger();
const quality = buildCatalogMediaQuality();
const { summary, items } = ledger;

if (!summary || typeof summary !== 'object') {
  fail('Catalog media ledger summary is missing');
}

if (!Array.isArray(items)) {
  fail('Catalog media ledger items must be an array');
}

const expectedSummary = {
  totalItems: items.length,
  totalHotels: items.reduce((total, item) => total + item.hotelCount, 0),
  reusedImageSources: countItems(items, 'reused-across-cities'),
  unapprovedImageSources: countItems(items, 'license-approval-required'),
  missingOrInvalidImageItems: items.filter((item) => (
    item.reasons.includes('missing-image') || item.reasons.includes('invalid-image-url')
  )).length,
  maxReuseCities: quality.current.maxReuseCities,
};

if (JSON.stringify(summary) !== JSON.stringify(expectedSummary)) {
  fail('Catalog media ledger summary does not match the item-level action queue');
}

if (JSON.stringify(quality.actionLedger) !== JSON.stringify(summary)) {
  fail('Catalog media quality summary is not aligned with the action ledger summary');
}

if (quality.current.reusedImages !== summary.reusedImageSources) {
  fail(`Reused image count mismatch: quality=${quality.current.reusedImages}, ledger=${summary.reusedImageSources}`);
}

if (quality.current.unapprovedImageSources !== summary.unapprovedImageSources) {
  fail(`Unapproved image source count mismatch: quality=${quality.current.unapprovedImageSources}, ledger=${summary.unapprovedImageSources}`);
}

if (quality.status !== 'healthy' && summary.totalItems === 0) {
  fail('Non-healthy catalog media quality must expose a non-empty action ledger');
}

for (const [index, item] of items.entries()) {
  const label = item.sourceUrl || item.image || `ledger item ${index}`;

  if (!Array.isArray(item.reasons) || item.reasons.length === 0) {
    fail(`${label} has no review reasons`);
  }

  if (!Array.isArray(item.hotels) || item.hotels.length !== item.hotelCount) {
    fail(`${label} hotel count does not match its hotel review targets`);
  }

  if (!Array.isArray(item.cities) || item.cities.length !== item.cityCount) {
    fail(`${label} city count does not match its city review targets`);
  }

  if (item.approvedLicense === true && item.replacementRequired === true) {
    fail(`${label} cannot be both approved and replacement-required`);
  }

  if (item.approvedLicense === true && item.licenseStatus !== 'approved') {
    fail(`${label} cannot mark approvedLicense=true without licenseStatus=approved`);
  }

  if (item.reasons.includes('license-approval-required')) {
    if (item.approvedLicense === true || item.licenseStatus === 'approved') {
      fail(`${label} cannot require license approval while already approved`);
    }
    if (item.replacementRequired !== true) {
      fail(`${label} must remain replacement-required until license approval is real`);
    }
  }

  if (item.reasons.includes('reused-across-cities') && item.cityCount <= summary.maxReuseCities) {
    fail(`${label} is marked reused across cities without exceeding the reuse threshold`);
  }
}

if (failures.length > 0) {
  console.error('Catalog media ledger audit failures:');
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log(`Catalog media ledger audit passed: ${summary.totalItems} media actions across ${summary.totalHotels} hotel references`);
