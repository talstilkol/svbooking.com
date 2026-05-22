import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/release-state.mjs');

async function createRepo() {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-release-state-'));
  spawnSync('git', ['init'], { cwd: directory, stdio: 'pipe' });
  await mkdir(path.join(directory, 'app'), { recursive: true });
  return directory;
}

function runReleaseState(cwd: string, args: string[] = []) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
    } as unknown as NodeJS.ProcessEnv,
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

describe('release-state script', () => {
  it('passes strict mode for a clean repository', async () => {
    const cwd = await createRepo();

    const result = runReleaseState(cwd, ['--strict']);
    const summary = JSON.parse(result.stdout);

    expect(result.status).toBe(0);
    expect(summary.clean).toBe(true);
    expect(summary.totalChangedPaths).toBe(0);
    expect(summary.trackedChanged).toBe(0);
    expect(summary.staged).toBe(0);
    expect(summary.unstaged).toBe(0);
  });

  it('reports and blocks dirty release state in strict mode', async () => {
    const cwd = await createRepo();
    await writeFile(path.join(cwd, 'app/page.tsx'), 'export default function Page() { return null; }\n');

    const report = runReleaseState(cwd);
    const strict = runReleaseState(cwd, ['--strict']);
    const summary = JSON.parse(report.stdout);

    expect(report.status).toBe(0);
    expect(strict.status).toBe(1);
    expect(summary.clean).toBe(false);
    expect(summary.untracked).toBe(1);
    expect(summary.trackedChanged).toBe(0);
    expect(summary.staged).toBe(0);
    expect(summary.unstaged).toBe(0);
    expect(summary.deletedPaths).toEqual([]);
    expect(summary.generatedArtifactPaths).toEqual([]);
    expect(summary.categories.app).toBe(1);
    expect(summary.blockers).toContain('Worktree has uncommitted or untracked paths');
  });

  it('separates staged and unstaged tracked changes', async () => {
    const cwd = await createRepo();
    await writeFile(path.join(cwd, 'app/page.tsx'), 'export default function Page() { return null; }\n');
    spawnSync('git', ['add', 'app/page.tsx'], { cwd, stdio: 'pipe' });
    await writeFile(path.join(cwd, 'app/page.tsx'), 'export default function Page() { return "changed"; }\n');

    const result = runReleaseState(cwd);
    const summary = JSON.parse(result.stdout);

    expect(result.status).toBe(0);
    expect(summary.clean).toBe(false);
    expect(summary.trackedChanged).toBe(1);
    expect(summary.staged).toBe(1);
    expect(summary.unstaged).toBe(1);
    expect(summary.untracked).toBe(0);
    expect(summary.statuses.AM).toBe(1);
  });
});
