import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];

const removedLegacyFiles = [
  {
    path: 'components/FlightEstimate.tsx',
    reason: 'static flight fare estimates are not licensed provider data',
  },
  {
    path: 'components/PriceGuarantee.tsx',
    reason: 'best-price guarantee copy requires a contractual guarantee',
  },
  {
    path: 'components/ProviderTrustScore.tsx',
    reason: 'provider quality claims must come from verified observability',
  },
  {
    path: 'components/UserReviewForm.tsx',
    reason: 'local user reviews are not licensed review inventory',
  },
  {
    path: 'lib/providers/heatmap-provider.js',
    reason: 'approximate pricing fallbacks must stay unavailable',
  },
];

const scanRoots = ['app', 'components', 'lib'];
const ignoredDirectories = new Set(['.git', '.next', 'node_modules', 'coverage', 'test-results', 'playwright-report']);
const extensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx']);
const forbiddenReferences = [
  { label: 'FlightEstimate', pattern: /\bFlightEstimate\b/ },
  { label: 'PriceGuarantee', pattern: /\bPriceGuarantee\b/ },
  { label: 'ProviderTrustScore', pattern: /\bProviderTrustScore\b/ },
  { label: 'UserReviewForm', pattern: /\bUserReviewForm\b/ },
  { label: 'heatmap-provider', pattern: /heatmap-provider/ },
  { label: 'heatmapProvider', pattern: /\bheatmapProvider\b/ },
  { label: 'cached approximate pricing label', pattern: new RegExp(['Cached', 'Heatmap', 'Estimate'].join(' ')) },
  { label: 'local user reviews key', pattern: /sv-user-reviews/ },
];

async function fileExists(relativePath) {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function* walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
      continue;
    }
    if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      yield fullPath;
    }
  }
}

for (const removedFile of removedLegacyFiles) {
  if (await fileExists(removedFile.path)) {
    failures.push(`${removedFile.path} must stay removed: ${removedFile.reason}`);
  }
}

for (const scanRoot of scanRoots) {
  for await (const filePath of walk(path.join(root, scanRoot))) {
    const relativePath = path.relative(root, filePath);
    const source = await readFile(filePath, 'utf8');
    for (const reference of forbiddenReferences) {
      if (reference.pattern.test(source)) {
        failures.push(`${relativePath} references removed legacy surface: ${reference.label}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Release deletion audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Release deletion audit passed');
