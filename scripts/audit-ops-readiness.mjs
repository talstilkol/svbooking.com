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

const packageJson = JSON.parse(await readProjectFile('package.json'));
const scripts = packageJson.scripts || {};

for (const scriptName of [
  'audit:guardrails',
  'audit:provenance',
  'audit:deployment-smoke',
  'smoke:deployment',
  'audit:catalog',
  'audit:docs',
  'audit:env',
  'audit:secrets',
  'audit:runtime',
  'audit:external-fetches',
  'audit:public-api-urls',
  'audit:affiliate-security',
  'audit:security-responses',
  'audit:api-errors',
  'audit:cron-cache',
  'audit:coverage',
  'audit:ops',
  'audit:production',
  'audit:production:strict',
  'release:state',
  'release:state:strict',
  'audit:duplicates',
  'audit:providers',
  'audit:reviews',
  'audit:release-deletions',
  'audit:i18n',
  'audit:price-accuracy',
  'audit:pwa',
  'audit:rum',
  'audit:ops-scorecard',
  'audit:ui-quality',
  'audit:accessibility',
  'audit:seo',
  'audit:html-safety',
  'audit:csrf',
  'audit:storage',
  'audit:data-retention',
  'audit:privacy',
  'audit:alerts',
  'lint',
  'test',
  'test:coverage',
  'build',
  'test:e2e',
]) {
  if (!scripts[scriptName]) {
    fail(`package.json is missing script: ${scriptName}`);
  }
}

if (!packageJson.overrides?.postcss) {
  fail('package.json is missing a PostCSS override');
}

await requireFile('.github/workflows/ci.yml');
await requireFile('lib/admin-auth.js');
await requireFile('lib/admin-audit.js');
await requireFile('lib/health-readiness.js');
await requireFile('lib/production-readiness.mjs');
await requireFile('lib/ops-scorecard.js');
await requireFile('lib/competitor-parity.js');
await requireFile('lib/catalog-media-quality.js');
await requireFile('lib/pwa-readiness.js');
await requireFile('lib/data-retention.js');
await requireFile('lib/user-data.js');
await requireFile('lib/provider-observability.js');
await requireFile('lib/provider-coverage.js');
await requireFile('lib/ops-alerts.js');
await requireFile('lib/ops-alert-delivery.js');
await requireFile('lib/ops-alert-events.js');
await requireFile('lib/request-origin.js');
await requireFile('lib/utils/fetch-with-timeout.js');
await requireFile('lib/utils/jsonLd.ts');
await requireFile('.env.example');
await requireFile('PRODUCTION-RUNBOOK.md');
await requireFile('vercel.json');
await requireFile('app/api/health/route.js');
await requireFile('app/api/ops/scorecard/route.js');
await requireFile('app/api/ops/alerts/route.js');
await requireFile('app/api/ops/alerts/evaluate/route.js');
await requireFile('app/api/ops/alerts/events/route.js');
await requireFile('components/AgentDashboard.tsx');
await requireFile('app/api/data-retention/route.js');
await requireFile('app/api/me/data/route.js');
await requireFile('app/api/agents/providers/uptime/route.js');
await requireFile('app/api/agents/providers/coverage/route.js');
await requireFile('app/api/agents/audit/route.js');
await requireFile('app/api/price-alerts/route.js');
await requireFile('app/api/price-alerts/evaluate/route.js');
await requireFile('app/api/price-alerts/events/route.js');
await requireFile('app/api/price-alerts/history/route.js');
await requireFile('app/api/price-alerts/unsubscribe/route.js');
await requireFile('app/api/catalog/candidates/route.js');
await requireFile('app/api/reviews/[hotelKey]/route.js');
await requireFile('app/api/property-content/[hotelKey]/route.js');
await requireFile('app/api/price-accuracy/route.js');
await requireFile('app/api/i18n/route.js');
await requireFile('lib/price-alert-delivery.js');
await requireFile('lib/price-alert-unsubscribe.js');
await requireFile('tests/price-alert-unsubscribe.test.ts');
await requireFile('tests/price-alerts.test.ts');
await requireFile('tests/production-readiness.test.ts');
await requireFile('tests/production-readiness-script.test.ts');
await requireFile('tests/me-trips.test.ts');
await requireFile('lib/reviews.js');
await requireFile('lib/property-content.js');
await requireFile('lib/i18n.js');
await requireFile('scripts/audit-production-readiness.mjs');
await requireFile('scripts/release-state.mjs');
await requireFile('scripts/audit-docs.mjs');
await requireFile('scripts/audit-env-contract.mjs');
await requireFile('scripts/audit-secret-hygiene.mjs');
await requireFile('scripts/audit-runtime-warnings.mjs');
await requireFile('scripts/audit-external-fetches.mjs');
await requireFile('scripts/audit-public-api-url-safety.mjs');
await requireFile('scripts/audit-affiliate-security.mjs');
await requireFile('scripts/audit-security-responses.mjs');
await requireFile('scripts/audit-api-error-cache.mjs');
await requireFile('scripts/audit-cron-cache.mjs');
await requireFile('scripts/audit-coverage.mjs');
await requireFile('scripts/audit-provenance.mjs');
await requireFile('scripts/audit-deployment-smoke.mjs');
await requireFile('scripts/deployment-smoke.mjs');
await requireFile('scripts/audit-providers.mjs');
await requireFile('scripts/audit-reviews.mjs');
await requireFile('scripts/audit-release-deletions.mjs');
await requireFile('scripts/audit-i18n.mjs');
await requireFile('scripts/audit-price-accuracy.mjs');
await requireFile('scripts/audit-pwa.mjs');
await requireFile('scripts/audit-rum.mjs');
await requireFile('scripts/audit-ops-scorecard.mjs');
await requireFile('scripts/audit-ui-quality.mjs');
await requireFile('scripts/audit-accessibility.mjs');
await requireFile('scripts/audit-seo.mjs');
await requireFile('scripts/audit-html-safety.mjs');
await requireFile('scripts/audit-csrf.mjs');
await requireFile('scripts/audit-storage-keys.mjs');
await requireFile('scripts/audit-data-retention.mjs');
await requireFile('scripts/audit-privacy.mjs');
await requireFile('scripts/audit-alerts.mjs');

const ci = await readProjectFile('.github/workflows/ci.yml');
requireIncludes(ci, '.github/workflows/ci.yml', [
  'npm ci --ignore-scripts',
  'npm audit --audit-level=moderate',
  'npm ls postcss --all',
  'npm run audit:guardrails',
  'npm run audit:provenance',
  'npm run audit:deployment-smoke',
  'npm run audit:catalog',
  'npm run audit:docs',
  'npm run audit:env',
  'npm run audit:secrets',
  'npm run audit:runtime',
  'npm run audit:external-fetches',
  'npm run audit:public-api-urls',
  'npm run audit:affiliate-security',
  'npm run audit:security-responses',
  'npm run audit:api-errors',
  'npm run audit:cron-cache',
  'npm run audit:coverage',
  'npm run audit:ops',
  'npm run audit:agents',
  'npm run audit:duplicates',
  'npm run audit:providers',
  'npm run audit:reviews',
  'npm run audit:release-deletions',
  'npm run audit:i18n',
  'npm run audit:price-accuracy',
  'npm run audit:pwa',
  'npm run audit:rum',
  'npm run audit:ops-scorecard',
  'npm run audit:ui-quality',
  'npm run audit:accessibility',
  'npm run audit:seo',
  'npm run audit:html-safety',
  'npm run audit:csrf',
  'npm run audit:storage',
  'npm run audit:data-retention',
  'npm run audit:privacy',
  'npm run audit:alerts',
  'npm run audit:production',
  'npm run release:state:strict',
  'npm run lint',
  'npm test',
  'npm run build',
  'npm run test:e2e',
]);

const nextConfig = await readProjectFile('next.config.ts');
requireIncludes(nextConfig, 'next.config.ts', [
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "process.env.NODE_ENV !== 'production'",
]);

const adminRoutes = [
  'app/api/agents/providers/route.js',
  'app/api/agents/discovered/route.js',
  'app/api/catalog/validate/route.js',
];

for (const route of adminRoutes) {
  const source = await readProjectFile(route);
  requireIncludes(source, route, ['verifyAdminAuth', 'recordAdminAuditEvent']);
}

const operationalAdminRoutes = [
  'app/api/agents/providers/route.js',
  'app/api/agents/discovered/route.js',
  'app/api/agents/health-check/route.js',
  'app/api/agents/auto/status/route.js',
  'app/api/catalog/discover/route.js',
  'app/api/catalog/discover-osm/route.js',
];

for (const route of operationalAdminRoutes) {
  const source = await readProjectFile(route);
  requireIncludes(source, route, ['verifyAdminAuth', 'Cache-Control', 'no-store']);
}

const auditRoute = await readProjectFile('app/api/agents/audit/route.js');
requireIncludes(auditRoute, 'app/api/agents/audit/route.js', [
  'verifyAdminAuth',
  'getAdminAuditEvents',
  'Cache-Control',
  'no-store',
]);

const adminAudit = await readProjectFile('lib/admin-audit.js');
requireIncludes(adminAudit, 'lib/admin-audit.js', [
  'sanitizeActor',
  'actorFingerprint',
  'SENSITIVE_VALUE_PATTERN',
  'getClientIp',
  'MAX_AUDIT_TEXT_LENGTH',
]);

const clickRoute = await readProjectFile('app/api/click/route.js');
requireIncludes(clickRoute, 'app/api/click/route.js', [
  'verifyAdminAuth',
  'Cache-Control',
  'no-store',
]);

const healthRoute = await readProjectFile('app/api/health/route.js');
requireIncludes(healthRoute, 'app/api/health/route.js', [
  'buildHealthSnapshot',
  'Cache-Control',
  'no-store',
]);

const healthReadiness = await readProjectFile('lib/health-readiness.js');
requireIncludes(healthReadiness, 'lib/health-readiness.js', [
  'adminAuthConfigured',
  'productionReady',
  'providers',
  'catalog',
  'cache',
  'agents',
  'alerts',
  'opsAlerts',
  'isPriceAlertDeliveryConfigured',
  'isPriceAlertUnsubscribeConfigured',
  'isOpsAlertDeliveryConfigured',
  'reviews',
  'i18n',
  'pwa',
  'retention',
  'privacy',
  'launchReadiness',
  'freeOnlyLaunchReady',
  'globalParityReady',
]);

const opsScorecard = await readProjectFile('lib/ops-scorecard.js');
requireIncludes(opsScorecard, 'lib/ops-scorecard.js', [
  'buildOpsScorecard',
  'buildCompetitorParity',
  'buildCatalogMediaQuality',
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
  '/api/ops/alerts',
  'blockers',
]);

const catalogMediaQuality = await readProjectFile('lib/catalog-media-quality.js');
requireIncludes(catalogMediaQuality, 'lib/catalog-media-quality.js', [
  'buildCatalogMediaQuality',
  'MAX_REUSE_CITIES_PER_IMAGE',
  'reusedImages',
  'licensedImageSourceMetadata',
  'Replace reused catalog media',
]);

const competitorParity = await readProjectFile('lib/competitor-parity.js');
requireIncludes(competitorParity, 'lib/competitor-parity.js', [
  'buildCompetitorParity',
  'official-or-platform-owned-public-pages-only',
  'inventory-breadth',
  'price-freshness',
  'mobile-installability',
  'reviews-property-content',
  'alerts-retention',
  'booking-handoff-quality',
  'local-market-coverage',
]);

const opsScorecardRoute = await readProjectFile('app/api/ops/scorecard/route.js');
requireIncludes(opsScorecardRoute, 'app/api/ops/scorecard/route.js', [
  'verifyAdminAuth',
  'buildOpsScorecard',
  'Cache-Control',
  'no-store',
]);

const opsAlerts = await readProjectFile('lib/ops-alerts.js');
requireIncludes(opsAlerts, 'lib/ops-alerts.js', [
  'buildOpsAlerts',
  'getProviderUptimeMetrics',
  'getPriceAccuracyMetrics',
  'ALERT_THRESHOLDS',
]);

const opsAlertsRoute = await readProjectFile('app/api/ops/alerts/route.js');
requireIncludes(opsAlertsRoute, 'app/api/ops/alerts/route.js', [
  'verifyAdminAuth',
  'buildOpsAlerts',
  'Cache-Control',
  'no-store',
]);

const opsAlertDelivery = await readProjectFile('lib/ops-alert-delivery.js');
requireIncludes(opsAlertDelivery, 'lib/ops-alert-delivery.js', [
  'OPS_ALERT_WEBHOOK_URL',
  'OPS_ALERT_WEBHOOK_SECRET',
  'deliverOpsAlertReport',
  'isOpsAlertDeliveryConfigured',
]);

const opsAlertsEvaluateRoute = await readProjectFile('app/api/ops/alerts/evaluate/route.js');
requireIncludes(opsAlertsEvaluateRoute, 'app/api/ops/alerts/evaluate/route.js', [
  'verifyCronAuth',
  'buildOpsAlerts',
  'deliverOpsAlertReport',
  'appendOpsAlertDeliveryEvent',
  'Cache-Control',
  'no-store',
]);

const opsAlertsEvents = await readProjectFile('lib/ops-alert-events.js');
requireIncludes(opsAlertsEvents, 'lib/ops-alert-events.js', [
  'OPS_ALERT_EVENTS_KEY',
  'appendOpsAlertDeliveryEvent',
  'getOpsAlertDeliveryEvents',
  'RETENTION_SECONDS.opsAlertEvents',
]);

const opsAlertsEventsRoute = await readProjectFile('app/api/ops/alerts/events/route.js');
requireIncludes(opsAlertsEventsRoute, 'app/api/ops/alerts/events/route.js', [
  'verifyAdminAuth',
  'getOpsAlertDeliveryEvents',
  'Cache-Control',
  'no-store',
]);

const agentDashboard = await readProjectFile('components/AgentDashboard.tsx');
requireIncludes(agentDashboard, 'components/AgentDashboard.tsx', [
  '/api/ops/scorecard',
  '/api/ops/alerts',
  'Production Readiness',
  'topOpsBlockers',
  'globalParityReady',
]);

const pwaReadiness = await readProjectFile('lib/pwa-readiness.js');
requireIncludes(pwaReadiness, 'lib/pwa-readiness.js', [
  'getPwaReadiness',
  'NEXT_PUBLIC_PUSH_PUBLIC_KEY',
  'PUSH_PRIVATE_KEY',
  'network-required',
]);

const dataRetention = await readProjectFile('lib/data-retention.js');
requireIncludes(dataRetention, 'lib/data-retention.js', [
  'RETENTION_SECONDS',
  'getDataRetentionPolicies',
  'provider-uptime-events',
  'ops-alert-events',
  'rawSecretStorage',
  'not-allowed',
]);

const providerObservability = await readProjectFile('lib/provider-observability.js');
requireIncludes(providerObservability, 'lib/provider-observability.js', [
  'PROVIDER_UPTIME_EVENTS_KEY',
  'recordProviderUptimeEvent',
  'getProviderUptimeMetrics',
  'rawErrorStorage',
  'not-allowed',
]);

const providerUptimeRoute = await readProjectFile('app/api/agents/providers/uptime/route.js');
requireIncludes(providerUptimeRoute, 'app/api/agents/providers/uptime/route.js', [
  'verifyAdminAuth',
  'getProviderUptimeMetrics',
  'Cache-Control',
  'no-store',
]);

const dataRetentionRoute = await readProjectFile('app/api/data-retention/route.js');
requireIncludes(dataRetentionRoute, 'app/api/data-retention/route.js', [
  'getDataRetentionPolicies',
  'getDataRetentionReadiness',
  'Cache-Control',
  'no-store',
]);

const userData = await readProjectFile('lib/user-data.js');
requireIncludes(userData, 'lib/user-data.js', [
  'USER_DATA_DELETE_CONFIRMATION',
  'getUserDataSnapshot',
  'deleteUserData',
  'getUserDataPrivacyReadiness',
  'rawUserIdInOperationalEvents: false',
]);

const userDataRoute = await readProjectFile('app/api/me/data/route.js');
requireIncludes(userDataRoute, 'app/api/me/data/route.js', [
  'requireUser',
  'assertSameOrigin',
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

const requestOrigin = await readProjectFile('lib/request-origin.js');
requireIncludes(requestOrigin, 'lib/request-origin.js', [
  'expectedRequestOrigin',
  'isSameOriginRequest',
  'assertSameOrigin',
  'sec-fetch-site',
  'Same-origin request required',
]);

const envExample = await readProjectFile('.env.example');
requireIncludes(envExample, '.env.example', [
  'ADMIN_API_SECRET=',
  'CRON_SECRET=',
  'UPSTASH_REDIS_REST_URL=',
  'UPSTASH_REDIS_REST_TOKEN=',
  'KINDE_CLIENT_ID=',
  'KINDE_CLIENT_SECRET=',
  'KINDE_ISSUER_URL=',
  'KINDE_SITE_URL=',
  'KINDE_POST_LOGOUT_REDIRECT_URL=',
  'KINDE_POST_LOGIN_REDIRECT_URL=',
  'RAPIDAPI_KEY=',
  'SERPAPI_KEY=',
  'MAKCORPS_API_KEY=',
  'AMADEUS_CLIENT_ID=',
  'AMADEUS_CLIENT_SECRET=',
  'PRICE_ALERT_WEBHOOK_URL=',
  'PRICE_ALERT_WEBHOOK_SECRET=',
  'PRICE_ALERT_UNSUBSCRIBE_SECRET=',
  'OPS_ALERT_WEBHOOK_URL=',
  'OPS_ALERT_WEBHOOK_SECRET=',
  'NEXT_PUBLIC_PUSH_PUBLIC_KEY=',
  'PUSH_PRIVATE_KEY=',
  'REVIEWS_PROVIDER_NAME=',
  'REVIEWS_PROVIDER_LICENSED=',
]);

const productionRunbook = await readProjectFile('PRODUCTION-RUNBOOK.md');
requireIncludes(productionRunbook, 'PRODUCTION-RUNBOOK.md', [
  'npm run audit:production:strict',
  '/api/agents/auto/orchestrate',
  '/api/price-alerts/evaluate',
  '/api/ops/alerts/evaluate',
  '/api/ops/alerts/events',
  '/api/price-alerts/history',
  '/api/price-alerts/unsubscribe',
  '/api/me/data',
  '/api/agents/providers/uptime',
  ['Do not use `Math', '.random()`'].join(''),
  'userFingerprint',
  'unsubscribe token',
  'Provider uptime/probe events',
  '/api/ops/alerts',
  'not-configured',
]);

const vercelConfig = await readProjectFile('vercel.json');
requireIncludes(vercelConfig, 'vercel.json', [
  '/api/agents/auto/orchestrate',
  '/api/price-alerts/evaluate',
  '/api/ops/alerts/evaluate',
  '0 */6 * * *',
]);

const priceAlertsRoute = await readProjectFile('app/api/price-alerts/route.js');
requireIncludes(priceAlertsRoute, 'app/api/price-alerts/route.js', [
  'assertSameOrigin',
  'rateLimit',
  'getClientIp',
  'rateLimitResponse',
  'priceAlertMutationLimiter',
  'failOpen: false',
  'enforceMutationRateLimit',
  'Cache-Control',
  'no-store',
]);

const priceAlertEvaluator = await readProjectFile('app/api/price-alerts/evaluate/route.js');
requireIncludes(priceAlertEvaluator, 'app/api/price-alerts/evaluate/route.js', [
  'verifyCronAuth',
  'getCachedRates',
  'deliverPriceAlertEvent',
  'createPriceAlertUnsubscribeToken',
  'findLowestVerifiedRate',
  'lastEvaluationSkippedReason',
  'stale-or-partial-price',
  'unsubscribeToken',
  'deliveryStatus',
  'not-configured',
  'Cache-Control',
  'no-store',
]);

const priceAlertEvents = await readProjectFile('app/api/price-alerts/events/route.js');
requireIncludes(priceAlertEvents, 'app/api/price-alerts/events/route.js', [
  'verifyAdminAuth',
  'isPriceAlertDeliveryConfigured',
  'deliveryStatus',
  'not-configured',
  'Cache-Control',
  'no-store',
]);

const priceAlertHistory = await readProjectFile('app/api/price-alerts/history/route.js');
requireIncludes(priceAlertHistory, 'app/api/price-alerts/history/route.js', [
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

const priceAlertHistoryTest = await readProjectFile('tests/price-alerts.test.ts');
requireIncludes(priceAlertHistoryTest, 'tests/price-alerts.test.ts', [
  'rate-limits repeated price alert history reads before scanning stored events',
  'PRICE_ALERT_EVENTS_KEY',
  'Retry-After',
  'Too many requests. Please try again later.',
]);

const priceAlertDelivery = await readProjectFile('lib/price-alert-delivery.js');
requireIncludes(priceAlertDelivery, 'lib/price-alert-delivery.js', [
  "import { validWebhookUrl } from './webhook-url';",
  'PRICE_ALERT_WEBHOOK_URL',
  'PRICE_ALERT_WEBHOOK_SECRET',
  'userFingerprint',
  'unsubscribeToken',
  'not-configured',
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

const priceAlertUnsubscribe = await readProjectFile('lib/price-alert-unsubscribe.js');
requireIncludes(priceAlertUnsubscribe, 'lib/price-alert-unsubscribe.js', [
  'createHmac',
  'timingSafeEqual',
  'PRICE_ALERT_UNSUBSCRIBE_SECRET',
  'createPriceAlertUnsubscribeToken',
  'matchesPriceAlertUnsubscribeToken',
  'matchesPriceAlertStoredUnsubscribeToken',
]);

const priceAlertUnsubscribeRoute = await readProjectFile('app/api/price-alerts/unsubscribe/route.js');
requireIncludes(priceAlertUnsubscribeRoute, 'app/api/price-alerts/unsubscribe/route.js', [
  'matchesPriceAlertUnsubscribeToken',
  'matchesPriceAlertStoredUnsubscribeToken',
  'rateLimit',
  'getClientIp',
  'rateLimitResponse',
  'unsubscribeLimiter',
  'failOpen: false',
  "status: 'cancelled'",
  'userFingerprint',
  'Cache-Control',
  'no-store',
]);

const priceAlertUnsubscribeTest = await readProjectFile('tests/price-alert-unsubscribe.test.ts');
requireIncludes(priceAlertUnsubscribeTest, 'tests/price-alert-unsubscribe.test.ts', [
  'compares stored unsubscribe tokens with timing-safe equality',
  'matchesPriceAlertStoredUnsubscribeToken',
]);

const priceAlertsTest = await readProjectFile('tests/price-alerts.test.ts');
requireIncludes(priceAlertsTest, 'tests/price-alerts.test.ts', [
  'rate-limits repeated price alert mutations before writing more alerts',
  'rate-limits repeated unsubscribe token attempts',
  'Retry-After',
  'Too many requests. Please try again later.',
]);

const productionReadiness = await readProjectFile('lib/production-readiness.mjs');
requireIncludes(productionReadiness, 'lib/production-readiness.mjs', [
  'PRODUCTION_READINESS_STRICT',
  'MIN_SECRET_ENV_LENGTH',
  'PLACEHOLDER_ENV_VALUES',
  'SENSITIVE_ENV_NAME_PATTERN',
  'URL_ENV_NAME_PATTERN',
  'getEnvConfigurationIssue',
  'placeholder value is not allowed',
  'must be an HTTPS URL without credentials',
  'must be at least',
  'Invalid required env',
  'Invalid Kinde env',
  'ADMIN_API_SECRET',
  'CRON_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'PRICE_ALERT_UNSUBSCRIBE_SECRET',
  'OPS_ALERT_WEBHOOK_URL',
  'OPS_ALERT_WEBHOOK_SECRET',
  'NEXT_PUBLIC_PUSH_PUBLIC_KEY',
  'PUSH_PRIVATE_KEY',
  'REVIEWS_PROVIDER_NAME',
  'REVIEWS_PROVIDER_LICENSED',
  'No complete paid/partner pricing provider env group is configured',
  'Values are intentionally not printed',
]);

const productionReadinessTest = await readProjectFile('tests/production-readiness.test.ts');
requireIncludes(productionReadinessTest, 'tests/production-readiness.test.ts', [
  'rejects placeholder, short, and non-HTTPS production env values',
  'getEnvConfigurationIssue',
  'placeholder value is not allowed',
  'must be an HTTPS URL without credentials',
]);

const productionReadinessScriptTest = await readProjectFile('tests/production-readiness-script.test.ts');
requireIncludes(productionReadinessScriptTest, 'tests/production-readiness-script.test.ts', [
  'fails strict mode for placeholder or weak env values without printing them',
  'Invalid required env: ADMIN_API_SECRET',
  'Invalid Kinde env: KINDE_ISSUER_URL',
]);

const catalogCandidatesRoute = await readProjectFile('app/api/catalog/candidates/route.js');
requireIncludes(catalogCandidatesRoute, 'app/api/catalog/candidates/route.js', [
  'verifyAdminAuth',
  'listCandidates',
  'markCandidateStale',
  'recordAdminAuditEvent',
  'Cache-Control',
  'no-store',
]);

const reviewsRoute = await readProjectFile('app/api/reviews/[hotelKey]/route.js');
requireIncludes(reviewsRoute, 'app/api/reviews/[hotelKey]/route.js', [
  'getUnavailableReviewSummary',
  'Cache-Control',
  'no-store',
]);

const propertyContentRoute = await readProjectFile('app/api/property-content/[hotelKey]/route.js');
requireIncludes(propertyContentRoute, 'app/api/property-content/[hotelKey]/route.js', [
  'getPropertyContent',
  'Cache-Control',
  'no-store',
]);

const priceAccuracyRoute = await readProjectFile('app/api/price-accuracy/route.js');
requireIncludes(priceAccuracyRoute, 'app/api/price-accuracy/route.js', [
  'recordPriceMismatch',
  'getPriceAccuracyMetrics',
  'verifyAdminAuth',
  'failOpen: false',
  'Cache-Control',
  'no-store',
]);

for (const route of ['components/JsonLd.tsx', 'components/SchemaOrg.tsx', 'components/FAQ.tsx']) {
  const source = await readProjectFile(route);
  requireIncludes(source, route, ['serializeJsonLd']);
}

for (const route of [
  'app/api/me/trips/route.js',
  'app/api/me/favorites/route.js',
  'app/api/me/prefs/route.js',
]) {
  const source = await readProjectFile(route);
  requireIncludes(source, route, [
    'requireUser',
    'rateLimit',
    'getClientIp',
    'rateLimitResponse',
    'userDataMutationLimiter',
    'failOpen: false',
    'enforceUserDataMutationRateLimit',
    'Cache-Control',
    'no-store',
  ]);
}

const meTripsTest = await readProjectFile('tests/me-trips.test.ts');
requireIncludes(meTripsTest, 'tests/me-trips.test.ts', [
  'rate-limits repeated user trip mutations before writing more trips',
  'Retry-After',
  'Too many requests. Please try again later.',
]);

const sensitiveRoutes = [
  'lib/agent-price-recommendation.js',
  'app/api/compare/route.js',
  'app/api/cheaper-dates/route.js',
  'app/api/city-info/route.js',
  'app/api/destination-intel/route.js',
  'app/api/deals/route.js',
  'app/api/events/route.js',
  'app/api/exchange-rates/route.js',
  'app/api/geo/route.js',
  'app/api/holidays/route.js',
  'app/api/hotel-amenities/route.js',
  'app/api/pois/route.js',
  'app/api/travel-guide/route.js',
  'app/api/weather/route.js',
  'app/api/catalog/validate/route.js',
  'app/api/catalog/discover/route.js',
  'app/api/catalog/discover-osm/route.js',
  'app/api/click/route.js',
  'app/api/price-accuracy/route.js',
  'app/api/agents/availability/route.js',
  'app/api/agents/deals/route.js',
  'app/api/agents/health-check/route.js',
  'app/api/agents/recommendations/route.js',
];

for (const route of sensitiveRoutes) {
  const source = await readProjectFile(route);
  requireIncludes(source, route, ['failOpen: false']);
}

if (failures.length > 0) {
  console.error('Ops readiness audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Ops readiness audit passed');
