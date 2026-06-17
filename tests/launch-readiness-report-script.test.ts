import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/launch-readiness-report.mjs');
const AUDIT_SCRIPT = path.join(process.cwd(), 'scripts/audit-launch-readiness-report.mjs');

function runReport(args: string[] = [], env: Record<string, string | undefined> = {}) {
  return spawnSync(process.execPath, ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', SCRIPT, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      ...env,
    } as unknown as NodeJS.ProcessEnv,
  });
}

describe('launch readiness report script', () => {
  it('prints a short launch blocker report without secret values', () => {
    const result = runReport([], {
      ADMIN_API_SECRET: 'svbooking-admin-secret-0001',
      CRON_SECRET: '',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('SV Booking launch readiness report');
    expect(result.stdout).toContain('productionReady: false');
    expect(result.stdout).toContain('missingRequiredEnv: CRON_SECRET');
    expect(result.stdout).toContain('catalogMedia: status=partial');
    expect(result.stdout).toContain('npm run catalog:media:ledger:summary');
    expect(result.stdout).not.toContain('svbooking-admin-secret-0001');
  });

  it('prints JSON for automated launch review', () => {
    const result = runReport(['--format=json', '--limit=3']);

    expect(result.status).toBe(0);
    const body = JSON.parse(result.stdout);
    expect(body.productionReady).toBe(false);
    expect(body.catalogMedia.totalActions).toBe(112);
    expect(body.catalogMedia.reusedImageSources).toBe(6);
    expect(body.catalogMedia.priorityReusedSources).toHaveLength(6);
    expect(body.topBlockers.length).toBeLessThanOrEqual(3);
    expect(body.nextCommands).toContain('npm run audit:production');
  });

  it('rejects unsupported report formats', () => {
    const result = runReport(['--format=xml']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Unsupported format: xml');
  });

  it('audits the launch readiness report contract', () => {
    const result = spawnSync(process.execPath, [AUDIT_SCRIPT], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Launch readiness report audit passed');
    expect(result.stdout).not.toContain('svbooking-audit-secret-must-not-print-0001');
  });
});
