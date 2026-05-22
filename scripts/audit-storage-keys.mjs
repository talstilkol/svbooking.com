import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const scanRoots = ['app', 'components', 'lib'];
const scanExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const ignoredDirectories = new Set(['.git', '.next', 'node_modules', 'coverage', 'test-results', 'playwright-report']);
const exemptFiles = new Set(['lib/local-storage-keys.ts']);

function fail(message) {
  failures.push(message);
}

async function readProjectFile(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

async function requireFile(relativePath) {
  try {
    await access(path.join(root, relativePath));
  } catch {
    fail(`Missing required storage file: ${relativePath}`);
  }
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) fail(`${relativePath} is missing: ${snippet}`);
  }
}

async function* walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
      continue;
    }
    if (entry.isFile() && scanExtensions.has(path.extname(entry.name))) {
      yield fullPath;
    }
  }
}

function lineNumberForIndex(source, index) {
  return source.slice(0, index).split('\n').length;
}

await requireFile('lib/local-storage-keys.ts');
await requireFile('lib/useLocalStorage.ts');
await requireFile('components/ActivityFeed.tsx');
await requireFile('components/DashboardStats.tsx');
await requireFile('components/UpcomingTrips.tsx');
await requireFile('components/OnboardingTour.tsx');
await requireFile('components/TripMap.tsx');
await requireFile('components/DataExport.tsx');
await requireFile('components/RecentSearches.tsx');
await requireFile('package.json');
await requireFile('.github/workflows/ci.yml');

const packageJson = JSON.parse(await readProjectFile('package.json'));
if (!packageJson.scripts?.['audit:storage']) fail('package.json is missing script: audit:storage');

const ci = await readProjectFile('.github/workflows/ci.yml');
requireIncludes(ci, '.github/workflows/ci.yml', ['npm run audit:storage']);

const storageKeys = await readProjectFile('lib/local-storage-keys.ts');
requireIncludes(storageKeys, 'lib/local-storage-keys.ts', [
  'LOCAL_STORAGE_KEYS',
  'LEGACY_LOCAL_STORAGE_KEYS',
  'LOCAL_STORAGE_EXPORT_KEYS',
  'readLocalStorageJsonWithFallback',
  'readLocalStorageStringWithFallback',
  'readLocalStorageExportData',
  'writeLocalStorageExportData',
  'writeLocalStorageJson',
  'removeLocalStorageKeys',
  'LOCAL_STORAGE_DYNAMIC_PREFIXES',
  'svbooking:favorites',
  'svbooking:trips',
  'svbooking:recent',
  'svbooking:recent-searches',
  'svbooking:travel-checklist:',
  'svbooking:hotel-views:',
  'hotel-favorites',
  'saved-trips',
]);

const useLocalStorage = await readProjectFile('lib/useLocalStorage.ts');
requireIncludes(useLocalStorage, 'lib/useLocalStorage.ts', [
  'fallbackKeys',
  'readLocalStorageJsonWithFallback',
  'LOCAL_STORAGE_KEYS.favorites',
  'LOCAL_STORAGE_KEYS.trips',
  'LOCAL_STORAGE_KEYS.recentlyViewed',
]);

for (const file of [
  'components/ActivityFeed.tsx',
  'components/DashboardStats.tsx',
  'components/UpcomingTrips.tsx',
  'components/OnboardingTour.tsx',
  'components/TripMap.tsx',
  'components/RecentSearches.tsx',
]) {
  const source = await readProjectFile(file);
  requireIncludes(source, file, ['LOCAL_STORAGE_KEYS']);
}

const dataExport = await readProjectFile('components/DataExport.tsx');
requireIncludes(dataExport, 'components/DataExport.tsx', [
  'LOCAL_STORAGE_EXPORT_KEYS',
  'readLocalStorageExportData',
  'writeLocalStorageExportData',
]);

const directAccessPattern = /localStorage\./g;
for (const relativeRoot of scanRoots) {
  const absoluteRoot = path.join(root, relativeRoot);
  for await (const filePath of walk(absoluteRoot)) {
    const relativePath = path.relative(root, filePath);
    if (exemptFiles.has(relativePath)) continue;
    const source = await readFile(filePath, 'utf8');
    for (const match of source.matchAll(directAccessPattern)) {
      fail(`${relativePath}:${lineNumberForIndex(source, match.index || 0)} direct localStorage access`);
    }
  }
}

if (failures.length > 0) {
  console.error('Storage key audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Storage key audit passed');
