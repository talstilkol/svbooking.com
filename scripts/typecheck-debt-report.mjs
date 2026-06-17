import { spawnSync } from 'node:child_process';
import path from 'node:path';

const FORMAT_VALUES = new Set(['text', 'json']);

function argValue(name, fallback = null) {
  const exact = `--${name}`;
  const prefixed = `${exact}=`;
  const index = process.argv.indexOf(exact);
  if (index !== -1) return process.argv[index + 1] || fallback;
  const match = process.argv.find((arg) => arg.startsWith(prefixed));
  return match ? match.slice(prefixed.length) : fallback;
}

function parseLimit(fallback) {
  const value = Number.parseInt(argValue('limit', String(fallback)), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseTypeScriptErrors(output) {
  const pattern = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/u;
  return output
    .split('\n')
    .map((line) => {
      const match = line.match(pattern);
      if (!match) return null;
      return {
        file: match[1],
        line: Number.parseInt(match[2], 10),
        column: Number.parseInt(match[3], 10),
        code: match[4],
        message: match[5],
      };
    })
    .filter(Boolean);
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function sortedCounts(map) {
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function buildReport({ limit }) {
  const tscPath = path.join(process.cwd(), 'node_modules/typescript/bin/tsc');
  const result = spawnSync(process.execPath, [tscPath, '--noEmit'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      NODE_ENV: process.env.NODE_ENV,
    },
  });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const errors = parseTypeScriptErrors(output);
  const byFile = new Map();
  const byCode = new Map();

  for (const error of errors) {
    increment(byFile, error.file);
    increment(byCode, error.code);
  }

  return {
    typecheckPassed: result.status === 0,
    status: result.status,
    totalErrors: errors.length,
    filesWithErrors: byFile.size,
    topFiles: sortedCounts(byFile).slice(0, limit),
    topCodes: sortedCounts(byCode).slice(0, limit),
    firstErrors: errors.slice(0, limit),
    nextActions: errors.length === 0
      ? ['Keep npm run typecheck green as a CI and release gate.']
      : [
        'Fix test mocks that no longer match runtime contracts.',
        'Prioritize high-count files first, then rerun npm run typecheck.',
        'Do not add npm run typecheck to CI until this report reaches zero errors.',
      ],
  };
}

function printText(report) {
  console.log('SV Booking typecheck debt report');
  console.log(`typecheckPassed: ${report.typecheckPassed}`);
  console.log(`totalErrors: ${report.totalErrors}`);
  console.log(`filesWithErrors: ${report.filesWithErrors}`);
  console.log('topFiles:');
  for (const item of report.topFiles) console.log(`- ${item.key}: ${item.count}`);
  console.log('topCodes:');
  for (const item of report.topCodes) console.log(`- ${item.key}: ${item.count}`);
  console.log('nextActions:');
  for (const action of report.nextActions) console.log(`- ${action}`);
}

const format = argValue('format', 'text');
const limit = parseLimit(12);

if (!FORMAT_VALUES.has(format)) {
  console.error(`Unsupported format: ${format}. Use text or json.`);
  process.exit(1);
}

const report = buildReport({ limit });

if (format === 'json') {
  console.log(JSON.stringify(report, null, 2));
} else {
  printText(report);
}
