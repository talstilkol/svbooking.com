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

const SCRIPT = path.join(process.cwd(), 'scripts/audit-env-contract.mjs');
const partnerProviderEnv = [...new Set(PARTNER_PROVIDER_GROUPS.flatMap((provider) => provider.env))];
const requiredForGoLive = [...new Set([...REQUIRED_ENV, ...KINDE_REQUIRED_ENV, ...partnerProviderEnv, ...STRICT_LAUNCH_ENV])];
const allEnv = [...new Set([...requiredForGoLive, ...OPTIONAL_ENV])];

async function createFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-env-contract-'));
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
  const envExample = allEnv.map((name) => `${name}=`).join('\n') + '\n';
  const requiredMentions = requiredForGoLive.join('\n');
  return {
    '.env.example': envExample,
    'README.md': `# README\n${requiredMentions}\nnpm run audit:env\n`,
    'PRODUCTION-RUNBOOK.md': `# Runbook\n${requiredMentions}\nnpm run audit:env\n`,
    'package.json': JSON.stringify({ scripts: { 'audit:env': 'node scripts/audit-env-contract.mjs' } }),
    '.github/workflows/ci.yml': 'steps:\n  - run: npm run audit:env\n',
    ...overrides,
  };
}

describe('environment contract audit script', () => {
  it('passes when env template, docs, package, and CI match readiness contract', async () => {
    const cwd = await createFixture(validFiles());

    const result = runAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`Environment contract audit passed: ${allEnv.length} env names checked`);
  });

  it('fails when a required env disappears from template or docs', async () => {
    const cwd = await createFixture(validFiles({
      '.env.example': allEnv.filter((name) => name !== 'KINDE_CLIENT_SECRET').map((name) => `${name}=`).join('\n') + '\n',
      'README.md': `# README\n${requiredForGoLive.filter((name) => name !== 'SERPAPI_KEY').join('\n')}\nnpm run audit:env\n`,
    }));

    const result = runAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('.env.example is missing env template line: KINDE_CLIENT_SECRET=');
    expect(result.stderr).toContain('README.md is missing env mention: SERPAPI_KEY');
  });
});
