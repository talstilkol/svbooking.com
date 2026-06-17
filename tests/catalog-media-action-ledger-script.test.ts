import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/catalog-media-action-ledger.mjs');
const AUDIT_SCRIPT = path.join(process.cwd(), 'scripts/audit-catalog-media-ledger.mjs');

describe('catalog media action ledger script', () => {
  it('prints the launch media review queue without approving image licenses', () => {
    const result = spawnSync(process.execPath, ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', SCRIPT], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe',
    });

    expect(result.status).toBe(0);
    const body = JSON.parse(result.stdout);
    expect(body.summary.totalItems).toBeGreaterThan(0);
    expect(body.summary.unapprovedImageSources).toBeGreaterThan(0);
    expect(body.items[0].reasons.length).toBeGreaterThan(0);
    expect(JSON.stringify(body)).toContain('license-approval-required');
    expect(JSON.stringify(body)).not.toContain('"approvedLicense":true');
  });

  it('prints a short priority summary for reused catalog media', () => {
    const result = spawnSync(
      process.execPath,
      ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', SCRIPT, '--format=summary', '--priority-only'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe',
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Catalog media action ledger');
    expect(result.stdout).toContain('priorityReusedSources: 6');
    expect(result.stdout).toContain('shownItems: 6');
    expect(result.stdout).toContain('reasons=license-approval-required+reused-across-cities');
    expect(result.stdout).not.toContain('"approvedLicense":true');
  });

  it('prints CSV for operational media review without adding approvals', () => {
    const result = spawnSync(
      process.execPath,
      ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', SCRIPT, '--format=csv', '--priority-only', '--limit=2'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe',
      },
    );

    expect(result.status).toBe(0);
    const lines = result.stdout.trim().split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('"sourceUrl","sourceHost","licenseStatus"');
    expect(lines[1]).toContain('license-approval-required; reused-across-cities');
    expect(result.stdout).not.toContain('"approvedLicense":true');
  });

  it('filters the media review queue by city and reason', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
        SCRIPT,
        '--format=csv',
        '--city=Berlin',
        '--reason=reused-across-cities',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe',
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Berlin; Tallinn; Vilnius');
    expect(result.stdout).toContain('reused-across-cities');
    expect(result.stdout).not.toContain('Barcelona; Ibiza; Palma de Mallorca');
    expect(result.stdout).not.toContain('"approvedLicense":true');
  });

  it('audits that the media review queue matches catalog media readiness', () => {
    const result = spawnSync(process.execPath, ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', AUDIT_SCRIPT], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Catalog media ledger audit passed');
    expect(result.stdout).toContain('112 media actions');
  });
});
