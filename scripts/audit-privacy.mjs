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

await requireFile('lib/user-data.js');
await requireFile('lib/admin-audit.js');
await requireFile('app/api/me/data/route.js');
await requireFile('app/api/price-alerts/history/route.js');
await requireFile('tests/me-data.test.ts');
await requireFile('tests/price-alerts.test.ts');
await requireFile('tests/admin-audit.test.ts');

const packageJson = JSON.parse(await readProjectFile('package.json'));
if (!packageJson.scripts?.['audit:privacy']) {
  fail('package.json is missing script: audit:privacy');
}

const userData = await readProjectFile('lib/user-data.js');
requireIncludes(userData, 'lib/user-data.js', [
  'USER_DATA_DELETE_CONFIRMATION',
  'getUserDataSnapshot',
  'deleteUserData',
  'getUserDataPrivacyReadiness',
  'userDataSubjectFingerprint',
  'priceAlertUserFingerprint',
  'rawUserIdInOperationalEvents: false',
  'PRICE_ALERT_EVENTS_KEY',
  'PRICE_ALERT_USER_INDEX_KEY',
  'RETENTION_SECONDS.priceAlertEvents',
]);

const adminAudit = await readProjectFile('lib/admin-audit.js');
requireIncludes(adminAudit, 'lib/admin-audit.js', [
  'sanitizeActor',
  'actorFingerprint',
  'SENSITIVE_VALUE_PATTERN',
  'getClientIp',
  'MAX_AUDIT_TEXT_LENGTH',
]);

const adminAuditTest = await readProjectFile('tests/admin-audit.test.ts');
requireIncludes(adminAuditTest, 'tests/admin-audit.test.ts', [
  'fingerprints non-static actors and normalizes invalid client headers',
  'kinde|raw-user-id-123',
  'Bearer must-not-leak',
  'password=must-not-leak',
]);

const meDataRoute = await readProjectFile('app/api/me/data/route.js');
requireIncludes(meDataRoute, 'app/api/me/data/route.js', [
  'requireUser',
  'getUserDataSnapshot',
  'deleteUserData',
  'rateLimit',
  'getClientIp',
  'rateLimitResponse',
  'userDataExportLimiter',
  'userDataDeletionLimiter',
  'failOpen: false',
  'enforceUserDataExportRateLimit',
  'enforceUserDataDeletionRateLimit',
  'x-sv-confirm-delete',
  'Cache-Control',
  'no-store',
]);

const meDataTest = await readProjectFile('tests/me-data.test.ts');
requireIncludes(meDataTest, 'tests/me-data.test.ts', [
  'rate-limits repeated account data exports before reading user datasets again',
  'rate-limits repeated account data deletions before deleting again',
  'Retry-After',
  'Too many requests. Please try again later.',
]);

const priceAlertHistoryRoute = await readProjectFile('app/api/price-alerts/history/route.js');
requireIncludes(priceAlertHistoryRoute, 'app/api/price-alerts/history/route.js', [
  'requireUser',
  'rateLimit',
  'getClientIp',
  'rateLimitResponse',
  'priceAlertHistoryLimiter',
  'failOpen: false',
  'enforcePriceAlertHistoryRateLimit',
  'userFingerprint',
  'sanitizeEvent',
  'Cache-Control',
  'no-store',
]);

const priceAlertsTest = await readProjectFile('tests/price-alerts.test.ts');
requireIncludes(priceAlertsTest, 'tests/price-alerts.test.ts', [
  'rate-limits repeated price alert history reads before scanning stored events',
  'PRICE_ALERT_EVENTS_KEY',
  'Retry-After',
  'Too many requests. Please try again later.',
]);

const healthReadiness = await readProjectFile('lib/health-readiness.js');
requireIncludes(healthReadiness, 'lib/health-readiness.js', [
  'getUserDataPrivacyReadiness',
  'privacy',
]);

for (const route of [
  'app/api/me/trips/route.js',
  'app/api/me/favorites/route.js',
  'app/api/me/prefs/route.js',
  'app/api/price-alerts/route.js',
]) {
  const source = await readProjectFile(route);
  requireIncludes(source, route, ['userDataKey', 'Cache-Control', 'no-store']);
}

const dataExport = await readProjectFile('components/DataExport.tsx');
requireIncludes(dataExport, 'components/DataExport.tsx', [
  '/api/me/data',
  'x-sv-confirm-delete',
  'DELETE_MY_SV_BOOKING_DATA',
]);

const privacyPage = await readProjectFile('app/privacy/page.tsx');
requireIncludes(privacyPage, 'app/privacy/page.tsx', [
  'LegalDocument',
  'privacyEn',
  'privacyHe',
]);

const legalContent = await readProjectFile('lib/legal-content.ts');
requireIncludes(legalContent, 'lib/legal-content.ts', [
  'May 14, 2026',
  '/api/me/data',
  '/api/data-retention',
  'account-data deletion',
  'raw secrets',
]);

const ci = await readProjectFile('.github/workflows/ci.yml');
requireIncludes(ci, '.github/workflows/ci.yml', ['npm run audit:privacy']);

if (failures.length > 0) {
  console.error('Privacy audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Privacy audit passed');
