import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-runtime-warnings.mjs');

async function createFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-runtime-warnings-'));
  for (const root of ['app/api/og', '.github/workflows']) {
    await mkdir(path.join(directory, root), { recursive: true });
  }
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

const validPackage = JSON.stringify({
  scripts: {
    'audit:runtime': 'node scripts/audit-runtime-warnings.mjs',
    'test:e2e': 'env -u NO_COLOR playwright test',
    'test:e2e:ui': 'env -u NO_COLOR playwright test --ui',
  },
});

const validPlaywrightConfig = [
  'const webServerEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => (',
  "  key !== 'NO_COLOR' &&",
  "  key !== 'FORCE_COLOR' &&",
  "  key !== 'NODE_OPTIONS'",
  ')));',
  'export default { webServer: { env: webServerEnv } };',
  '',
].join('\n');

const validCi = [
  'steps:',
  '  - run: npm run audit:runtime',
  '  - run: npm run test:e2e',
  '',
].join('\n');

const validFiles = {
  'app/api/og/route.tsx': 'export async function GET() { return new Response("ok"); }\n',
  'package.json': validPackage,
  'playwright.config.ts': validPlaywrightConfig,
  '.github/workflows/ci.yml': validCi,
};

describe('runtime warning audit script', () => {
  it('passes when runtime and Playwright warning guards are present', async () => {
    const cwd = await createFixture(validFiles);

    const result = runAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Runtime warning audit passed');
  });

  it('fails when Edge Runtime or Playwright env guards return', async () => {
    const cwd = await createFixture({
      ...validFiles,
      'app/api/og/route.tsx': "export const runtime = 'edge';\nexport async function GET() { return new Response('ok'); }\n",
      'package.json': JSON.stringify({
        scripts: {
          'audit:runtime': 'node scripts/audit-runtime-warnings.mjs',
          'test:e2e': 'playwright test',
          'test:e2e:ui': 'playwright test --ui',
        },
      }),
      'playwright.config.ts': [
        'const webServerEnv = process.env;',
        'export default { webServer: { env: webServerEnv } };',
        '',
      ].join('\n'),
    });

    const result = runAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('app/api/og/route.tsx declares Edge Runtime');
    expect(result.stderr).toContain('package.json test:e2e must run through env -u NO_COLOR playwright test');
    expect(result.stderr).toContain("playwright.config.ts is missing runtime-warning guard: key !== 'NO_COLOR'");
  });
});
