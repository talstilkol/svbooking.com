import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];

async function readProjectFile(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), 'utf8');
  } catch {
    failures.push(`Missing required legal-readiness file: ${relativePath}`);
    return '';
  }
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) failures.push(`${relativePath} is missing: ${snippet}`);
  }
}

function auditPackage(packageRaw) {
  let packageJson;
  try {
    packageJson = JSON.parse(packageRaw);
  } catch {
    failures.push('package.json is not valid JSON');
    return;
  }

  if (!packageJson.scripts?.['audit:legal-readiness']) {
    failures.push('package.json is missing script: audit:legal-readiness');
  }
}

const [
  privacyPage,
  termsPage,
  legalContent,
  priceNotice,
  cookieConsent,
  affiliate,
  clickRoute,
  packageRaw,
  ci,
  readme,
  runbook,
  masterPlan,
] = await Promise.all([
  readProjectFile('app/privacy/page.tsx'),
  readProjectFile('app/terms/page.tsx'),
  readProjectFile('lib/legal-content.ts'),
  readProjectFile('components/PriceComparisonNotice.tsx'),
  readProjectFile('components/CookieConsent.tsx'),
  readProjectFile('lib/affiliate.ts'),
  readProjectFile('app/api/click/route.js'),
  readProjectFile('package.json'),
  readProjectFile('.github/workflows/ci.yml'),
  readProjectFile('README.md'),
  readProjectFile('PRODUCTION-RUNBOOK.md'),
  readProjectFile('MASTER-PLAN.md'),
]);

requireIncludes(privacyPage, 'app/privacy/page.tsx', [
  'LegalDocument',
  'privacyEn',
  'privacyHe',
]);

requireIncludes(termsPage, 'app/terms/page.tsx', [
  'LegalDocument',
  'termsEn',
  'termsHe',
]);

requireIncludes(legalContent, 'lib/legal-content.ts', [
  'data minimization',
  'No payment card data',
  'browser storage',
  '/api/data-retention',
  'deterministic fingerprints',
  'We do not use cookie data to invent',
  'provider-returned hotel price comparison data',
]);

requireIncludes(legalContent, 'lib/legal-content.ts', [
  'We do not process bookings directly',
  'provider-returned prices',
  'Always verify the final',
  'respective provider',
  'provided "as is"',
  'trademarks belong to their respective owners',
  'display it for comparison purposes',
]);

requireIncludes(priceNotice, 'components/PriceComparisonNotice.tsx', [
  'Fees, taxes, cancellation terms',
  'Provider-supplied rates',
  'Direct provider checkout',
  'Terms confirmed off-site',
]);

requireIncludes(cookieConsent, 'components/CookieConsent.tsx', [
  'favorites, currency, trips',
  'No personal data is collected or shared',
  'LOCAL_STORAGE_KEYS.cookiesAccepted',
  "'minimal'",
]);

requireIncludes(affiliate, 'lib/affiliate.ts', [
  'getAffiliateUrl',
  'isAllowedProviderUrl',
  "url.protocol !== 'https:'",
  'hostname === domain || hostname.endsWith',
]);

requireIncludes(clickRoute, 'app/api/click/route.js', [
  'assertSameOrigin',
  'isAllowedProviderUrl',
  'Provider URL is not allowed',
  'recordPriceObservation',
  'no-store',
]);

auditPackage(packageRaw);

requireIncludes(ci, '.github/workflows/ci.yml', ['npm run audit:legal-readiness']);
requireIncludes(readme, 'README.md', [
  'npm run audit:legal-readiness',
  'SV Booking does not process bookings directly',
  'Commercial/legal readiness remains incomplete until partner terms, affiliate/legal review, and licensed content display signoff are captured.',
]);
requireIncludes(runbook, 'PRODUCTION-RUNBOOK.md', [
  'npm run audit:legal-readiness',
  'Partner terms',
  'affiliate/legal review',
  'licensed content display signoff',
]);
requireIncludes(masterPlan, 'MASTER-PLAN.md', [
  '| Backlog P3 | Commercial/legal readiness | PARTIAL |',
  'CI-wired legal readiness audit',
  'partner terms, affiliate/legal review, and licensed content display signoff',
]);

if (failures.length > 0) {
  console.error('Legal readiness audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Legal readiness audit passed');
