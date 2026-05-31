import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const scanRoots = ['app', 'components', 'lib'];
const ignoredDirectories = new Set(['.git', '.next', 'node_modules', 'coverage', 'test-results', 'playwright-report']);
const extensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx']);
const forbiddenProductSnippets = [
  'sv-user-reviews',
  'UserReviewForm',
  'Write a Review',
  'Wrote review',
];

async function readProjectFile(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) failures.push(`${relativePath} is missing: ${snippet}`);
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
    if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      yield fullPath;
    }
  }
}

const reviews = await readProjectFile('lib/reviews.js');
requireIncludes(reviews, 'lib/reviews.js', [
  'isReviewProviderConfigured',
  'isSupportedReviewProvider',
  'REVIEWS_PROVIDER_LICENSED',
  'GOOGLE_PLACES_API_KEY',
  "isEnvConfigured(env, 'GOOGLE_PLACES_API_KEY')",
  'available: false',
  'verified: false',
  'reviews: []',
  'No licensed review provider',
]);

const reviewsRoute = await readProjectFile('app/api/reviews/[hotelKey]/route.js');
requireIncludes(reviewsRoute, 'app/api/reviews/[hotelKey]/route.js', [
  // getReviewSummary dispatches to a licensed provider when configured, and
  // otherwise returns getUnavailableReviewSummary (the honest fallback).
  'getReviewSummary',
  'Cache-Control',
  'no-store',
]);

const propertyContent = await readProjectFile('lib/property-content.js');
requireIncludes(propertyContent, 'lib/property-content.js', [
  'amenities',
  'policies',
  'rooms',
  'starRating',
  'taxesAndFees',
  'available: false',
]);

const propertyRoute = await readProjectFile('app/api/property-content/[hotelKey]/route.js');
requireIncludes(propertyRoute, 'app/api/property-content/[hotelKey]/route.js', [
  'getPropertyContent',
  'Cache-Control',
  'no-store',
]);

for (const scanRoot of scanRoots) {
  for await (const filePath of walk(path.join(root, scanRoot))) {
    const relativePath = path.relative(root, filePath);
    const source = await readFile(filePath, 'utf8');
    for (const snippet of forbiddenProductSnippets) {
      if (source.includes(snippet)) {
        failures.push(`${relativePath} contains unverified local review product surface: ${snippet}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Review audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Review audit passed');
