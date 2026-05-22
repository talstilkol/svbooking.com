import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-storage-keys.mjs');

async function createFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-storage-'));
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

function runStorageAudit(cwd: string) {
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

const packageJson = JSON.stringify({
  scripts: {
    'audit:storage': 'node scripts/audit-storage-keys.mjs',
  },
});

const ci = [
  'steps:',
  '  - run: npm run audit:storage',
  '',
].join('\n');

const storageKeys = [
  "export const LOCAL_STORAGE_KEYS = { favorites: 'svbooking:favorites', trips: 'svbooking:trips', recentlyViewed: 'svbooking:recent', recentSearches: 'svbooking:recent-searches' };",
  "export const LOCAL_STORAGE_DYNAMIC_PREFIXES = { travelChecklist: 'svbooking:travel-checklist:', hotelViews: 'svbooking:hotel-views:' };",
  "export const LEGACY_LOCAL_STORAGE_KEYS = { favorites: 'hotel-favorites', trips: 'saved-trips' };",
  'export const LOCAL_STORAGE_EXPORT_KEYS = [];',
  'export function readLocalStorageJsonWithFallback() {}',
  'export function readLocalStorageStringWithFallback() {}',
  'export function readLocalStorageExportData() {}',
  'export function writeLocalStorageExportData() {}',
  'export function writeLocalStorageJson() {}',
  'export function removeLocalStorageKeys() {}',
  '',
].join('\n');

const useLocalStorage = [
  'const fallbackKeys = [];',
  'readLocalStorageJsonWithFallback();',
  'LOCAL_STORAGE_KEYS.favorites;',
  'LOCAL_STORAGE_KEYS.trips;',
  'LOCAL_STORAGE_KEYS.recentlyViewed;',
  '',
].join('\n');

const componentUsingConstants = [
  'import { LOCAL_STORAGE_KEYS } from "@/lib/local-storage-keys";',
  'export default function Component() { return LOCAL_STORAGE_KEYS.favorites; }',
  '',
].join('\n');

const validFiles = {
  'package.json': packageJson,
  '.github/workflows/ci.yml': ci,
  'lib/local-storage-keys.ts': storageKeys,
  'lib/useLocalStorage.ts': useLocalStorage,
  'components/ActivityFeed.tsx': componentUsingConstants,
  'components/DashboardStats.tsx': componentUsingConstants,
  'components/UpcomingTrips.tsx': componentUsingConstants,
  'components/OnboardingTour.tsx': componentUsingConstants,
  'components/TripMap.tsx': componentUsingConstants,
  'components/DataExport.tsx': 'import { LOCAL_STORAGE_EXPORT_KEYS, readLocalStorageExportData, writeLocalStorageExportData } from "@/lib/local-storage-keys"; export default function Component() { writeLocalStorageExportData(readLocalStorageExportData()); return LOCAL_STORAGE_EXPORT_KEYS.length; }\n',
  'components/RecentSearches.tsx': componentUsingConstants,
};

describe('storage key audit script', () => {
  it('passes when storage keys are centralized', async () => {
    const cwd = await createFixture(validFiles);

    const result = runStorageAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Storage key audit passed');
  });

  it('fails when product code uses direct localStorage access', async () => {
    const cwd = await createFixture({
      ...validFiles,
      'components/BrokenStorage.tsx': "const key = 'hotel-favorites'; localStorage.getItem(key);\n",
    });

    const result = runStorageAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('direct localStorage access');
  });
});
