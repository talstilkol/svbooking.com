import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-coverage.mjs');

async function writeSummary(total: Record<string, { pct: number }>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-coverage-'));
  const summaryPath = path.join(directory, 'coverage-summary.json');
  await mkdir(path.dirname(summaryPath), { recursive: true });
  await writeFile(summaryPath, JSON.stringify({ total }), 'utf8');
  return summaryPath;
}

function runCoverageAudit(summaryPath: string) {
  const result = spawnSync(process.execPath, [SCRIPT, summaryPath], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

describe('coverage audit script', () => {
  it('passes when current coverage clears the ratchet floors', async () => {
    const summaryPath = await writeSummary({
      lines: { pct: 90.67 },
      statements: { pct: 86.33 },
      functions: { pct: 90.04 },
      branches: { pct: 76.07 },
    });

    const result = runCoverageAudit(summaryPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Coverage audit passed');
  });

  it('fails when coverage regresses below a floor', async () => {
    const summaryPath = await writeSummary({
      lines: { pct: 89.99 },
      statements: { pct: 86.33 },
      functions: { pct: 90.04 },
      branches: { pct: 76.07 },
    });

    const result = runCoverageAudit(summaryPath);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('lines coverage 89.99% is below the ratchet floor 90%');
  });
});
