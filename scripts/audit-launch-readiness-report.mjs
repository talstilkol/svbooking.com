import { spawnSync } from 'node:child_process';
import path from 'node:path';

const failures = [];
const script = path.join(process.cwd(), 'scripts/launch-readiness-report.mjs');
const secretSentinel = 'svbooking-audit-secret-must-not-print-0001';

function fail(message) {
  failures.push(message);
}

const result = spawnSync(
  process.execPath,
  ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', script, '--format=json', '--limit=4'],
  {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      ADMIN_API_SECRET: secretSentinel,
      CRON_SECRET: '',
    },
  },
);

if (result.status !== 0) {
  fail(`launch readiness report exited with status ${result.status}`);
}

if (`${result.stdout}\n${result.stderr}`.includes(secretSentinel)) {
  fail('launch readiness report printed a secret env value');
}

let body = null;
try {
  body = JSON.parse(result.stdout);
} catch {
  fail('launch readiness report did not print valid JSON');
}

if (body) {
  if (body.productionReady !== false) {
    fail('local launch readiness report must remain blocked without deployment env proof');
  }

  if (!Array.isArray(body.missingRequiredEnv) || !body.missingRequiredEnv.includes('CRON_SECRET')) {
    fail('launch readiness report must expose missing required env names');
  }

  if (body.missingRequiredEnv.includes('ADMIN_API_SECRET')) {
    fail('configured secret env names must not be reported missing');
  }

  if (body.catalogMedia?.totalActions !== 112) {
    fail('launch readiness report catalog media action count drifted from the current ledger');
  }

  if (body.catalogMedia?.reusedImageSources !== 6) {
    fail('launch readiness report reused media source count drifted from the current ledger');
  }

  if (!Array.isArray(body.topBlockers) || body.topBlockers.length > 4) {
    fail('launch readiness report must honor --limit for top blockers');
  }

  if (!Array.isArray(body.nextCommands) || !body.nextCommands.includes('npm run audit:production')) {
    fail('launch readiness report must include the production audit next command');
  }
}

if (failures.length > 0) {
  console.error('Launch readiness report audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Launch readiness report audit passed');
