import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

async function readProjectFile(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), 'utf8');
  } catch {
    fail(`Missing required deployment-smoke file: ${relativePath}`);
    return '';
  }
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) {
      fail(`${relativePath} is missing deployment-smoke guard: ${snippet}`);
    }
  }
}

const [packageRaw, ci, readme, runbook, smokeScript] = await Promise.all([
  readProjectFile('package.json'),
  readProjectFile('.github/workflows/ci.yml'),
  readProjectFile('README.md'),
  readProjectFile('PRODUCTION-RUNBOOK.md'),
  readProjectFile('scripts/deployment-smoke.mjs'),
]);

requireIncludes(packageRaw, 'package.json', [
  '"audit:deployment-smoke"',
  '"smoke:deployment"',
]);

requireIncludes(ci, '.github/workflows/ci.yml', [
  'npm run audit:deployment-smoke',
]);

requireIncludes(readme, 'README.md', [
  'npm run audit:deployment-smoke',
  'SITE_URL=https://your-deployment.example npm run smoke:deployment',
]);

requireIncludes(runbook, 'PRODUCTION-RUNBOOK.md', [
  'npm run audit:deployment-smoke',
  'SITE_URL=https://your-deployment.example npm run smoke:deployment',
  'SMOKE_RUN_CRON=1',
]);

requireIncludes(smokeScript, 'scripts/deployment-smoke.mjs', [
  'SITE_URL',
  '/api/health',
  '/api/catalog/stats',
  '/api/i18n?locale=en',
  '/api/reviews/g187147-d188728',
  '/api/property-content/g187147-d188728',
  '/api/ops/scorecard',
  '/api/agents/providers/coverage',
  '/api/agents/auto/orchestrate',
  'SMOKE_RUN_CRON',
]);

if (failures.length > 0) {
  console.error('Deployment smoke audit failures:');
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log('Deployment smoke audit passed');
