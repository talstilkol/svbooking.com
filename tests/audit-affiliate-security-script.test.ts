import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-affiliate-security.mjs');

async function createFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-affiliate-security-'));
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

const validAffiliate = [
  'export function getAffiliateUrl(provider, baseUrl) {',
  '  try {',
  '    const url = new URL(baseUrl);',
  "    if (url.protocol !== 'https:') return baseUrl;",
  "    url.searchParams.set('aid', '123');",
  '    return url.toString();',
  '  } catch {',
  '    return baseUrl;',
  '  }',
  '}',
  'export function isAllowedProviderUrl(provider, baseUrl) {',
  '  const url = new URL(baseUrl);',
  "  if (url.protocol !== 'https:') return false;",
  '  const hostname = url.hostname.toLowerCase();',
  '  return hostname === domain || hostname.endsWith(`.${domain}`);',
  '}',
  '',
].join('\n');

const validFiles = {
  'lib/affiliate.ts': validAffiliate,
  'app/api/click/route.js': [
    'isAllowedProviderUrl(provider, url);',
    "return Response.json({ error: 'Provider URL is not allowed' }, { headers: { 'Cache-Control': 'no-store' } });",
    '',
  ].join('\n'),
  'tests/affiliate.test.ts': [
    'it("leaves invalid URLs unchanged", () => {});',
    'it("leaves non-HTTPS URLs unchanged", () => {});',
    'it("allows HTTPS provider domains only", () => {});',
    '',
  ].join('\n'),
  'tests/api-click.test.ts': 'it("returns 400 for non-HTTPS provider redirect URLs", () => {});\n',
  'package.json': JSON.stringify({
    scripts: {
      'audit:affiliate-security': 'node scripts/audit-affiliate-security.mjs',
    },
  }),
  '.github/workflows/ci.yml': 'steps:\n  - run: npm run audit:affiliate-security\n',
  'README.md': 'Run npm run audit:affiliate-security before release.\n',
  'PRODUCTION-RUNBOOK.md': 'Run npm run audit:affiliate-security before go-live.\n',
};

describe('affiliate security audit script', () => {
  it('passes when affiliate redirects fail closed on unsafe URLs', async () => {
    const cwd = await createFixture(validFiles);

    const result = runAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Affiliate security audit passed');
  });

  it('fails when manual URL append or missing CI wiring returns', async () => {
    const cwd = await createFixture({
      ...validFiles,
      'lib/affiliate.ts': [
        validAffiliate,
        "const separator = baseUrl.includes('?') ? '&' : '?';",
        'return `${baseUrl}${separator}${config.paramName}=${encodeURIComponent(affiliateId)}`;',
        '',
      ].join('\n'),
      '.github/workflows/ci.yml': 'steps:\n  - run: npm test\n',
    });

    const result = runAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('lib/affiliate.ts must not contain: baseUrl.includes');
    expect(result.stderr).toContain('lib/affiliate.ts must not contain: encodeURIComponent(affiliateId)');
    expect(result.stderr).toContain('.github/workflows/ci.yml is missing: npm run audit:affiliate-security');
  });
});
