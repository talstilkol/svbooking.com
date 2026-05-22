import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const scanRoots = ['app', 'components', 'lib'];
const scanExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const ignoredDirectories = new Set(['.git', '.next', 'node_modules', 'coverage', 'test-results', 'playwright-report']);

const forbiddenSeoSnippets = [
  { label: 'stale preview deployment domain', value: ['my-app-alpha-one-28', 'vercel', 'app'].join('.') },
  { label: 'unsupported best-hotel-deal claim', value: ['best', 'hotel', 'deal'].join(' ') },
  { label: 'unsupported best-hotel-deals claim', value: ['best', 'hotel', 'deals'].join(' ') },
  { label: 'unsupported top-hotels claim', value: ['top', 'hotels'].join(' ') },
  { label: 'unsupported live-prices claim', value: ['live', 'prices'].join(' ') },
  { label: 'unsupported cheapest-available claim', value: ['cheapest', 'available'].join(' ') },
  { label: 'unsupported cheapest-rate claim', value: ['cheapest', 'rate'].join(' ') },
  { label: 'unsupported cheapest-rates claim', value: ['cheapest', 'rates'].join(' ') },
  { label: 'unsupported aggregate rating schema', value: ['Aggregate', 'Rating'].join('') },
  { label: 'unsupported review count schema', value: ['review', 'Count'].join('') },
];

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
    fail(`Missing required SEO file: ${relativePath}`);
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

await requireFile('app/layout.tsx');
await requireFile('app/sitemap.ts');
await requireFile('app/robots.ts');
await requireFile('app/favorites/layout.tsx');
await requireFile('app/trips/layout.tsx');
await requireFile('app/dashboard/layout.tsx');
await requireFile('app/profile/layout.tsx');
await requireFile('components/JsonLd.tsx');
await requireFile('components/SchemaOrg.tsx');
await requireFile('lib/utils/jsonLd.ts');
await requireFile('package.json');
await requireFile('.github/workflows/ci.yml');

const packageJson = JSON.parse(await readProjectFile('package.json'));
if (!packageJson.scripts?.['audit:seo']) fail('package.json is missing script: audit:seo');

const ci = await readProjectFile('.github/workflows/ci.yml');
requireIncludes(ci, '.github/workflows/ci.yml', ['npm run audit:seo']);

const layout = await readProjectFile('app/layout.tsx');
requireIncludes(layout, 'app/layout.tsx', [
  "metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://svbooking.com')",
  'OrganizationJsonLd',
  'SearchActionJsonLd',
  'WebsiteJsonLd',
]);

const sitemap = await readProjectFile('app/sitemap.ts');
requireIncludes(sitemap, 'app/sitemap.ts', [
  "process.env.NEXT_PUBLIC_BASE_URL || 'https://svbooking.com'",
  "new Date('2026-05-14T00:00:00.000Z')",
  'HOTELS.map',
  'listCities().map',
]);
if (sitemap.includes('new Date()')) fail('app/sitemap.ts uses request/build time as lastModified instead of an evidence-backed value');
for (const privateRoute of ['/agents', '/favorites', '/trips', '/dashboard', '/profile']) {
  if (sitemap.includes(`\`${'${baseUrl}'}${privateRoute}\``) || sitemap.includes(`${privateRoute}\``) || sitemap.includes(`${privateRoute}',`)) {
    fail(`app/sitemap.ts must not include private or user-state route: ${privateRoute}`);
  }
}

const robots = await readProjectFile('app/robots.ts');
requireIncludes(robots, 'app/robots.ts', [
  "process.env.NEXT_PUBLIC_BASE_URL || 'https://svbooking.com'",
  "disallow: ['/api/', '/agents', '/dashboard', '/profile']",
]);

for (const route of [
  'app/agents/layout.tsx',
  'app/favorites/layout.tsx',
  'app/trips/layout.tsx',
  'app/dashboard/layout.tsx',
  'app/profile/layout.tsx',
]) {
  const source = await readProjectFile(route);
  requireIncludes(source, route, ['robots: { index: false, follow: false }']);
}

for (const structuredDataFile of ['components/JsonLd.tsx', 'components/SchemaOrg.tsx']) {
  const source = await readProjectFile(structuredDataFile);
  requireIncludes(source, structuredDataFile, ['serializeJsonLd']);
}

const schemaOrg = await readProjectFile('components/SchemaOrg.tsx');
if (schemaOrg.includes('HotelOfferJsonLd')) {
  requireIncludes(schemaOrg, 'components/SchemaOrg.tsx', [
    'url: string',
    'if (!url) return null',
    'url,',
  ]);
}

try {
  const hotelDetail = await readProjectFile('components/HotelDetailClient.tsx');
  if (hotelDetail.includes('HotelOfferJsonLd')) {
    requireIncludes(hotelDetail, 'components/HotelDetailClient.tsx', [
      'data?.cheapest?.deepLink',
      'url={data.cheapest.deepLink}',
    ]);
  }
} catch {
  // Some focused SEO fixtures do not include the full hotel detail client.
}

for (const relativeRoot of scanRoots) {
  const absoluteRoot = path.join(root, relativeRoot);
  for await (const filePath of walk(absoluteRoot)) {
    const source = await readFile(filePath, 'utf8');
    const lower = source.toLowerCase();
    const relativePath = path.relative(root, filePath);
    for (const snippet of forbiddenSeoSnippets) {
      const needle = snippet.value.toLowerCase();
      const index = lower.indexOf(needle);
      if (index === -1) continue;
      fail(`${relativePath}:${lineNumberForIndex(lower, index)} ${snippet.label}`);
    }
  }
}

if (failures.length > 0) {
  console.error('SEO audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('SEO audit passed');
