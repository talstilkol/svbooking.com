import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];

async function readProjectFile(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), 'utf8');
  } catch {
    failures.push(`Missing required master-plan audit file: ${relativePath}`);
    return '';
  }
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) failures.push(`${relativePath} is missing: ${snippet}`);
  }
}

function extractSection(source, heading) {
  const start = source.indexOf(`## ${heading}`);
  if (start === -1) return '';
  const next = source.indexOf('\n## ', start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

function checklistItems(source, marker) {
  return Array.from(source.matchAll(new RegExp(`^- \\[${marker}\\] (.+)$`, 'gm')))
    .map((match) => match[1].trim());
}

const [masterPlan, packageRaw, ci, readme, auditReport] = await Promise.all([
  readProjectFile('MASTER-PLAN.md'),
  readProjectFile('package.json'),
  readProjectFile('.github/workflows/ci.yml'),
  readProjectFile('README.md'),
  readProjectFile('AUDIT-REPORT.md'),
]);

let packageJson;
try {
  packageJson = JSON.parse(packageRaw);
} catch {
  failures.push('package.json is not valid JSON');
}

if (!packageJson?.scripts?.['audit:master-plan']) {
  failures.push('package.json is missing script: audit:master-plan');
}

requireIncludes(ci, '.github/workflows/ci.yml', ['npm run audit:master-plan']);
requireIncludes(readme, 'README.md', ['npm run audit:master-plan']);
requireIncludes(auditReport, 'AUDIT-REPORT.md', [
  '196 test files, 1183 tests passed',
  'Master-plan honesty audit',
]);

requireIncludes(masterPlan, 'MASTER-PLAN.md', [
  '## Checked Backlog Re-Audit',
  '## Unfinished Launch Task Queue',
  'FAKED | None identified',
  '196 files / 1183 tests passed',
]);

const checkedSection = extractSection(masterPlan, 'Checked Backlog Re-Audit');
const unfinishedSection = extractSection(masterPlan, 'Unfinished Launch Task Queue');

if (!checkedSection) failures.push('MASTER-PLAN.md is missing Checked Backlog Re-Audit section');
if (!unfinishedSection) failures.push('MASTER-PLAN.md is missing Unfinished Launch Task Queue section');

for (const item of checklistItems(masterPlan, 'x')) {
  if (!checkedSection.includes(item)) {
    failures.push(`Checked backlog item is missing from re-audit table: ${item}`);
  }
}

for (const item of checklistItems(masterPlan, ' ')) {
  if (!unfinishedSection.includes(item)) {
    failures.push(`Open backlog item is missing from unfinished task queue: ${item}`);
  }
}

for (const forbidden of [
  '| Backlog P0 | Configure real deployment env | DONE |',
  '| Backlog P0 | Run strict production audit in deployment | DONE |',
  '| Backlog P0 | Verify deployed cron routes | DONE |',
  '| Backlog P0 | Configure persistent KV and verify health reports persistent cache | DONE |',
  '| Backlog P0 | Configure approved pricing partner and verify provider-returned rates | DONE |',
  '| Backlog P0 | Configure licensed review/property provider | DONE |',
  '| Backlog P3 | Capture partner terms, affiliate/legal review, and licensed content display signoff | DONE |',
]) {
  if (masterPlan.includes(forbidden)) {
    failures.push(`External launch blocker must not be marked DONE without production proof: ${forbidden}`);
  }
}

if (failures.length > 0) {
  console.error('Master-plan audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Master-plan audit passed');
