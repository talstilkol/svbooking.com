import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-duplicates.mjs');

async function createFixture(extraFiles: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-duplicates-'));
  await mkdir(path.join(directory, 'app'), { recursive: true });
  await mkdir(path.join(directory, 'components'), { recursive: true });
  await mkdir(path.join(directory, 'lib/utils'), { recursive: true });
  await writeFile(path.join(directory, 'lib/utils/date.js'), 'export function addDays(dateStr, days) { return dateStr; }\n');
  await writeFile(path.join(directory, 'lib/utils/geo-distance.js'), [
    'function toRadians(degrees) { return degrees; }',
    'export function haversineMeters() { return 0; }',
    'export function haversineKm() { return 0; }',
    '',
  ].join('\n'));

  for (const [relativePath, source] of Object.entries(extraFiles)) {
    const filePath = path.join(directory, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, source);
  }

  return directory;
}

function runDuplicateAudit(cwd: string) {
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

describe('duplicate helper audit script', () => {
  it('passes when date and distance helpers live only in shared utilities', async () => {
    const cwd = await createFixture({
      'app/page.tsx': 'import { addDays } from "../lib/utils/date"; export default function Page() { return addDays("2026-05-14", 1); }\n',
    });

    const result = runDuplicateAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Duplicate helper audit passed');
  });

  it('fails when a production file reintroduces a local duplicate helper', async () => {
    const cwd = await createFixture({
      'app/route.js': 'const addDays = (dateStr, days) => dateStr;\nexport function GET() { return addDays("2026-05-14", 1); }\n',
    });

    const result = runDuplicateAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('duplicate addDays');
  });
});
