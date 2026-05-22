import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-release-deletions.mjs');

async function createFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-release-deletions-'));
  for (const root of ['app', 'components', 'lib/providers']) {
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

describe('release deletion audit script', () => {
  it('passes when removed no-fake-data surfaces stay absent', async () => {
    const cwd = await createFixture({
      'app/page.tsx': 'export default function Page() { return null; }\n',
      'components/ProviderDataNotice.tsx': 'export default function ProviderDataNotice() { return null; }\n',
      'lib/providers/index.js': 'export const providers = [];\n',
    });

    const result = runAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Release deletion audit passed');
  });

  it('fails when a removed legacy file or reference returns', async () => {
    const cwd = await createFixture({
      'components/PriceGuarantee.tsx': 'export default function PriceGuarantee() { return null; }\n',
      'app/page.tsx': "import ProviderTrustScore from '../components/ProviderTrustScore';\n",
    });

    const result = runAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('components/PriceGuarantee.tsx must stay removed');
    expect(result.stderr).toContain('references removed legacy surface: ProviderTrustScore');
  });
});
