import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-external-fetches.mjs');

async function createFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-external-fetches-'));
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

const validFiles = {
  'lib/utils/fetch-with-timeout.js': [
    'export async function fetchWithTimeout(input, { timeoutMs = 1000 } = {}) {',
    '  const controller = new AbortController();',
    '  const timer = setTimeout(() => controller.abort(), timeoutMs);',
    '  try { return await globalThis.fetch(input, { signal: controller.signal }); }',
    '  finally { clearTimeout(timer); }',
    '}',
    'export async function fetchJsonWithTimeout() {}',
    '',
  ].join('\n'),
  'app/api/agents/auto/health-monitor/route.js': [
    "import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout';",
    'const PROBE_TIMEOUT_MS = 8000;',
    "export async function GET() { return Response.json({ error: 'Probe unavailable' }); }",
    '',
  ].join('\n'),
  'app/api/destination-intel/route.js': [
    "import { fetchJsonWithTimeout } from '@/lib/utils/fetch-with-timeout';",
    'const SUNRISE_SUNSET_TIMEOUT_MS = 5000;',
    "export async function GET() { return Response.json({ error: 'Destination intelligence unavailable' }); }",
    '',
  ].join('\n'),
  'lib/wikidata.js': [
    "import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout';",
    'const WIKIDATA_TIMEOUT_MS = 15000;',
    'function sparqlString() {}',
    'function sparqlEnglishLiteral() {}',
    'function parseLimit() {}',
    "export async function discoverHotels() { return fetchWithTimeout('url', { cache: 'no-store' }); }",
    '',
  ].join('\n'),
  'lib/wikipedia.js': [
    "import { fetchWithTimeout } from './utils/fetch-with-timeout';",
    "import { normalizeHttpsUrl } from './utils/public-url-safety';",
    '',
  ].join('\n'),
  'lib/wikivoyage.js': [
    "import { fetchWithTimeout } from './utils/fetch-with-timeout';",
    "import { normalizeHttpsUrl } from './utils/public-url-safety';",
    '',
  ].join('\n'),
  'lib/dbpedia.js': [
    "import { fetchWithTimeout } from './utils/fetch-with-timeout';",
    "import { normalizeHttpsUrl } from './utils/public-url-safety';",
    '',
  ].join('\n'),
  'lib/opentripmap.js': [
    "import { fetchWithTimeout } from './utils/fetch-with-timeout';",
    "import { normalizeHttpsUrl } from './utils/public-url-safety';",
    '',
  ].join('\n'),
  'lib/cheaper-dates.js': [
    "import { normalizeHttpsUrl } from './utils/public-url-safety';",
    '',
  ].join('\n'),
  'lib/ticketmaster.js': [
    "import { fetchJsonWithTimeout } from './utils/fetch-with-timeout.js';",
    "import { normalizeHttpsUrl } from './utils/public-url-safety';",
    '',
  ].join('\n'),
  'lib/wikidata-enrich.js': [
    "import { normalizeHttpsUrl } from './utils/public-url-safety';",
    '',
  ].join('\n'),
  'lib/catalog-candidates.js': [
    "import { normalizeHttpsUrl } from './utils/public-url-safety';",
    '',
  ].join('\n'),
  'lib/hotels-catalog.js': [
    "import { normalizeHttpsUrl } from './utils/public-url-safety';",
    '',
  ].join('\n'),
  'lib/utils/public-url-safety.js': [
    'function isPrivateHostname() {}',
    'export function normalizeHttpsUrl(value) {',
    "  if (url.protocol !== 'https:') return null;",
    '  if (url.username || url.password) return null;',
    '  if (a === 100 && b >= 64 && b <= 127) return null;',
    "  if (host.startsWith('::ffff:')) return null;",
    '}',
    '',
  ].join('\n'),
  'tests/wikidata-client.test.ts': [
    "it('escapes country and city filters', () => { expect(AbortSignal).toBeTruthy(); });",
    "it('bounds unsafe discovery limits', () => {});",
    "it('deduplicates and escapes city label lookups', () => {});",
    '',
  ].join('\n'),
  'tests/content-discovery-helpers.test.ts': [
    "it('drops unsafe Wikipedia media URLs and bounds search limits', () => { expect('srlimit').toBeTruthy(); });",
    '',
  ].join('\n'),
  'tests/discovery-source-hardening.test.ts': [
    "it('drops unsafe travel guide media URLs', () => { expect('Unsafe Coordinate Hotel').toBeTruthy(); });",
    "it('strips unsafe enrichment URLs', () => { expect('https://[::ffff:127.0.0.1]/internal.jpg').toBeTruthy(); });",
    '',
  ].join('\n'),
  'tests/cheaper-dates.test.ts': [
    "it('sanitizes provider currencies and deep links before reuse by public APIs', () => {",
    "  expect('https://127.0.0.1/internal').toBeTruthy();",
    '});',
    '',
  ].join('\n'),
  'tests/poi-weather-events.test.ts': [
    "it('drops incomplete Ticketmaster events and strips unsafe ticket URLs', () => {",
    "  expect('https://127.0.0.1/paris-opera-gala').toBeTruthy();",
    '});',
    '',
  ].join('\n'),
  'tests/catalog-candidates.test.ts': [
    "it('does not treat unsafe source URLs as usable provenance', () => {});",
    "it('keeps external IDs as provenance while stripping unsafe source URLs', () => {});",
    '',
  ].join('\n'),
  'tests/catalog-candidates-api.test.ts': [
    "it('strips unsafe catalog candidate source URLs before storage', () => {});",
    '',
  ].join('\n'),
  'tests/hotels-catalog.test.ts': [
    "it('normalizes source URLs', () => { expect('https://127.0.0.1/internal').toBeTruthy(); });",
    '',
  ].join('\n'),
  'tests/public-url-safety.test.ts': [
    "it('rejects unsafe public response links', () => {",
    "  expect('https://localhost:3000/internal').toBeTruthy();",
    "  expect('https://127.0.0.1/internal').toBeTruthy();",
    "  expect('https://100.64.0.1/internal').toBeTruthy();",
    "  expect('https://[::ffff:127.0.0.1]/internal').toBeTruthy();",
    '});',
    '',
  ].join('\n'),
  'package.json': JSON.stringify({
    scripts: {
      'audit:external-fetches': 'node scripts/audit-external-fetches.mjs',
    },
  }),
  '.github/workflows/ci.yml': 'steps:\n  - run: npm run audit:external-fetches\n',
  'README.md': 'Run npm run audit:external-fetches before release.\n',
  'PRODUCTION-RUNBOOK.md': 'Run npm run audit:external-fetches before go-live.\n',
};

describe('external fetch audit script', () => {
  it('passes when external requests use the timeout helper', async () => {
    const cwd = await createFixture(validFiles);

    const result = runAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('External fetch audit passed');
  });

  it('fails on direct external fetch literals and missing CI wiring', async () => {
    const cwd = await createFixture({
      ...validFiles,
      'app/api/bad/route.js': "export async function GET() { await fetch('https://example.com/raw'); }\n",
      '.github/workflows/ci.yml': 'steps:\n  - run: npm test\n',
    });

    const result = runAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('app/api/bad/route.js:1 uses direct external fetch');
    expect(result.stderr).toContain('.github/workflows/ci.yml is missing: npm run audit:external-fetches');
  });

  it('fails when the Wikidata client loses timeout and SPARQL escaping hardening', async () => {
    const cwd = await createFixture({
      ...validFiles,
      'lib/wikidata.js': "export async function discoverHotels() { return []; }\n",
    });

    const result = runAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('lib/wikidata.js is missing: fetchWithTimeout');
    expect(result.stderr).toContain('lib/wikidata.js is missing: sparqlString');
    expect(result.stderr).toContain('lib/wikidata.js is missing: parseLimit');
  });
});
