import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

async function readProjectFile(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

async function requireFile(relativePath) {
  try {
    await access(path.join(root, relativePath));
  } catch {
    fail(`Missing required file: ${relativePath}`);
  }
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) {
      fail(`${relativePath} is missing: ${snippet}`);
    }
  }
}

await requireFile('lib/ops-alerts.js');
await requireFile('lib/ops-alert-delivery.js');
await requireFile('lib/ops-alert-events.js');
await requireFile('lib/webhook-url.js');
await requireFile('app/api/ops/alerts/route.js');
await requireFile('app/api/ops/alerts/evaluate/route.js');
await requireFile('app/api/ops/alerts/events/route.js');
await requireFile('tests/ops-alerts.test.ts');
await requireFile('tests/ops-alert-delivery.test.ts');
await requireFile('tests/webhook-url.test.ts');
await requireFile('tests/ops-alert-evaluate.test.ts');
await requireFile('tests/ops-alert-events.test.ts');

const packageJson = JSON.parse(await readProjectFile('package.json'));
if (!packageJson.scripts?.['audit:alerts']) {
  fail('package.json is missing script: audit:alerts');
}

const alerts = await readProjectFile('lib/ops-alerts.js');
requireIncludes(alerts, 'lib/ops-alerts.js', [
  'ALERT_THRESHOLDS',
  'buildOpsAlerts',
  'getProviderUptimeMetrics',
  'getPriceAccuracyMetrics',
  'provider-uptime-insufficient-data',
  'price-accuracy-insufficient-data',
  'cache-not-durable',
]);

const alertsRoute = await readProjectFile('app/api/ops/alerts/route.js');
requireIncludes(alertsRoute, 'app/api/ops/alerts/route.js', [
  'verifyAdminAuth',
  'buildOpsAlerts',
  'Cache-Control',
  'no-store',
]);

const alertDelivery = await readProjectFile('lib/ops-alert-delivery.js');
requireIncludes(alertDelivery, 'lib/ops-alert-delivery.js', [
  "import { validWebhookUrl } from './webhook-url';",
  'OPS_ALERT_WEBHOOK_URL',
  'OPS_ALERT_WEBHOOK_SECRET',
  'deliverOpsAlertReport',
  'isOpsAlertDeliveryConfigured',
  '[redacted]',
]);

const webhookUrl = await readProjectFile('lib/webhook-url.js');
requireIncludes(webhookUrl, 'lib/webhook-url.js', [
  'validWebhookUrl',
  'NODE_ENV',
  'production',
  'url.username || url.password',
  'LOCAL_WEBHOOK_HOSTS',
  'isRestrictedWebhookHost',
  'isPrivateIpv4',
  'isRestrictedIpv6',
  '169 && second === 254',
  '192 && second === 168',
  "normalized.startsWith('::ffff:')",
]);

const webhookUrlTest = await readProjectFile('tests/webhook-url.test.ts');
requireIncludes(webhookUrlTest, 'tests/webhook-url.test.ts', [
  'allows localhost HTTP only outside production',
  'rejects embedded credentials in webhook URLs',
  'rejects local and private HTTPS destinations',
  'rejects non-localhost HTTP destinations',
  'https://100.64.0.1/hook',
  'https://[fc00::1]/hook',
]);

const opsAlertDeliveryTest = await readProjectFile('tests/ops-alert-delivery.test.ts');
requireIncludes(opsAlertDeliveryTest, 'tests/ops-alert-delivery.test.ts', [
  "NODE_ENV: 'production'",
  'https://user:pass@ops.svbooking.invalid/hook',
]);

const alertEvents = await readProjectFile('lib/ops-alert-events.js');
requireIncludes(alertEvents, 'lib/ops-alert-events.js', [
  'OPS_ALERT_EVENTS_KEY',
  'appendOpsAlertDeliveryEvent',
  'getOpsAlertDeliveryEvents',
  'RETENTION_SECONDS.opsAlertEvents',
]);

const alertEvaluateRoute = await readProjectFile('app/api/ops/alerts/evaluate/route.js');
requireIncludes(alertEvaluateRoute, 'app/api/ops/alerts/evaluate/route.js', [
  'verifyCronAuth',
  'buildOpsAlerts',
  'deliverOpsAlertReport',
  'appendOpsAlertDeliveryEvent',
  'skipped-no-actionable-alerts',
  'Cache-Control',
  'no-store',
]);

const alertEventsRoute = await readProjectFile('app/api/ops/alerts/events/route.js');
requireIncludes(alertEventsRoute, 'app/api/ops/alerts/events/route.js', [
  'verifyAdminAuth',
  'getOpsAlertDeliveryEvents',
  'Cache-Control',
  'no-store',
]);

const opsScorecard = await readProjectFile('lib/ops-scorecard.js');
requireIncludes(opsScorecard, 'lib/ops-scorecard.js', [
  '/api/ops/alerts',
  'provider-uptime-ledger',
  'OPS_ALERT_WEBHOOK_URL',
  'OPS_ALERT_WEBHOOK_SECRET',
]);

const proxy = await readProjectFile('proxy.ts');
requireIncludes(proxy, 'proxy.ts', ['/api/ops/alerts']);

const envExample = await readProjectFile('.env.example');
requireIncludes(envExample, '.env.example', [
  'OPS_ALERT_WEBHOOK_URL=',
  'OPS_ALERT_WEBHOOK_SECRET=',
]);

const vercelConfig = await readProjectFile('vercel.json');
requireIncludes(vercelConfig, 'vercel.json', ['/api/ops/alerts/evaluate']);

const ci = await readProjectFile('.github/workflows/ci.yml');
requireIncludes(ci, '.github/workflows/ci.yml', ['npm run audit:alerts']);

const runbook = await readProjectFile('PRODUCTION-RUNBOOK.md');
requireIncludes(runbook, 'PRODUCTION-RUNBOOK.md', [
  '/api/ops/alerts',
  '/api/ops/alerts/evaluate',
  '/api/ops/alerts/events',
  'insufficient-data',
  'price accuracy drift',
  'not-configured',
]);

if (failures.length > 0) {
  console.error('Alert audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Alert audit passed');
