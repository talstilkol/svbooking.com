import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];

async function readProjectFile(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) fail(`${relativePath} is missing: ${snippet}`);
  }
}

async function requireFile(relativePath) {
  try {
    await readProjectFile(relativePath);
  } catch {
    fail(`${relativePath} is missing`);
  }
}

await requireFile('app/layout.tsx');
await requireFile('components/PerformanceMonitor.tsx');
await requireFile('package.json');

const layout = await readProjectFile('app/layout.tsx');
requireIncludes(layout, 'app/layout.tsx', [
  '@vercel/analytics/next',
  '@vercel/speed-insights/next',
  '<Analytics />',
  '<SpeedInsights />',
  'PerformanceMonitor',
]);

const monitor = await readProjectFile('components/PerformanceMonitor.tsx');
requireIncludes(monitor, 'components/PerformanceMonitor.tsx', [
  'largest-contentful-paint',
  'layout-shift',
  'navigation',
  'durationThreshold: 16',
  'Core Web Vitals',
  'process.env.NODE_ENV !== \'development\'',
]);

for (const metric of ['lcp', 'inp', 'cls', 'ttfb', 'fcp']) {
  if (!monitor.includes(metric)) {
    fail(`components/PerformanceMonitor.tsx is missing metric: ${metric}`);
  }
}

const packageJson = JSON.parse(await readProjectFile('package.json'));
for (const dependency of ['@vercel/analytics', '@vercel/speed-insights']) {
  if (!packageJson.dependencies?.[dependency]) {
    fail(`package.json is missing dependency: ${dependency}`);
  }
}

if (failures.length > 0) {
  console.error('RUM audit failures:');
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log('RUM audit passed: analytics, speed insights, and local Core Web Vitals monitor are wired');
