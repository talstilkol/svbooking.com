const siteUrl = process.env.SITE_URL;
const adminSecret = process.env.ADMIN_API_SECRET;
const cronSecret = process.env.CRON_SECRET;
const DEFAULT_TIMEOUT_MS = 15000;
const failures = [];

function fail(message) {
  failures.push(message);
}

function buildUrl(pathname) {
  return new URL(pathname, siteUrl).toString();
}

function smokeTimeoutMs() {
  const value = Number(process.env.SMOKE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : DEFAULT_TIMEOUT_MS;
}

async function readJson(pathname, init = {}) {
  const timeoutMs = smokeTimeoutMs();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(buildUrl(pathname), {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init.headers || {}),
      },
    });
    let body = null;
    try {
      body = await response.json();
    } catch {}
    return { response, body };
  } catch (error) {
    const reason = error?.name === 'AbortError'
      ? `timed out after ${timeoutMs}ms`
      : String(error?.message || error || 'request failed');
    fail(`${pathname} request failed: ${reason}`);
    return {
      response: {
        status: 0,
        headers: { get: () => null },
      },
      body: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function expectStatus(label, pathname, expectedStatus, init = {}, { noStore = false } = {}) {
  const { response, body } = await readJson(pathname, init);
  if (response.status !== expectedStatus) {
    fail(`${label} expected HTTP ${expectedStatus}, got ${response.status}`);
  }
  if (noStore && response.headers.get('Cache-Control')?.toLowerCase().includes('no-store') !== true) {
    fail(`${label} must return Cache-Control: no-store`);
  }
  return { response, body };
}

if (!siteUrl) {
  console.error('Deployment smoke requires SITE_URL, for example: SITE_URL=https://www.example.com npm run smoke:deployment');
  process.exit(1);
}

let parsedSiteUrl;
try {
  parsedSiteUrl = new URL(siteUrl);
} catch {
  console.error('Deployment smoke requires SITE_URL to be a valid absolute URL');
  process.exit(1);
}

if (!['http:', 'https:'].includes(parsedSiteUrl.protocol)) {
  console.error('Deployment smoke SITE_URL must use http or https');
  process.exit(1);
}

const isLocalSite = ['localhost', '127.0.0.1', '::1'].includes(parsedSiteUrl.hostname);
if (!isLocalSite && (!adminSecret || !cronSecret)) {
  fail('Deployment smoke against non-local SITE_URL requires ADMIN_API_SECRET and CRON_SECRET in the smoke environment');
}

await expectStatus('health', '/api/health', 200, {}, { noStore: true });
await expectStatus('catalog stats', '/api/catalog/stats', 200);
await expectStatus('i18n readiness', '/api/i18n?locale=en', 200, {}, { noStore: true });

const review = await expectStatus('review unavailable state', '/api/reviews/g187147-d188728', 200, {}, { noStore: true });
if (review.body?.status !== 'unavailable' && review.body?.availability !== 'unavailable') {
  fail('review endpoint must expose an unavailable state until a licensed provider is configured');
}

const property = await expectStatus('property content unavailable state', '/api/property-content/g187147-d188728', 200, {}, { noStore: true });
const propertySections = Object.values(property.body?.sections || {});
const allPropertySectionsUnavailable = propertySections.length > 0 && propertySections.every((section) =>
  section?.available === false || section?.status === 'unavailable' || section?.availability === 'unavailable'
);
if (!allPropertySectionsUnavailable) {
  fail('property-content endpoint must expose an unavailable state until a licensed provider is configured');
}

const expectedAdminGuardStatus = adminSecret ? 401 : 403;
const expectedCronGuardStatus = cronSecret ? 401 : 403;

await expectStatus('admin scorecard unauthenticated guard', '/api/ops/scorecard', expectedAdminGuardStatus, {}, { noStore: true });
await expectStatus('provider coverage unauthenticated guard', '/api/agents/providers/coverage', expectedAdminGuardStatus, {}, { noStore: true });
await expectStatus('cron orchestrate unauthenticated guard', '/api/agents/auto/orchestrate', expectedCronGuardStatus, {}, { noStore: true });

if (adminSecret) {
  await expectStatus('admin scorecard authenticated smoke', '/api/ops/scorecard', 200, {
    headers: { Authorization: `Bearer ${adminSecret}` },
  }, { noStore: true });
  await expectStatus('provider coverage authenticated smoke', '/api/agents/providers/coverage', 200, {
    headers: { Authorization: `Bearer ${adminSecret}` },
  }, { noStore: true });
}

if (cronSecret && process.env.SMOKE_RUN_CRON === '1') {
  await expectStatus('cron orchestrate authenticated smoke', '/api/agents/auto/orchestrate', 200, {
    headers: { Authorization: `Bearer ${cronSecret}` },
  }, { noStore: true });
}

if (failures.length > 0) {
  console.error('Deployment smoke failures:');
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log(`Deployment smoke passed for ${parsedSiteUrl.origin}`);
