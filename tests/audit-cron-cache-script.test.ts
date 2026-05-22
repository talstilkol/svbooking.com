import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-cron-cache.mjs');

async function createFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-cron-cache-'));
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
    env: { ...process.env, PATH: process.env.PATH, HOME: process.env.HOME },
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

const validFiles = {
  'app/api/agents/auto/price-cache/route.js': [
    "const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };",
    'export function GET(request) {',
    '  const auth = verifyCronAuth(request);',
    '  if (!auth.authorized) return auth.response;',
    "  return Response.json({ status: 'completed' }, { headers: NO_STORE_HEADERS });",
    '}',
    '',
  ].join('\n'),
  'app/api/agents/auto/health-monitor/route.js': [
    'export function GET(request) {',
    '  const auth = verifyCronAuth(request);',
    '  if (!auth.authorized) return auth.response;',
    "  return Response.json({ status: 'completed' }, { headers: { 'Cache-Control': 'no-store' } });",
    '}',
    '',
  ].join('\n'),
  'app/api/agents/auto/orchestrate/route.js': [
    'export function GET(request) {',
    '  const auth = verifyCronAuth(request);',
    '  if (!auth.authorized) return auth.response;',
    "  return Response.json({ status: 'completed' }, { headers: { 'Cache-Control': 'no-store' } });",
    '}',
    '',
  ].join('\n'),
  'lib/agent-utils.js': [
    "import { timingSafeEqual } from 'node:crypto';",
    'function timingSafeSecretEqual() {',
    '  const paddedCandidate = Buffer.alloc(1);',
    '  const paddedExpected = Buffer.alloc(1);',
    '  return timingSafeEqual(paddedCandidate, paddedExpected);',
    '}',
    'function bearerTokenFromRequest() {}',
    'export function verifyCronAuth() {}',
    '',
  ].join('\n'),
  'tests/cron-auth.test.ts': [
    "it('accepts valid cron bearer tokens through timing-safe comparison', () => {});",
    "it('rejects malformed and different-length cron bearer tokens without authenticating', () => {});",
    "it('CRON_SECRET not configured', () => {});",
    '',
  ].join('\n'),
  'package.json': JSON.stringify({
    scripts: {
      'audit:cron-cache': 'node scripts/audit-cron-cache.mjs',
    },
  }),
  '.github/workflows/ci.yml': 'steps:\n  - run: npm run audit:cron-cache\n',
  'README.md': 'Run npm run audit:cron-cache before release.\n',
  'PRODUCTION-RUNBOOK.md': 'Run npm run audit:cron-cache before go-live.\n',
};

describe('cron cache audit script', () => {
  it('passes when cron-protected route responses are no-store', async () => {
    const cwd = await createFixture(validFiles);

    const result = runAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Cron cache audit passed');
  });

  it('fails when a cron route returns cacheable JSON or CI wiring is missing', async () => {
    const cwd = await createFixture({
      ...validFiles,
      'app/api/agents/auto/bad/route.js': [
        'export function GET(request) {',
        '  const auth = verifyCronAuth(request);',
        '  if (!auth.authorized) return auth.response;',
        "  return Response.json({ status: 'completed' });",
        '}',
        '',
      ].join('\n'),
      '.github/workflows/ci.yml': 'steps:\n  - run: npm test\n',
    });

    const result = runAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('app/api/agents/auto/bad/route.js:4 cron Response.json must include Cache-Control: no-store');
    expect(result.stderr).toContain('.github/workflows/ci.yml is missing: npm run audit:cron-cache');
  });

  it('fails when cron auth stops using timing-safe comparison', async () => {
    const cwd = await createFixture({
      ...validFiles,
      'lib/agent-utils.js': validFiles['lib/agent-utils.js'].replace("import { timingSafeEqual } from 'node:crypto';\n", ''),
    });

    const result = runAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("lib/agent-utils.js is missing: import { timingSafeEqual } from 'node:crypto';");
  });
});
