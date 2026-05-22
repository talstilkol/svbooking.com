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

const ledger = await readProjectFile('lib/price-accuracy.js');
requireIncludes(ledger, 'lib/price-accuracy.js', [
  'recordPriceObservation',
  'recordPriceMismatch',
  'getPriceAccuracyMetrics',
  'price:observations',
  'price:mismatches',
  'mismatchRate',
]);

const clickRoute = await readProjectFile('app/api/click/route.js');
requireIncludes(clickRoute, 'app/api/click/route.js', [
  'recordPriceObservation',
  'outbound-click',
]);

const accuracyRoute = await readProjectFile('app/api/price-accuracy/route.js');
requireIncludes(accuracyRoute, 'app/api/price-accuracy/route.js', [
  'recordPriceMismatch',
  'getPriceAccuracyMetrics',
  'verifyAdminAuth',
  'rateLimit',
  'failOpen: false',
  'isKnownProvider',
  'Cache-Control',
  'no-store',
]);

const priceCache = await readProjectFile('lib/price-cache.js');
requireIncludes(priceCache, 'lib/price-cache.js', [
  'priceAccuracyState',
  'unobserved',
]);

if (failures.length > 0) {
  console.error('Price accuracy audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Price accuracy audit passed');
