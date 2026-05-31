import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import {
  KINDE_REQUIRED_ENV,
  OPTIONAL_ENV,
  PARTNER_PROVIDER_GROUPS,
  REQUIRED_ENV,
  STRICT_LAUNCH_ENV,
} from '@/lib/production-readiness.mjs';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-secret-hygiene.mjs');
const partnerProviderEnv = [...new Set(PARTNER_PROVIDER_GROUPS.flatMap((provider) => provider.env))];
const allEnv = [...new Set([...REQUIRED_ENV, ...KINDE_REQUIRED_ENV, ...partnerProviderEnv, ...STRICT_LAUNCH_ENV, ...OPTIONAL_ENV])];

async function createFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-secret-hygiene-'));
  for (const root of ['.github/workflows']) {
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
    env: { ...process.env, PATH: process.env.PATH, HOME: process.env.HOME },
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function validFiles(overrides: Partial<Record<string, string>> = {}) {
  return {
    '.env.example': allEnv.map((name) => `${name}=`).join('\n') + '\n',
    '.gitignore': '.env*\n!.env.example\n',
    'README.md': 'Do not commit secret values.\n',
    'PRODUCTION-RUNBOOK.md': 'Set these in the deployment environment, not in git.\n',
    '.github/workflows/ci.yml': 'steps:\n  - run: npm run audit:secrets\n',
    'package.json': JSON.stringify({ scripts: { 'audit:secrets': 'node scripts/audit-secret-hygiene.mjs' } }),
    ...overrides,
  };
}

describe('secret hygiene audit script', () => {
  it('passes when env templates are blank and secret paths stay out of git', async () => {
    const cwd = await createFixture(validFiles());

    const result = runAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Secret hygiene audit passed');
  });

  it('fails when env values, CI secrets, or package env assignments appear', async () => {
    const cwd = await createFixture(validFiles({
      '.env.example': allEnv.map((name) => `${name}=${name === 'ADMIN_API_SECRET' ? 'filled-value' : ''}`).join('\n') + '\n',
      '.gitignore': 'node_modules\n',
      '.github/workflows/ci.yml': 'steps:\n  - run: echo ${{ secrets.ADMIN_API_SECRET }}\n',
      'package.json': JSON.stringify({
        scripts: {
          'audit:secrets': 'node scripts/audit-secret-hygiene.mjs',
          start: 'ADMIN_API_SECRET=filled-value next start',
        },
      }),
    }));

    const result = runAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('.env.example line 1 must keep ADMIN_API_SECRET= empty');
    expect(result.stderr).toContain('.gitignore must ignore .env* files');
    expect(result.stderr).toContain('.github/workflows/ci.yml must not reference GitHub secrets');
    expect(result.stderr).toContain('package.json script start must not assign production env ADMIN_API_SECRET');
  });
});
