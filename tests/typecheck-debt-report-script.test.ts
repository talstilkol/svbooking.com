import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/typecheck-debt-report.mjs');

function runReport(args: string[] = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

describe('typecheck debt report script', () => {
  it('summarizes the current typecheck state without failing the report command', () => {
    const result = runReport(['--format=json', '--limit=5']);

    expect(result.status).toBe(0);
    const body = JSON.parse(result.stdout);
    expect(body.typecheckPassed).toBe(true);
    expect(body.totalErrors).toBe(0);
    expect(body.filesWithErrors).toBe(0);
    expect(body.topFiles.length).toBeLessThanOrEqual(5);
    expect(body.topCodes.length).toBeLessThanOrEqual(5);
    expect(body.nextActions).toContain('Keep npm run typecheck green as a CI and release gate.');
  });

  it('rejects unsupported report formats', () => {
    const result = runReport(['--format=xml']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Unsupported format: xml');
  });
});
