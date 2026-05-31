import { access, readFile } from 'node:fs/promises';
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
    fail(`Missing required public data contract file: ${relativePath}`);
    return '';
  }
}

async function requireFile(relativePath) {
  try {
    await access(path.join(root, relativePath));
  } catch {
    fail(`Missing required public data contract file: ${relativePath}`);
  }
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) {
      fail(`${relativePath} is missing public data contract guard: ${snippet}`);
    }
  }
}

const packageJson = JSON.parse(await readProjectFile('package.json'));
const scripts = packageJson.scripts || {};

if (!scripts['audit:public-data-contracts']) {
  fail('package.json is missing script: audit:public-data-contracts');
}

for (const relativePath of [
  '.github/workflows/ci.yml',
  'README.md',
  'PRODUCTION-RUNBOOK.md',
  'MASTER-PLAN.md',
  'AUDIT-REPORT.md',
  'app/api/compare/helpers.js',
  'app/api/destination-intel/route.js',
  'app/api/city-info/route.js',
  'app/api/exchange-rates/route.js',
  'app/api/events/route.js',
  'app/api/holidays/route.js',
  'app/api/pois/route.js',
  'app/api/price-history/route.js',
  'app/api/travel-guide/route.js',
  'app/api/weather/route.js',
  'lib/exchange-rates.js',
  'lib/property-content.js',
  'lib/reviews.js',
  'tests/api-public-data-contracts.test.ts',
  'tests/api-destination-intel.test.ts',
  'tests/components/DestinationIntel.test.tsx',
]) {
  await requireFile(relativePath);
}

const [
  ci,
  readme,
  runbook,
  masterPlan,
  auditReport,
  compareHelpers,
  destinationIntel,
  cityInfoRoute,
  exchangeRatesRoute,
  eventsRoute,
  holidaysRoute,
  poisRoute,
  priceHistoryRoute,
  travelGuideRoute,
  weatherRoute,
  exchangeRatesHelper,
  propertyContent,
  reviews,
  publicDataContractsTest,
  destinationIntelTest,
  destinationIntelComponentTest,
] = await Promise.all([
  readProjectFile('.github/workflows/ci.yml'),
  readProjectFile('README.md'),
  readProjectFile('PRODUCTION-RUNBOOK.md'),
  readProjectFile('MASTER-PLAN.md'),
  readProjectFile('AUDIT-REPORT.md'),
  readProjectFile('app/api/compare/helpers.js'),
  readProjectFile('app/api/destination-intel/route.js'),
  readProjectFile('app/api/city-info/route.js'),
  readProjectFile('app/api/exchange-rates/route.js'),
  readProjectFile('app/api/events/route.js'),
  readProjectFile('app/api/holidays/route.js'),
  readProjectFile('app/api/pois/route.js'),
  readProjectFile('app/api/price-history/route.js'),
  readProjectFile('app/api/travel-guide/route.js'),
  readProjectFile('app/api/weather/route.js'),
  readProjectFile('lib/exchange-rates.js'),
  readProjectFile('lib/property-content.js'),
  readProjectFile('lib/reviews.js'),
  readProjectFile('tests/api-public-data-contracts.test.ts'),
  readProjectFile('tests/api-destination-intel.test.ts'),
  readProjectFile('tests/components/DestinationIntel.test.tsx'),
]);

requireIncludes(ci, '.github/workflows/ci.yml', ['npm run audit:public-data-contracts']);
requireIncludes(readme, 'README.md', [
  'npm run audit:public-data-contracts',
  'source/dataPolicy/unavailable contracts',
]);
requireIncludes(runbook, 'PRODUCTION-RUNBOOK.md', ['npm run audit:public-data-contracts']);
requireIncludes(masterPlan, 'MASTER-PLAN.md', [
  'Add public data contract audit for source/unavailable states across public data APIs',
  'public data contract audit',
]);
requireIncludes(auditReport, 'AUDIT-REPORT.md', ['Public data contract audit']);

requireIncludes(compareHelpers, 'app/api/compare/helpers.js', [
  'source: rate?.source || result?.source || null',
  "freshness: rate?.freshness || result?.freshness || 'unknown'",
  "priceAccuracyState: rate?.priceAccuracyState || 'unobserved'",
  'lastCheckedAt: rate?.lastCheckedAt || result?.lastCheckedAt || null',
  'providerSource: result?.provider || null',
]);

requireIncludes(destinationIntel, 'app/api/destination-intel/route.js', [
  'sources,',
  'sourceStates,',
  "dataPolicy: 'available-source-data-only'",
  "state: 'not-requested'",
  "state: 'unavailable'",
  'sources = [',
  'SV Booking catalog',
  'hasCoordinates',
]);

requireIncludes(cityInfoRoute, 'app/api/city-info/route.js', [
  "source: 'Wikipedia'",
  "sourceStatus: 'available'",
  "sourceStatus: 'unavailable'",
  "dataPolicy: 'wikipedia-summary-only'",
]);

requireIncludes(exchangeRatesRoute, 'app/api/exchange-rates/route.js', [
  "source: result.source || 'configured-exchange-rate-sources'",
  "source: rates.source || 'configured-exchange-rate-sources'",
  "sourceStatus: 'available'",
  "sourceStatus: 'unavailable'",
  "dataPolicy: 'provider-returned-exchange-rates-only'",
]);

requireIncludes(eventsRoute, 'app/api/events/route.js', [
  "source: 'not-configured'",
  'Events provider unavailable',
  "source: 'cache'",
  "source: events.length > 0 ? 'ticketmaster' : 'empty'",
  'Events unavailable',
]);

requireIncludes(holidaysRoute, 'app/api/holidays/route.js', [
  "source: 'Nager.Date'",
  "sourceStatus: 'available'",
  "sourceStatus: 'unavailable'",
  "dataPolicy: 'provider-returned-public-holidays-only'",
]);

requireIncludes(poisRoute, 'app/api/pois/route.js', [
  "source: 'cache'",
  "source: 'live'",
  "source: 'osm'",
  'POI data unavailable',
]);

requireIncludes(priceHistoryRoute, 'app/api/price-history/route.js', [
  'BLOCKED_PROVIDER_VALUES',
  'hasVerifiedProvider',
  'hasRealData: false',
  "dataPolicy: 'verified-provider-observations-only'",
]);

requireIncludes(travelGuideRoute, 'app/api/travel-guide/route.js', [
  "source: 'cache'",
  "source: data ? 'wikivoyage' : 'not-found'",
  'Travel guide unavailable',
]);

requireIncludes(weatherRoute, 'app/api/weather/route.js', [
  "source: 'Open-Meteo'",
  "sourceStatus: 'available'",
  "sourceStatus: 'unavailable'",
  "dataPolicy: 'provider-returned-weather-only'",
  'lat === null || lon === null',
]);

requireIncludes(exchangeRatesHelper, 'lib/exchange-rates.js', [
  'source: rateCache.source',
  "source: 'open.er-api.com'",
  "source: 'currency-api'",
  "source: 'same-currency'",
]);

requireIncludes(propertyContent, 'lib/property-content.js', [
  'available: false',
  "status: 'unavailable'",
  'source: null',
  'Verified ${kind} data is unavailable',
]);

requireIncludes(reviews, 'lib/reviews.js', [
  'available: false',
  'verified: false',
  'source: null',
  'reviews: []',
  'No licensed review provider',
]);

requireIncludes(publicDataContractsTest, 'tests/api-public-data-contracts.test.ts', [
  'keeps weather coordinates at zero valid',
  'adds source contracts to exchange-rate responses',
  'adds source contracts to city-info responses',
  'adds source contracts to holiday responses',
  'provider-returned-weather-only',
]);

requireIncludes(destinationIntelTest, 'tests/api-destination-intel.test.ts', [
  'reports only sources that were actually available for the response',
  'treats zero coordinates as valid',
  'available-source-data-only',
]);

requireIncludes(destinationIntelComponentTest, 'tests/components/DestinationIntel.test.tsx', [
  'renders Open-Meteo tempMax/tempMin fields from the API contract',
  '20° / 12°',
  'NaN',
]);

if (failures.length > 0) {
  console.error('Public data contract audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Public data contract audit passed');
