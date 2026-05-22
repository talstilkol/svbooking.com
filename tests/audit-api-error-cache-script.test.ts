import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-api-error-cache.mjs');

async function createFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-api-error-cache-'));
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

const validFiles = {
  'app/api/compare/route.js': [
    "const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };",
    "export function GET() { return Response.json({ error: 'Hotel not found' }, { status: 404, headers: NO_STORE_HEADERS }); }",
    '',
  ].join('\n'),
  'app/api/click/route.js': [
    "const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };",
    "export function POST() { return Response.json({ error: 'Provider URL is not allowed' }, { status: 400, headers: NO_STORE_HEADERS }); }",
    '',
  ].join('\n'),
  'app/api/price-history/route.js': [
    "const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };",
    "export function GET() { return Response.json({ error: 'hotelKey is required' }, { status: 400, headers: NO_STORE_HEADERS }); }",
    '',
  ].join('\n'),
  'package.json': JSON.stringify({
    scripts: {
      'audit:api-errors': 'node scripts/audit-api-error-cache.mjs',
    },
  }),
  '.github/workflows/ci.yml': 'steps:\n  - run: npm run audit:api-errors\n',
  'README.md': 'Run npm run audit:api-errors before release.\n',
  'PRODUCTION-RUNBOOK.md': 'Run npm run audit:api-errors before go-live.\n',
};

describe('API error cache audit script', () => {
  it('passes when API error responses are no-store', async () => {
    const cwd = await createFixture(validFiles);

    const result = runAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('API error cache audit passed');
  });

  it('fails when an API error response can be cached or CI wiring is missing', async () => {
    const cwd = await createFixture({
      ...validFiles,
      'app/api/bad/route.js': "export function GET() { return Response.json({ error: 'Internal server error' }, { status: 500 }); }\n",
      '.github/workflows/ci.yml': 'steps:\n  - run: npm test\n',
    });

    const result = runAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('app/api/bad/route.js:1 error Response.json must include Cache-Control: no-store');
    expect(result.stderr).toContain('.github/workflows/ci.yml is missing: npm run audit:api-errors');
  });
});
