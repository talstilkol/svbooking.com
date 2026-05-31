import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const summaryPath = process.argv[2] || process.env.COVERAGE_SUMMARY_PATH || path.join(root, 'coverage/coverage-summary.json');

const minimums = {
  lines: 92.75,
  statements: 88.6,
  functions: 92.2,
  branches: 80.15,
};

const failures = [];

function fail(message) {
  failures.push(message);
}

function pctFor(summary, metric) {
  const pct = summary?.total?.[metric]?.pct;
  return typeof pct === 'number' && Number.isFinite(pct) ? pct : null;
}

let summary;
try {
  summary = JSON.parse(await readFile(summaryPath, 'utf8'));
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`Coverage audit could not read ${summaryPath}: ${detail}`);
  console.error('Run npm run audit:coverage so Vitest writes coverage/coverage-summary.json before this audit reads it.');
  process.exit(1);
}

const observed = {};
for (const [metric, minimum] of Object.entries(minimums)) {
  const pct = pctFor(summary, metric);
  observed[metric] = pct;
  if (pct === null) {
    fail(`coverage summary is missing total.${metric}.pct`);
  } else if (pct < minimum) {
    fail(`${metric} coverage ${pct}% is below the ratchet floor ${minimum}%`);
  }
}

if (failures.length > 0) {
  console.error('Coverage audit failures:');
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log(
  `Coverage audit passed: lines ${observed.lines}%, statements ${observed.statements}%, functions ${observed.functions}%, branches ${observed.branches}%`
);
