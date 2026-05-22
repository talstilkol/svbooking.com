import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const roots = ['app', 'components', 'lib'];
const ignoredDirectories = new Set(['.git', '.next', 'node_modules', 'coverage', 'test-results', 'playwright-report']);
const extensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx']);

const allowedImplementations = new Map([
  ['addDays', 'lib/utils/date.js'],
  ['toRadians', 'lib/utils/geo-distance.js'],
  ['haversineMeters', 'lib/utils/geo-distance.js'],
  ['haversineKm', 'lib/utils/geo-distance.js'],
]);

const duplicatePatterns = [
  {
    helper: 'addDays',
    pattern: /\b(?:function|const|let|var)\s+addDays\b/g,
  },
  {
    helper: 'toRadians',
    pattern: /\b(?:function|const|let|var)\s+(?:toRadians|toRad)\b/g,
  },
  {
    helper: 'haversineMeters',
    pattern: /\b(?:function|const|let|var)\s+haversine(?:Meters)?\b/g,
  },
  {
    helper: 'haversineKm',
    pattern: /\b(?:function|const|let|var)\s+haversineKm\b/g,
  },
];

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

function lineForIndex(source, index) {
  return source.slice(0, index).split('\n').length;
}

const violations = [];

for (const relativeRoot of roots) {
  for await (const filePath of walk(path.join(root, relativeRoot))) {
    const relativePath = path.relative(root, filePath);
    const source = await readFile(filePath, 'utf8');
    for (const { helper, pattern } of duplicatePatterns) {
      pattern.lastIndex = 0;
      const allowedPath = allowedImplementations.get(helper);
      for (const match of source.matchAll(pattern)) {
        if (relativePath === allowedPath) continue;
        violations.push({
          file: relativePath,
          line: lineForIndex(source, match.index ?? 0),
          helper,
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Duplicate helper implementations found:');
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line} duplicate ${violation.helper}; import the shared utility instead`);
  }
  process.exit(1);
}

console.log('Duplicate helper audit passed');
