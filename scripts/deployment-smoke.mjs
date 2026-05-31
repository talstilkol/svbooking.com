const siteUrl = process.env.SITE_URL;
const adminSecret = process.env.ADMIN_API_SECRET;
const cronSecret = process.env.CRON_SECRET;
const failures = [];

function fail(message) {
  failures.push(message);
}

function buildUrl(pathname) {
  return new URL(pathname, siteUrl).toString();
}

async function readJson(pathname, init = {}) {
  const response = await fetch(buildUrl(pathname), {
    ...init,
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

await expectStatus('health', '/api/health', 200, {}, { noStore: true });
await expectStatus('catalog stats', '/api/catalog/stats', 200);
await expectStatus('i18n readiness', '/api/i18n?locale=en', 200, {}, { noStore: true });

const review = await expectStatus('review unavailable state', '/api/reviews/g187147-d188728', 200, {}, { noStore: true });
if (review.body?.status !== 'unavailable' && review.body?.availability !== 'unavailable') {
  fail('review endpoint must expose an unavailable state until a licensed provider is configured');
}

const property = await expectStatus('property content unavailable state', '/api/property-content/g187147-d188728', 200, {}, { noStore: true });
if (property.body?.status !== 'unavailable' && property.body?.availability !== 'unavailable') {
  fail('property-content endpoint must expose an unavailable state until a licensed provider is configured');
}

await expectStatus('admin scorecard unauthenticated guard', '/api/ops/scorecard', 401, {}, { noStore: true });
await expectStatus('provider coverage unauthenticated guard', '/api/agents/providers/coverage', 401, {}, { noStore: true });
await expectStatus('cron orchestrate unauthenticated guard', '/api/agents/auto/orchestrate', 401, {}, { noStore: true });

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
