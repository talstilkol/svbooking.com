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
    fail(`Missing required security-response file: ${relativePath}`);
    return '';
  }
}

async function requireFile(relativePath) {
  try {
    await access(path.join(root, relativePath));
  } catch {
    fail(`Missing required security-response file: ${relativePath}`);
  }
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) fail(`${relativePath} is missing: ${snippet}`);
  }
}

await requireFile('lib/rate-limit.js');
await requireFile('lib/admin-auth.js');
await requireFile('lib/validation.js');
await requireFile('tests/rate-limit.test.ts');
await requireFile('tests/validation.test.ts');
await requireFile('tests/admin-auth-helper.test.ts');
await requireFile('package.json');
await requireFile('.github/workflows/ci.yml');
await requireFile('README.md');
await requireFile('PRODUCTION-RUNBOOK.md');

const [
  rateLimit,
  adminAuth,
  validation,
  rateLimitTest,
  validationTest,
  adminAuthHelperTest,
  packageRaw,
  ci,
  readme,
  runbook,
] = await Promise.all([
  readProjectFile('lib/rate-limit.js'),
  readProjectFile('lib/admin-auth.js'),
  readProjectFile('lib/validation.js'),
  readProjectFile('tests/rate-limit.test.ts'),
  readProjectFile('tests/validation.test.ts'),
  readProjectFile('tests/admin-auth-helper.test.ts'),
  readProjectFile('package.json'),
  readProjectFile('.github/workflows/ci.yml'),
  readProjectFile('README.md'),
  readProjectFile('PRODUCTION-RUNBOOK.md'),
]);

requireIncludes(rateLimit, 'lib/rate-limit.js', [
  'export function rateLimitResponse',
  'normalizeClientIp',
  'isValidIpv4',
  'isValidIpv6',
  'cf-connecting-ip',
  'MAX_IDENTIFIER_LENGTH',
  "'Cache-Control': 'no-store'",
  "'Retry-After'",
  "'X-RateLimit-Reset'",
  'Math.max(retryAfter, 1)',
]);

requireIncludes(adminAuth, 'lib/admin-auth.js', [
  "import { timingSafeEqual } from 'node:crypto';",
  'timingSafeSecretEqual',
  'bearerTokenFromRequest',
  'Buffer.alloc',
  'timingSafeEqual(paddedCandidate, paddedExpected)',
  "const headers = { 'Cache-Control': 'no-store' };",
  "status: 403, headers",
  "status: 401, headers",
]);

requireIncludes(validation, 'lib/validation.js', [
  "const headers = { 'Cache-Control': 'no-store' };",
  'err instanceof ValidationError',
  'Internal server error',
]);

requireIncludes(rateLimitTest, 'tests/rate-limit.test.ts', [
  'marks throttled responses as no-store with retry metadata',
  'falls back when forwarded IP headers are invalid or unknown',
  'normalizes IPv4 ports and bracketed IPv6 addresses',
  'prefers Cloudflare connecting IP when present',
  'X-RateLimit-Reset',
]);

requireIncludes(validationTest, 'tests/validation.test.ts', [
  'marks validation and internal error responses as no-store',
]);

requireIncludes(adminAuthHelperTest, 'tests/admin-auth-helper.test.ts', [
  'marks missing admin secret responses as no-store',
  'marks invalid admin tokens as no-store',
  'accepts valid admin bearer tokens through timing-safe comparison',
  'rejects malformed and different-length bearer tokens without authenticating',
  'accepts cron fallback bearer tokens through the same verifier',
]);

let packageJson = null;
try {
  packageJson = JSON.parse(packageRaw);
} catch {
  fail('package.json is not valid JSON');
}

if (!packageJson?.scripts?.['audit:security-responses']) {
  fail('package.json is missing script: audit:security-responses');
}

requireIncludes(ci, '.github/workflows/ci.yml', ['npm run audit:security-responses']);
requireIncludes(readme, 'README.md', ['npm run audit:security-responses']);
requireIncludes(runbook, 'PRODUCTION-RUNBOOK.md', ['npm run audit:security-responses']);

if (failures.length > 0) {
  console.error('Security response audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Security response audit passed');
