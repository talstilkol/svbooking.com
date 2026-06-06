import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-master-plan.mjs');

async function createFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-master-plan-'));
  for (const [relativePath, source] of Object.entries(files)) {
    const filePath = path.join(directory, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, source, 'utf8');
  }
  return directory;
}

function runAudit(cwd: string) {
  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

const validMasterPlan = [
  '# Plan',
  '| Acceptance Criteria | `npm test` passes | DONE | 185 files / 1125 tests passed. |',
  '- [x] Add local evidence gate',
  '- [ ] Configure real deployment env',
  '',
  '## Checked Backlog Re-Audit',
  '| Item | Status | Verdict |',
  '| --- | --- | --- |',
  '| Add local evidence gate | DONE | Verified by audit. |',
  '| FAKED | None identified | Checked items have evidence or stay open. |',
  '',
  '## Unfinished Launch Task Queue',
  '| Item | Status | Next action |',
  '| --- | --- | --- |',
  '| Configure real deployment env | NOT DONE | Configure real secrets outside git. |',
  '',
].join('\n');

const validFiles = {
  'MASTER-PLAN.md': validMasterPlan,
  'package.json': JSON.stringify({
    scripts: {
      'audit:master-plan': 'node scripts/audit-master-plan.mjs',
    },
  }),
  '.github/workflows/ci.yml': 'steps:\n  - run: npm run audit:master-plan\n',
  'README.md': 'Run npm run audit:master-plan before release.\n',
  'AUDIT-REPORT.md': '185 test files, 1125 tests passed. Master-plan honesty audit passed.\n',
};

describe('master-plan audit script', () => {
  it('passes when checked and open task ledgers are synchronized', async () => {
    const cwd = await createFixture(validFiles);

    const result = runAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Master-plan audit passed');
  });

  it('fails when checked items are not listed in the re-audit ledger', async () => {
    const cwd = await createFixture({
      ...validFiles,
      'MASTER-PLAN.md': validMasterPlan.replace('| Add local evidence gate | DONE | Verified by audit. |\n', ''),
    });

    const result = runAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Checked backlog item is missing from re-audit table: Add local evidence gate');
  });
});
