import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const extensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx']);
const ignoredDirectories = new Set(['.git', '.next', 'node_modules', 'coverage', 'test-results', 'playwright-report']);

function fail(message) {
  failures.push(message);
}

async function readProjectFile(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), 'utf8');
  } catch {
    fail(`Missing required API error-cache file: ${relativePath}`);
    return '';
  }
}

async function collectSourceFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    const relativePath = path.relative(root, fullPath);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...await collectSourceFiles(fullPath));
      }
      continue;
    }
    if (extensions.has(path.extname(entry.name))) files.push(relativePath);
  }
  return files;
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split('\n').length;
}

function extractResponseJsonCalls(source) {
  const calls = [];
  let index = 0;
  while ((index = source.indexOf('Response.json(', index)) !== -1) {
    const start = index;
    let cursor = index + 'Response.json('.length;
    let depth = 1;
    let quote = null;
    let escaped = false;

    while (cursor < source.length && depth > 0) {
      const char = source[cursor];

      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === quote) {
          quote = null;
        }
        cursor++;
        continue;
      }

      if (char === "'" || char === '"' || char === '`') {
        quote = char;
      } else if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
      }
      cursor++;
    }

    calls.push({ start, text: source.slice(start, cursor) });
    index = cursor;
  }
  return calls;
}

function hasErrorBody(callText) {
  return /\{\s*(?:status\s*:\s*['"]error['"]\s*,\s*)?error\s*:/u.test(callText);
}

function hasNoStoreHeader(callText) {
  return callText.includes('NO_STORE_HEADERS')
    || (callText.includes('Cache-Control') && callText.includes('no-store'));
}

function auditSource(relativePath, source) {
  for (const call of extractResponseJsonCalls(source)) {
    if (!hasErrorBody(call.text)) continue;
    if (hasNoStoreHeader(call.text)) continue;
    fail(`${relativePath}:${lineNumberFor(source, call.start)} error Response.json must include Cache-Control: no-store`);
  }
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) fail(`${relativePath} is missing: ${snippet}`);
  }
}

function auditPackage(packageRaw) {
  let packageJson;
  try {
    packageJson = JSON.parse(packageRaw);
  } catch {
    fail('package.json is not valid JSON');
    return;
  }
  if (!packageJson.scripts?.['audit:api-errors']) {
    fail('package.json is missing script: audit:api-errors');
  }
}

const apiFiles = await collectSourceFiles(path.join(root, 'app/api'));
await Promise.all(apiFiles.map(async (relativePath) => {
  const source = await readProjectFile(relativePath);
  auditSource(relativePath, source);
}));

const [
  packageRaw,
  ci,
  readme,
  runbook,
  compareRoute,
  clickRoute,
  priceHistoryRoute,
] = await Promise.all([
  readProjectFile('package.json'),
  readProjectFile('.github/workflows/ci.yml'),
  readProjectFile('README.md'),
  readProjectFile('PRODUCTION-RUNBOOK.md'),
  readProjectFile('app/api/compare/route.js'),
  readProjectFile('app/api/click/route.js'),
  readProjectFile('app/api/price-history/route.js'),
]);

auditPackage(packageRaw);
requireIncludes(ci, '.github/workflows/ci.yml', ['npm run audit:api-errors']);
requireIncludes(readme, 'README.md', ['npm run audit:api-errors']);
requireIncludes(runbook, 'PRODUCTION-RUNBOOK.md', ['npm run audit:api-errors']);

for (const [relativePath, source] of [
  ['app/api/compare/route.js', compareRoute],
  ['app/api/click/route.js', clickRoute],
  ['app/api/price-history/route.js', priceHistoryRoute],
]) {
  requireIncludes(source, relativePath, ['NO_STORE_HEADERS']);
}

if (failures.length > 0) {
  console.error('API error cache audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('API error cache audit passed');
