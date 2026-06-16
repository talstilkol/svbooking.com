import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-docs.mjs');

async function createFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-docs-'));
  for (const root of ['lib', '.github/workflows']) {
    await mkdir(path.join(directory, root), { recursive: true });
  }
  for (const [relativePath, source] of Object.entries(files)) {
    const filePath = path.join(directory, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, source);
  }
  return directory;
}

function runDocsAudit(cwd: string) {
  const result = spawnSync(process.execPath, ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', SCRIPT], {
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

const catalog = [
  "export const HOTELS = [{ hotelKey: 'g1-d2', name: 'Le Meurice', city: 'Paris', country: 'France' }];",
  "export function listCities() { return ['Paris']; }",
  "export function listCountries() { return ['France']; }",
  '',
].join('\n');

const packageJson = JSON.stringify({
  scripts: {
    'audit:docs': 'node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/audit-docs.mjs',
    'audit:master-plan': 'node scripts/audit-master-plan.mjs',
    'audit:env': 'node scripts/audit-env-contract.mjs',
    'audit:secrets': 'node scripts/audit-secret-hygiene.mjs',
    'audit:runtime': 'node scripts/audit-runtime-warnings.mjs',
    'audit:external-fetches': 'node scripts/audit-external-fetches.mjs',
    'audit:public-api-urls': 'node scripts/audit-public-api-url-safety.mjs',
    'audit:public-data-contracts': 'node scripts/audit-public-data-contracts.mjs',
    'audit:provenance': 'node scripts/audit-provenance.mjs',
    'audit:deployment-smoke': 'node scripts/audit-deployment-smoke.mjs',
    'audit:catalog-media-ledger': 'node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/audit-catalog-media-ledger.mjs',
    'smoke:deployment': 'node scripts/deployment-smoke.mjs',
    'audit:affiliate-security': 'node scripts/audit-affiliate-security.mjs',
    'audit:legal-readiness': 'node scripts/audit-legal-readiness.mjs',
    'audit:security-responses': 'node scripts/audit-security-responses.mjs',
    'audit:api-errors': 'node scripts/audit-api-error-cache.mjs',
    'audit:cron-cache': 'node scripts/audit-cron-cache.mjs',
    'audit:coverage': 'npm run test:coverage -- --coverage.reporter=json-summary && node scripts/audit-coverage.mjs',
    'audit:rum': 'node scripts/audit-rum.mjs',
    'catalog:media:ledger': 'node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/catalog-media-action-ledger.mjs',
    'test:coverage': 'vitest run --coverage',
    'release:state': 'node scripts/release-state.mjs',
    'release:state:strict': 'node scripts/release-state.mjs --strict',
    'audit:release-deletions': 'node scripts/audit-release-deletions.mjs',
  },
});

const ci = [
  'steps:',
  '  - run: npm run audit:docs',
  '  - run: npm run audit:master-plan',
  '  - run: npm run audit:env',
  '  - run: npm run audit:secrets',
  '  - run: npm run audit:runtime',
  '  - run: npm run audit:external-fetches',
  '  - run: npm run audit:public-api-urls',
  '  - run: npm run audit:public-data-contracts',
  '  - run: npm run audit:provenance',
  '  - run: npm run audit:deployment-smoke',
  '  - run: npm run audit:catalog-media-ledger',
  '  - run: npm run audit:affiliate-security',
  '  - run: npm run audit:legal-readiness',
  '  - run: npm run audit:security-responses',
  '  - run: npm run audit:api-errors',
  '  - run: npm run audit:cron-cache',
  '  - run: npm run audit:coverage',
  '  - run: npm run audit:rum',
  '  - run: npm run audit:release-deletions',
  '  - run: npm run release:state:strict',
  '',
].join('\n');
const forbiddenRandomApi = ['Math', 'random'].join('.');

const validReadme = [
  '# SV Booking',
  'Next.js 16 App Router with Kinde and Upstash Redis/KV.',
  'Current local catalog: 1 hotels, 1 cities, 1 countries.',
  `Never use ${forbiddenRandomApi}(). No fabricated price data.`,
  'Run npm run audit:production:strict before launch.',
  'catalog media must be approved before launch.',
  'Run npm run audit:master-plan before launch.',
  'Run npm run audit:env before launch.',
  'Run npm run audit:secrets before launch.',
  'Run npm run audit:runtime before launch.',
  'Run npm run audit:external-fetches before launch.',
  'Run npm run audit:public-api-urls before launch.',
  'Run npm run audit:public-data-contracts before launch.',
  'Run npm run audit:provenance before launch.',
  'Run npm run audit:deployment-smoke before launch.',
  'Run npm run audit:catalog-media-ledger before launch.',
  'Run npm run smoke:deployment after launch.',
  'Run npm run audit:affiliate-security before launch.',
  'Run npm run audit:legal-readiness before launch.',
  'Run npm run audit:security-responses before launch.',
  'Run npm run audit:api-errors before launch.',
  'Run npm run audit:cron-cache before launch.',
  'Run npm run audit:coverage before launch.',
  'Run npm run audit:rum before launch.',
  'Run npm run catalog:media:ledger before launch.',
  'Run npm run release:state before release review.',
  'Run npm run audit:release-deletions before release review.',
  'npm audit sends dependency metadata.',
  '',
].join('\n');

const validPlan = [
  '# Plan',
  'Current catalog: 1 hotels, 1 cities, 1 countries.',
  'Release hygiene remains required.',
  'Strict readiness fails without admin, cron, Redis, Kinde, partner-provider env, approved catalog media, licensed reviews, alert delivery, unsubscribe, ops delivery, and push keys.',
  '## Checked Backlog Re-Audit',
  '## Unfinished Launch Task Queue',
  'FAKED | None identified',
  `Never use ${forbiddenRandomApi}(). No fabricated provider data.`,
  'Never use invented secrets.',
  'Run npm run audit:production:strict.',
  'catalog media quality remains a launch gate.',
  '',
].join('\n');

const validAuditReport = [
  '# Audit Report',
  'Current local catalog: 1 hotels, 1 cities, 1 countries.',
  '196 test files, 1182 tests passed.',
  '78 Playwright tests passed.',
  'Go-live readiness remains blocked without real deployment env.',
  'Worktree is clean before release.',
  'audit:release-deletions passed.',
  'Master-plan honesty audit passed.',
  `Never use ${forbiddenRandomApi}(). No fabricated availability data.`,
  'Run npm run audit:production:strict.',
  'catalog media quality remains a launch gate.',
  '',
].join('\n');

const validFiles = {
  'README.md': validReadme,
  'MASTER-PLAN.md': validPlan,
  'AUDIT-REPORT.md': validAuditReport,
  'package.json': packageJson,
  '.github/workflows/ci.yml': ci,
  'lib/hotels-catalog.js': catalog,
};

describe('documentation audit script', () => {
  it('passes when docs match current catalog and release guardrails', async () => {
    const cwd = await createFixture(validFiles);

    const result = runDocsAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Documentation audit passed: 1 hotels, 1 cities, 1 countries');
  });

  it('fails when stale API and architecture claims return', async () => {
    const cwd = await createFixture({
      ...validFiles,
      'README.md': [
        validReadme,
        'Legacy docs mention /api/listings and MongoDB.',
        '',
      ].join('\n'),
    });

    const result = runDocsAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('removed listings API route');
    expect(result.stderr).toContain('old MongoDB architecture');
  });
});
