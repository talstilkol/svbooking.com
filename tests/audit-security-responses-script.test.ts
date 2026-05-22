import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-security-responses.mjs');

async function createFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-security-responses-'));
  for (const [relativePath, source] of Object.entries(files)) {
    const filePath = path.join(directory, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, source);
  }
  return directory;
}

function runAudit(cwd: string) {
  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
    },
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

const packageJson = JSON.stringify({
  scripts: {
    'audit:security-responses': 'node scripts/audit-security-responses.mjs',
  },
});

const validFiles = {
  'lib/rate-limit.js': [
    'const MAX_IDENTIFIER_LENGTH = 128;',
    'function normalizeClientIp() {}',
    'function isValidIpv4() {}',
    'function isValidIpv6() {}',
    "request.headers.get('cf-connecting-ip')",
    'export function rateLimitResponse(resetAt) {',
    '  const retryAfter = 1;',
    "  return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': String(Math.max(retryAfter, 1)), 'X-RateLimit-Reset': String(resetAt) } });",
    '}',
    '',
  ].join('\n'),
  'lib/admin-auth.js': [
    "import { timingSafeEqual } from 'node:crypto';",
    'function timingSafeSecretEqual() {',
    '  const paddedCandidate = Buffer.alloc(1);',
    '  const paddedExpected = Buffer.alloc(1);',
    '  return timingSafeEqual(paddedCandidate, paddedExpected);',
    '}',
    'function bearerTokenFromRequest() {}',
    'export function verifyAdminAuth() {',
    "  const headers = { 'Cache-Control': 'no-store' };",
    "  return Response.json({ error: 'Unauthorized' }, { status: 401, headers });",
    "  return Response.json({ error: 'Admin API secret is not configured' }, { status: 403, headers });",
    '}',
    '',
  ].join('\n'),
  'lib/validation.js': [
    'export class ValidationError extends Error {}',
    'export function errorResponse(err) {',
    "  const headers = { 'Cache-Control': 'no-store' };",
    "  if (err instanceof ValidationError) return Response.json({ error: err.message }, { status: 400, headers });",
    "  return Response.json({ error: 'Internal server error' }, { status: 500, headers });",
    '}',
    '',
  ].join('\n'),
  'tests/rate-limit.test.ts': [
    "it('marks throttled responses as no-store with retry metadata', () => { expect('X-RateLimit-Reset').toBeTruthy(); });",
    "it('falls back when forwarded IP headers are invalid or unknown', () => {});",
    "it('normalizes IPv4 ports and bracketed IPv6 addresses', () => {});",
    "it('prefers Cloudflare connecting IP when present', () => {});",
    '',
  ].join('\n'),
  'tests/validation.test.ts': "it('marks validation and internal error responses as no-store', () => {});\n",
  'tests/admin-auth-helper.test.ts': [
    "it('marks missing admin secret responses as no-store', () => {});",
    "it('marks invalid admin tokens as no-store', () => {});",
    "it('accepts valid admin bearer tokens through timing-safe comparison', () => {});",
    "it('rejects malformed and different-length bearer tokens without authenticating', () => {});",
    "it('accepts cron fallback bearer tokens through the same verifier', () => {});",
    '',
  ].join('\n'),
  'package.json': packageJson,
  '.github/workflows/ci.yml': 'steps:\n  - run: npm run audit:security-responses\n',
  'README.md': 'Run npm run audit:security-responses before release.\n',
  'PRODUCTION-RUNBOOK.md': 'Run npm run audit:security-responses before release.\n',
};

describe('security response audit script', () => {
  it('passes when shared security responses are no-store and tested', async () => {
    const cwd = await createFixture(validFiles);

    const result = runAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Security response audit passed');
  });

  it('fails when rate-limit responses lose no-store cache control', async () => {
    const cwd = await createFixture({
      ...validFiles,
      'lib/rate-limit.js': validFiles['lib/rate-limit.js'].replace("'Cache-Control': 'no-store', ", ''),
    });

    const result = runAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("lib/rate-limit.js is missing: 'Cache-Control': 'no-store'");
  });

  it('fails when client IP normalization is removed from rate limiting', async () => {
    const cwd = await createFixture({
      ...validFiles,
      'lib/rate-limit.js': validFiles['lib/rate-limit.js'].replace('function normalizeClientIp() {}\n', ''),
    });

    const result = runAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('lib/rate-limit.js is missing: normalizeClientIp');
  });

  it('fails when admin auth stops using timing-safe comparison', async () => {
    const cwd = await createFixture({
      ...validFiles,
      'lib/admin-auth.js': validFiles['lib/admin-auth.js'].replace("import { timingSafeEqual } from 'node:crypto';\n", ''),
    });

    const result = runAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("lib/admin-auth.js is missing: import { timingSafeEqual } from 'node:crypto';");
  });
});
