import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-html-safety.mjs');

async function createFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-html-safety-'));
  for (const root of ['app', 'components', 'lib']) {
    await mkdir(path.join(directory, root), { recursive: true });
  }
  for (const [relativePath, source] of Object.entries(files)) {
    const filePath = path.join(directory, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, source);
  }
  return directory;
}

function runHtmlSafetyAudit(cwd: string) {
  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
    },
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

describe('html safety audit script', () => {
  it('passes sanitized JSON-LD and safe external links', async () => {
    const cwd = await createFixture({
      'components/SafeJsonLd.tsx': [
        "import { serializeJsonLd } from '@/lib/utils/jsonLd';",
        'export function SafeJsonLd() {',
        '  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd({ name: "SV" }) }} />;',
        '}',
        'export function Link() {',
        '  return <a href="https://example.com" target="_blank" rel="noopener noreferrer">Example</a>;',
        '}',
        '',
      ].join('\n'),
    });

    const result = runHtmlSafetyAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('HTML safety audit passed');
  });

  it('rejects raw dangerous HTML sinks', async () => {
    const cwd = await createFixture({
      'components/UnsafeHtml.tsx': [
        'export function UnsafeHtml() {',
        '  return <div dangerouslySetInnerHTML={{ __html: "<b>unsafe</b>" }} />;',
        '}',
        '',
      ].join('\n'),
    });

    const result = runHtmlSafetyAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('unsafe dangerouslySetInnerHTML');
  });

  it('rejects external blank targets without opener protection', async () => {
    const cwd = await createFixture({
      'components/UnsafeLink.tsx': 'export function UnsafeLink() { return <a href="https://example.com" target="_blank">Example</a>; }\n',
    });

    const result = runHtmlSafetyAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('target="_blank" without noopener noreferrer');
  });
});
