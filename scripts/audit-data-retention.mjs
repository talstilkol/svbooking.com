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

const policy = await readProjectFile('lib/data-retention.js');
requireIncludes(policy, 'lib/data-retention.js', [
  'RETENTION_SECONDS',
  'getDataRetentionPolicies',
  'getDataRetentionReadiness',
  'admin-audit-events',
  'price-accuracy-events',
  'price-alert-events',
  'ops-alert-events',
  'provider-uptime-events',
  'user-owned-alerts-favorites-trips',
  'user-action-via-/api/me/data-or-auth-provider-retention',
  'rawSecretStorage',
  'not-allowed',
]);

const route = await readProjectFile('app/api/data-retention/route.js');
requireIncludes(route, 'app/api/data-retention/route.js', [
  'getDataRetentionPolicies',
  'getDataRetentionReadiness',
  'Cache-Control',
  'no-store',
]);

for (const relativePath of [
  'lib/admin-audit.js',
  'lib/price-accuracy.js',
  'lib/catalog-candidates.js',
  'lib/agent-utils.js',
  'lib/providers/registry.js',
  'lib/provider-observability.js',
  'lib/ops-alert-events.js',
  'app/api/price-alerts/evaluate/route.js',
  'app/api/agents/auto/provider-manager/route.js',
]) {
  const source = await readProjectFile(relativePath);
  requireIncludes(source, relativePath, ['RETENTION_SECONDS']);
}

const health = await readProjectFile('lib/health-readiness.js');
requireIncludes(health, 'lib/health-readiness.js', [
  'getDataRetentionReadiness',
  'retention',
]);

if (failures.length > 0) {
  console.error('Data retention audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Data retention audit passed');
