import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];

async function readProjectFile(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) failures.push(`${relativePath} is missing: ${snippet}`);
  }
}

const registry = await readProjectFile('lib/providers/registry.js');
requireIncludes(registry, 'lib/providers/registry.js', [
  'available.slice(0, 3)',
  'Promise.any',
  'consecutiveErrors >= 5',
  'quotaUsedPct',
  'sanitizeProviderError',
  'recordProviderUptimeEvent',
]);

const providerRoute = await readProjectFile('app/api/agents/providers/route.js');
requireIncludes(providerRoute, 'app/api/agents/providers/route.js', [
  'verifyAdminAuth',
  'Cache-Control',
  'no-store',
  'resetProvider',
  'getProviderUptimeMetrics',
  'getProviderCoverageMatrix',
  'uptimeSuccessRatePct',
  'coverageObservationCount',
]);

const providerCoverageRoute = await readProjectFile('app/api/agents/providers/coverage/route.js');
requireIncludes(providerCoverageRoute, 'app/api/agents/providers/coverage/route.js', [
  'verifyAdminAuth',
  'getProviderCoverageMatrix',
  'Cache-Control',
  'no-store',
]);

const providerUptimeRoute = await readProjectFile('app/api/agents/providers/uptime/route.js');
requireIncludes(providerUptimeRoute, 'app/api/agents/providers/uptime/route.js', [
  'verifyAdminAuth',
  'getProviderUptimeMetrics',
  'Cache-Control',
  'no-store',
]);

const providerObservability = await readProjectFile('lib/provider-observability.js');
requireIncludes(providerObservability, 'lib/provider-observability.js', [
  'PROVIDER_UPTIME_EVENTS_KEY',
  'recordProviderUptimeEvent',
  'getProviderUptimeMetrics',
  'RETENTION_SECONDS.providerUptimeEvents',
  'rawErrorStorage',
  'not-allowed',
]);

const providerCoverage = await readProjectFile('lib/provider-coverage.js');
requireIncludes(providerCoverage, 'lib/provider-coverage.js', [
  'verified-provider-observations-only',
  'price:observations:',
  'findHotel',
  'byProvider',
  'byCountry',
  'byCity',
  'insufficient-data',
]);

const priceCache = await readProjectFile('lib/price-cache.js');
requireIncludes(priceCache, 'lib/price-cache.js', [
  'fromCache',
  'freshness',
  'partial',
  'lastCheckedAt',
  'taxesIncluded',
  'cancellationPolicy',
  'roomName',
  'deepLink',
  'priceAccuracyState',
]);

if (failures.length > 0) {
  console.error('Provider audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Provider audit passed');
