import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  KINDE_REQUIRED_ENV,
  OPTIONAL_ENV,
  PARTNER_PROVIDER_GROUPS,
  REQUIRED_ENV,
  STRICT_LAUNCH_ENV,
} from '../lib/production-readiness.mjs';

const root = process.cwd();
const failures = [];
const partnerProviderEnv = [...new Set(PARTNER_PROVIDER_GROUPS.flatMap((provider) => provider.env))];
const requiredForGoLive = [...new Set([...REQUIRED_ENV, ...KINDE_REQUIRED_ENV, ...partnerProviderEnv, ...STRICT_LAUNCH_ENV])];
const allDocumentedEnv = [...new Set([...requiredForGoLive, ...OPTIONAL_ENV])];

async function readProjectFile(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), 'utf8');
  } catch {
    failures.push(`Missing required env-contract file: ${relativePath}`);
    return '';
  }
}

function requireEnvLines(source, relativePath, names) {
  for (const name of names) {
    if (!new RegExp(`(^|\\n)${name}=`, 'u').test(source)) {
      failures.push(`${relativePath} is missing env template line: ${name}=`);
    }
  }
}

function requireMentions(source, relativePath, names) {
  for (const name of names) {
    if (!source.includes(name)) {
      failures.push(`${relativePath} is missing env mention: ${name}`);
    }
  }
}

const [envExample, readme, runbook, packageRaw, ci] = await Promise.all([
  readProjectFile('.env.example'),
  readProjectFile('README.md'),
  readProjectFile('PRODUCTION-RUNBOOK.md'),
  readProjectFile('package.json'),
  readProjectFile('.github/workflows/ci.yml'),
]);

requireEnvLines(envExample, '.env.example', allDocumentedEnv);
requireMentions(readme, 'README.md', requiredForGoLive);
requireMentions(runbook, 'PRODUCTION-RUNBOOK.md', requiredForGoLive);
requireMentions(packageRaw, 'package.json', ['"audit:env"']);
requireMentions(ci, '.github/workflows/ci.yml', ['npm run audit:env']);

if (failures.length > 0) {
  console.error('Environment contract audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Environment contract audit passed: ${allDocumentedEnv.length} env names checked`);
