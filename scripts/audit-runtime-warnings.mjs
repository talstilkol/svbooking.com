import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);

async function readProjectFile(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), 'utf8');
  } catch {
    failures.push(`Missing required runtime-warning file: ${relativePath}`);
    return '';
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
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
      continue;
    }
    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      yield fullPath;
    }
  }
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) {
      failures.push(`${relativePath} is missing runtime-warning guard: ${snippet}`);
    }
  }
}

const edgeRuntimePattern = /export\s+const\s+runtime\s*=\s*['"]edge['"]/u;

for await (const filePath of walk(path.join(root, 'app'))) {
  const relativePath = path.relative(root, filePath);
  const source = await readFile(filePath, 'utf8');
  if (edgeRuntimePattern.test(source)) {
    failures.push(`${relativePath} declares Edge Runtime and can disable static generation`);
  }
}

const [packageRaw, playwrightConfig, ci] = await Promise.all([
  readProjectFile('package.json'),
  readProjectFile('playwright.config.ts'),
  readProjectFile('.github/workflows/ci.yml'),
]);

let packageJson = null;
try {
  packageJson = JSON.parse(packageRaw);
} catch {
  failures.push('package.json is not valid JSON');
}

if (packageJson) {
  if (!packageJson.scripts?.['audit:runtime']) {
    failures.push('package.json is missing script: audit:runtime');
  }
  if (packageJson.scripts?.['test:e2e'] !== 'env -u NO_COLOR playwright test') {
    failures.push('package.json test:e2e must run through env -u NO_COLOR playwright test');
  }
  if (packageJson.scripts?.['test:e2e:ui'] !== 'env -u NO_COLOR playwright test --ui') {
    failures.push('package.json test:e2e:ui must run through env -u NO_COLOR playwright test --ui');
  }
}

requireIncludes(playwrightConfig, 'playwright.config.ts', [
  'webServerEnv',
  "key !== 'NO_COLOR'",
  "key !== 'FORCE_COLOR'",
  "key !== 'NODE_OPTIONS'",
  'env: webServerEnv',
]);

requireIncludes(ci, '.github/workflows/ci.yml', [
  'npm run audit:runtime',
  'npm run test:e2e',
]);

if (failures.length > 0) {
  console.error('Runtime warning audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Runtime warning audit passed');
