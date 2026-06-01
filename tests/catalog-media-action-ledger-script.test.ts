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
