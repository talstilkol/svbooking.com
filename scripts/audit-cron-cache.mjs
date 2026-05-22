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
    fail(`Missing required cron-cache file: ${relativePath}`);
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

function hasNoStoreHeader(callText) {
  return callText.includes('NO_STORE_HEADERS')
    || (callText.includes('Cache-Control') && callText.includes('no-store'));
}

function auditCronRoute(relativePath, source) {
  if (!source.includes('verifyCronAuth')) return;

  const calls = extractResponseJsonCalls(source);
  for (const call of calls) {
    if (!hasNoStoreHeader(call.text)) {
      fail(`${relativePath}:${lineNumberFor(source, call.start)} cron Response.json must include Cache-Control: no-store`);
    }
  }
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) fail(`${relativePath} is missing: ${snippet}`);
  }
}

function rejectIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (source.includes(snippet)) fail(`${relativePath} must not contain: ${snippet}`);
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
  if (!packageJson.scripts?.['audit:cron-cache']) {
    fail('package.json is missing script: audit:cron-cache');
  }
}

const apiFiles = await collectSourceFiles(path.join(root, 'app/api'));
await Promise.all(apiFiles.map(async (relativePath) => {
  const source = await readProjectFile(relativePath);
  auditCronRoute(relativePath, source);
}));

const [
  packageRaw,
  ci,
  readme,
  runbook,
  agentUtils,
  cronAuthTest,
  priceCacheRoute,
  healthMonitorRoute,
  orchestrateRoute,
] = await Promise.all([
  readProjectFile('package.json'),
  readProjectFile('.github/workflows/ci.yml'),
  readProjectFile('README.md'),
  readProjectFile('PRODUCTION-RUNBOOK.md'),
  readProjectFile('lib/agent-utils.js'),
  readProjectFile('tests/cron-auth.test.ts'),
  readProjectFile('app/api/agents/auto/price-cache/route.js'),
  readProjectFile('app/api/agents/auto/health-monitor/route.js'),
  readProjectFile('app/api/agents/auto/orchestrate/route.js'),
]);

auditPackage(packageRaw);
requireIncludes(ci, '.github/workflows/ci.yml', ['npm run audit:cron-cache']);
requireIncludes(readme, 'README.md', ['npm run audit:cron-cache']);
requireIncludes(runbook, 'PRODUCTION-RUNBOOK.md', ['npm run audit:cron-cache']);

requireIncludes(agentUtils, 'lib/agent-utils.js', [
  "import { timingSafeEqual } from 'node:crypto';",
  'timingSafeSecretEqual',
  'bearerTokenFromRequest',
  'Buffer.alloc',
  'timingSafeEqual(paddedCandidate, paddedExpected)',
  'verifyCronAuth',
]);
rejectIncludes(agentUtils, 'lib/agent-utils.js', [
  'authHeader === `Bearer ${cronSecret}`',
]);

requireIncludes(cronAuthTest, 'tests/cron-auth.test.ts', [
  'accepts valid cron bearer tokens through timing-safe comparison',
  'rejects malformed and different-length cron bearer tokens without authenticating',
  'CRON_SECRET not configured',
]);

for (const [relativePath, source] of [
  ['app/api/agents/auto/price-cache/route.js', priceCacheRoute],
  ['app/api/agents/auto/health-monitor/route.js', healthMonitorRoute],
  ['app/api/agents/auto/orchestrate/route.js', orchestrateRoute],
]) {
  requireIncludes(source, relativePath, ['verifyCronAuth', 'Cache-Control', 'no-store']);
}

if (failures.length > 0) {
  console.error('Cron cache audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Cron cache audit passed');
