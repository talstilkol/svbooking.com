import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];

async function readProjectFile(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) failures.push(`${relativePath} is missing: ${snippet}`);
  }
}

const i18n = await readProjectFile('lib/i18n.js');
requireIncludes(i18n, 'lib/i18n.js', [
  'SUPPORTED_LOCALES',
  'LOCALE_QA_MATRIX',
  "code: 'en'",
  "code: 'he'",
  "code: 'ar'",
  "code: 'fr'",
  "code: 'es'",
  "dir: 'rtl'",
  "dir: 'ltr'",
  'CORE_TRANSLATIONS',
  'resolveLocale',
  'getDictionary',
  'getTranslation',
  'formatLocalizedDate',
  'formatLocalizedCurrency',
  'buildLocalePayload',
  'buildLocaleQaReport',
  'getI18nReadiness',
  'qaMatrixStatus',
  'fallback-only',
  "contentTranslation: 'partial'",
  'fallbackPolicy',
]);

const route = await readProjectFile('app/api/i18n/route.js');
requireIncludes(route, 'app/api/i18n/route.js', [
  'getI18nReadiness',
  'buildLocalePayload',
  'accept-language',
  'Cache-Control',
  'no-store',
]);

const layout = await readProjectFile('app/layout.tsx');
requireIncludes(layout, 'app/layout.tsx', [
  'lang="en"',
  'dir="ltr"',
  'LocaleProvider',
]);

const runtime = await readProjectFile('components/LocaleProvider.tsx');
requireIncludes(runtime, 'components/LocaleProvider.tsx', [
  'LOCAL_STORAGE_KEYS.locale',
  'document.documentElement.lang',
  'document.documentElement.dir',
  'dataset.localeDirection',
  'URLSearchParams',
  'resolveLocale',
]);

const health = await readProjectFile('lib/health-readiness.js');
requireIncludes(health, 'lib/health-readiness.js', [
  'getI18nReadiness',
  'i18n',
]);

if (failures.length > 0) {
  console.error('i18n audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('i18n audit passed');
