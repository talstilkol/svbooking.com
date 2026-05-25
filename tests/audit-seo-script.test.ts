import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-seo.mjs');

async function createFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-seo-'));
  for (const root of ['app', 'components', 'lib/utils']) {
    await mkdir(path.join(directory, root), { recursive: true });
  }
  for (const [relativePath, source] of Object.entries(files)) {
    const filePath = path.join(directory, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, source);
  }
  return directory;
}

function runSeoAudit(cwd: string) {
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

const packageJson = JSON.stringify({
  scripts: {
    'audit:seo': 'node scripts/audit-seo.mjs',
  },
});

const ci = [
  'steps:',
  '  - run: npm run audit:seo',
  '',
].join('\n');

const layout = [
  "export const metadata = { metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://svbooking.com') };",
  'export default function Layout() {',
  '  return <><OrganizationJsonLd /><SearchActionJsonLd /></>;',
  '}',
  '',
].join('\n');

const sitemap = [
  "const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://svbooking.com';",
  'const hotelPages = HOTELS.map((hotel) => ({ url: `${baseUrl}/hotel/${hotel.hotelKey}` }));',
  'const cityPages = listCities().map((city) => ({ url: `${baseUrl}/city/${city}` }));',
  'export default function sitemap() { return [...cityPages, ...hotelPages]; }',
  '',
].join('\n');

const robots = [
  "const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://svbooking.com';",
  "export default function robots() { return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/agents', '/dashboard', '/profile', '/favorites', '/trips', '/offline', '/book/'] }], sitemap: `${baseUrl}/sitemap.xml` }; }",
  '',
].join('\n');

const noindexLayout = [
  'export const metadata = { robots: { index: false, follow: false } };',
  'export default function Layout({ children }) { return children; }',
  '',
].join('\n');

const jsonLdComponent = [
  "import { serializeJsonLd } from '@/lib/utils/jsonLd';",
  'export function JsonLd() { return <script dangerouslySetInnerHTML={{ __html: serializeJsonLd({}) }} />; }',
  '',
].join('\n');

const validFiles = {
  'package.json': packageJson,
  '.github/workflows/ci.yml': ci,
  'app/layout.tsx': layout,
  'app/sitemap.ts': sitemap,
  'app/robots.ts': robots,
  'app/agents/layout.tsx': noindexLayout,
  'app/favorites/layout.tsx': noindexLayout,
  'app/trips/layout.tsx': noindexLayout,
  'app/dashboard/layout.tsx': noindexLayout,
  'app/profile/layout.tsx': noindexLayout,
  'components/JsonLd.tsx': jsonLdComponent,
  'components/SchemaOrg.tsx': jsonLdComponent,
  'lib/utils/jsonLd.ts': 'export function serializeJsonLd(value) { return JSON.stringify(value); }\n',
};

const unsupportedDealClaim = ['Find the', 'best', 'hotel', 'deal'].join(' ');

describe('SEO audit script', () => {
  it('passes when crawlability and structured-data guardrails are wired', async () => {
    const cwd = await createFixture(validFiles);

    const result = runSeoAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('SEO audit passed');
  });

  it('fails when stale preview domains or unsupported SEO claims return', async () => {
    const cwd = await createFixture({
      ...validFiles,
      'app/layout.tsx': "export const metadata = { metadataBase: new URL('https://my-app-alpha-one-28.vercel.app') };\n",
      'components/Hero.tsx': `<h1>${unsupportedDealClaim}</h1>\n`,
    });

    const result = runSeoAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('stale preview deployment domain');
    expect(result.stderr).toContain('unsupported best-hotel-deal claim');
  });
});
