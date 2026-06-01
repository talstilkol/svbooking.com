import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-legal-readiness.mjs');

async function createFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-legal-readiness-'));
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

const validFiles = {
  'app/privacy/page.tsx': [
    'import LegalDocument from "@/components/LegalDocument";',
    'import { privacyEn, privacyHe } from "@/lib/legal-content";',
    'export default function PrivacyPage() { return <LegalDocument en={privacyEn} he={privacyHe} />; }',
  ].join('\n'),
  'app/terms/page.tsx': [
    'import LegalDocument from "@/components/LegalDocument";',
    'import { termsEn, termsHe } from "@/lib/legal-content";',
    'export default function TermsPage() { return <LegalDocument en={termsEn} he={termsHe} />; }',
  ].join('\n'),
  'lib/legal-content.ts': [
    'SV Booking is built around data minimization.',
    'No payment card data is collected or processed by SV Booking.',
    'Local records may use browser storage.',
    'Retention is listed at /api/data-retention.',
    'Operational logs use deterministic fingerprints.',
    'We do not use cookie data to invent reviews, prices, savings, or availability.',
    'provider-returned hotel price comparison data is fetched only from configured providers.',
    'We do not process bookings directly.',
    'Current provider-returned prices may change.',
    'Always verify the final price on the booking provider website.',
    'Bookings are completed on the respective provider website.',
    'SV Booking is provided "as is" without warranties.',
    'Hotel names, logos, and trademarks belong to their respective owners.',
    'Provider data is shown and display it for comparison purposes.',
  ].join('\n'),
  'components/PriceComparisonNotice.tsx': [
    'Fees, taxes, cancellation terms, and room details can vary by provider.',
    'Provider-supplied rates',
    'Direct provider checkout',
    'Terms confirmed off-site',
  ].join('\n'),
  'components/CookieConsent.tsx': [
    'favorites, currency, trips',
    'No personal data is collected or shared',
    'LOCAL_STORAGE_KEYS.cookiesAccepted',
    "writeLocalStorageJson(LOCAL_STORAGE_KEYS.cookiesAccepted, 'minimal');",
  ].join('\n'),
  'lib/affiliate.ts': [
    'export function getAffiliateUrl() {}',
    'export function isAllowedProviderUrl() {}',
    "if (url.protocol !== 'https:') return false;",
    'return hostname === domain || hostname.endsWith(`.${domain}`);',
  ].join('\n'),
  'app/api/click/route.js': [
    'assertSameOrigin(request);',
    'isAllowedProviderUrl(provider, url);',
    'Provider URL is not allowed',
    'recordPriceObservation({});',
    'Cache-Control: no-store',
  ].join('\n'),
  'package.json': JSON.stringify({
    scripts: {
      'audit:legal-readiness': 'node scripts/audit-legal-readiness.mjs',
    },
  }),
  '.github/workflows/ci.yml': 'steps:\n  - run: npm run audit:legal-readiness\n',
  'README.md': [
    'SV Booking does not process bookings directly.',
    'Run npm run audit:legal-readiness before release.',
    'Commercial/legal readiness remains incomplete until partner terms, affiliate/legal review, and licensed content display signoff are captured.',
  ].join('\n'),
  'PRODUCTION-RUNBOOK.md': [
    'Run npm run audit:legal-readiness.',
    'Partner terms must be reviewed.',
    'affiliate/legal review is required.',
    'licensed content display signoff is required.',
  ].join('\n'),
  'MASTER-PLAN.md': [
    '| Backlog P3 | Commercial/legal readiness | PARTIAL | Audit exists; signoff remains. |',
    'CI-wired legal readiness audit is in place.',
    'Capture partner terms, affiliate/legal review, and licensed content display signoff.',
  ].join('\n'),
};

describe('legal readiness audit script', () => {
  it('passes when privacy, terms, affiliate, and disclosure guardrails are wired', async () => {
    const cwd = await createFixture(validFiles);

    const result = runAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Legal readiness audit passed');
  });

  it('fails when commercial disclosure wiring is removed', async () => {
    const cwd = await createFixture({
      ...validFiles,
      'components/PriceComparisonNotice.tsx': 'Provider-supplied rates\n',
      '.github/workflows/ci.yml': 'steps:\n  - run: npm test\n',
    });

    const result = runAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('components/PriceComparisonNotice.tsx is missing: Fees, taxes, cancellation terms');
    expect(result.stderr).toContain('components/PriceComparisonNotice.tsx is missing: Direct provider checkout');
    expect(result.stderr).toContain('.github/workflows/ci.yml is missing: npm run audit:legal-readiness');
  });
});
