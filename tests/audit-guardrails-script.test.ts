import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-guardrails.mjs');

async function createFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-guardrails-'));
  for (const root of ['app', 'components', 'lib', 'scripts', 'tests']) {
    await mkdir(path.join(directory, root), { recursive: true });
  }
  for (const [relativePath, source] of Object.entries(files)) {
    const filePath = path.join(directory, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, source);
  }
  return directory;
}

function runGuardrails(cwd: string) {
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

describe('guardrail audit script', () => {
  it('passes clean deterministic code', async () => {
    const cwd = await createFixture({
      'lib/example.ts': "export const id = hashId('toast', 'info', 'saved', 1);\n",
    });

    const result = runGuardrails(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Guardrails passed');
  });

  it('rejects timestamp-backed deterministic IDs', async () => {
    const unstableTimestampExpression = ['Date', '.now()'].join('');
    const cwd = await createFixture({
      'components/Toast.tsx': `const id = hashId('toast', type, message, ${unstableTimestampExpression}, counter);\n`,
    });

    const result = runGuardrails(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('unstable timestamp used in deterministic hash ID');
  });

  it('rejects root proxy UUID randomness', async () => {
    const uuidCall = [['crypto', 'randomUUID'].join('.'), '()'].join('');
    const cwd = await createFixture({
      'proxy.ts': `export const requestId = ${uuidCall};\n`,
    });

    const result = runGuardrails(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('proxy.ts:1 unapproved UUID randomness');
  });

  it('rejects unsupported live provider availability copy', async () => {
    const unsupportedCopy = ['See', 'live', 'rates', 'from', 'every', 'provider'].join(' ');
    const cwd = await createFixture({
      'components/Marketing.tsx': `export const copy = '${unsupportedCopy}';\n`,
    });

    const result = runGuardrails(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('unsupported live-rates-from-provider claim');
    expect(result.stderr).toContain('unsupported every-provider claim');
  });

  it('rejects static provider-logo coverage copy', async () => {
    const staticProviderCopy = ['Compare', 'on:'].join(' ');
    const cwd = await createFixture({
      'components/ProviderLogos.tsx': `export const label = '${staticProviderCopy}';\n`,
    });

    const result = runGuardrails(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('unsupported static provider-logo claim');
  });

  it('rejects static provider-loading copy', async () => {
    const staticLoadingCopy = ['Checking', 'Booking.com'].join(' ');
    const cwd = await createFixture({
      'components/LoadingOverlay.tsx': `export const message = '${staticLoadingCopy}';\n`,
    });

    const result = runGuardrails(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('unsupported static provider-loading claim');
  });

  it('rejects hardcoded booking search links in product routes', async () => {
    const cwd = await createFixture({
      'app/api/agents/availability/route.js': "export const url = 'https://www.booking.com/searchresults.html?ss=Paris';\n",
    });

    const result = runGuardrails(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('unsupported hardcoded booking search link');
  });

  it('rejects unsupported urgency and structured availability claims', async () => {
    const schemaClaim = ['schema.org', 'InStock'].join('/');
    const limitedClaim = ['Limited', 'availability'].join(' ');
    const priceClaim = ['prices', 'may', 'increase'].join(' ');
    const cwd = await createFixture({
      'components/Urgency.tsx': `export const copy = '${limitedClaim}';\n`,
      'components/Countdown.tsx': `export const copy = '${priceClaim}';\n`,
      'components/Schema.tsx': `export const availability = '${schemaClaim}';\n`,
    });

    const result = runGuardrails(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('unsupported offer availability schema claim');
    expect(result.stderr).toContain('unsupported limited-availability urgency claim');
    expect(result.stderr).toContain('unsupported price-increase urgency claim');
  });

  it('rejects provider-trust UI labels and broad OTA coverage copy', async () => {
    const trustLabel = ['Trust', ':'].join('');
    const otaCopy = ['Compare', 'available', 'OTA', 'prices'].join(' ');
    const cwd = await createFixture({
      'app/trips/page.tsx': `export const label = '${trustLabel}';\n`,
      'components/Footer.tsx': `export const copy = '${otaCopy}';\n`,
    });

    const result = runGuardrails(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('unsupported quality-score UI');
    expect(result.stderr).toContain('unsupported available-OTA-price claim');
  });

  it('rejects static city-guide and travel-readiness copy', async () => {
    const bestForField = ['best', 'For'].join('');
    const bestTimeField = ['best', 'Time'].join('');
    const mostVisitedClaim = ['world', 's', 'most', 'visited', 'cities'].join(' ');
    const readinessClaim = ['Ready', 'to', 'travel'].join(' ');
    const cwd = await createFixture({
      'components/CityGuide.tsx': `export const guide = { ${bestForField}: [], ${bestTimeField}: 'Apr-Jun' };\n`,
      'components/PopularCities.tsx': `export const copy = '${mostVisitedClaim}';\n`,
      'components/TravelChecklist.tsx': `export const complete = '${readinessClaim}';\n`,
    });

    const result = runGuardrails(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('unsupported static city-guide best-for field');
    expect(result.stderr).toContain('unsupported static city-guide timing field');
    expect(result.stderr).toContain('unsupported most-visited-city claim');
    expect(result.stderr).toContain('unsupported checklist travel-readiness claim');
  });
});
