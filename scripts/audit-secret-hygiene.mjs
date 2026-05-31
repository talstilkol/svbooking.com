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
const productionEnvNames = [...new Set([...REQUIRED_ENV, ...KINDE_REQUIRED_ENV, ...partnerProviderEnv, ...STRICT_LAUNCH_ENV, ...OPTIONAL_ENV])];

async function readProjectFile(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), 'utf8');
  } catch {
    failures.push(`Missing required secret-hygiene file: ${relativePath}`);
    return '';
  }
}

function auditEnvExample(source) {
  const envLinePattern = /^([A-Z][A-Z0-9_]+)=(.*)$/u;
  const lines = source.split('\n');
  for (const [index, line] of lines.entries()) {
    const match = line.match(envLinePattern);
    if (!match) continue;
    const [, name, value] = match;
    if (productionEnvNames.includes(name) && value.trim() !== '') {
      failures.push(`.env.example line ${index + 1} must keep ${name}= empty`);
    }
  }
}

function auditGitignore(source) {
  if (!/(^|\n)\.env\*(\n|$)/u.test(source)) {
    failures.push('.gitignore must ignore .env* files');
  }
  if (!/(^|\n)!\.env\.example(\n|$)/u.test(source)) {
    failures.push('.gitignore must explicitly allow .env.example');
  }
}

function auditDocs(readme, runbook) {
  if (!readme.includes('Do not commit secret values')) {
    failures.push('README.md must tell maintainers not to commit secret values');
  }
  if (!runbook.includes('not in git')) {
    failures.push('PRODUCTION-RUNBOOK.md must state deployment env values stay out of git');
  }
}

function auditCi(source) {
  if (source.includes('secrets.')) {
    failures.push('.github/workflows/ci.yml must not reference GitHub secrets in verification jobs');
  }
}

function auditPackageScripts(packageRaw) {
  let packageJson;
  try {
    packageJson = JSON.parse(packageRaw);
  } catch {
    failures.push('package.json is not valid JSON');
    return;
  }

  if (!packageJson.scripts?.['audit:secrets']) {
    failures.push('package.json is missing script: audit:secrets');
  }

  const scripts = Object.entries(packageJson.scripts || {});
  for (const [scriptName, command] of scripts) {
    for (const envName of productionEnvNames) {
      if (String(command).includes(`${envName}=`)) {
        failures.push(`package.json script ${scriptName} must not assign production env ${envName}`);
      }
    }
  }
}

const [envExample, gitignore, readme, runbook, ci, packageRaw] = await Promise.all([
  readProjectFile('.env.example'),
  readProjectFile('.gitignore'),
  readProjectFile('README.md'),
  readProjectFile('PRODUCTION-RUNBOOK.md'),
  readProjectFile('.github/workflows/ci.yml'),
  readProjectFile('package.json'),
]);

auditEnvExample(envExample);
auditGitignore(gitignore);
auditDocs(readme, runbook);
auditCi(ci);
auditPackageScripts(packageRaw);

if (failures.length > 0) {
  console.error('Secret hygiene audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Secret hygiene audit passed');
