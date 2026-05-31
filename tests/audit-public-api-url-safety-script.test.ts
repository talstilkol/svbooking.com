import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-public-api-url-safety.mjs');

async function createFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-public-api-url-safety-'));
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

const validRuntimeTest = [
  'const PUBLIC_API_URL_CASES = [',
  "  { path: '/api/compare' },",
  "  { path: '/api/search?city=Paris' },",
  "  { path: '/api/destination-intel' },",
  "  { path: '/api/city-info' },",
  "  { path: '/api/weather' },",
  "  { path: '/api/holidays' },",
  "  { path: '/api/exchange-rates?from=USD&to=USD&amount=100' },",
  "  { path: '/api/events?city=Paris' },",
  "  { path: '/api/reviews/g297930-d305178' },",
  "  { path: '/api/property-content/g297930-d305178' },",
  "  { path: '/api/price-history?hotelKey=g297930-d305178&period=30' },",
  "  { path: '/api/health' },",
  '];',
  'function unsafeAbsoluteUrls() {',
  "  return ['script/data URL', 'non-HTTPS URL', 'URL credentials', 'private or local hostname'];",
  '}',
  "test.describe('public API URL safety runtime audit', () => {});",
  '',
].join('\n');

const validFiles = {
  'package.json': JSON.stringify({
    scripts: {
      'audit:public-api-urls': 'node scripts/audit-public-api-url-safety.mjs',
    },
  }),
  '.github/workflows/ci.yml': 'steps:\n  - run: npm run audit:public-api-urls\n  - run: npm run test:e2e\n',
  'tests/e2e/public-api-url-safety.spec.ts': validRuntimeTest,
  'README.md': 'Run npm run audit:public-api-urls before release. public API URL safety is enforced by E2E.\n',
  'PRODUCTION-RUNBOOK.md': 'Run npm run audit:public-api-urls before go-live. public API URL safety is enforced by E2E.\n',
};

describe('public API URL safety audit script', () => {
  it('passes when the runtime guard is wired into release checks', async () => {
    const cwd = await createFixture(validFiles);

    const result = runAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Public API URL safety audit passed');
  });

  it('fails when CI wiring or unsafe URL checks are removed', async () => {
    const cwd = await createFixture({
      ...validFiles,
      '.github/workflows/ci.yml': 'steps:\n  - run: npm run test:e2e\n',
      'tests/e2e/public-api-url-safety.spec.ts': validRuntimeTest.replace('private or local hostname', ''),
    });

    const result = runAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('.github/workflows/ci.yml is missing public API URL safety guard: npm run audit:public-api-urls');
    expect(result.stderr).toContain('tests/e2e/public-api-url-safety.spec.ts is missing public API URL safety guard: private or local hostname');
  });
});
