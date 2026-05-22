import { spawnSync } from 'node:child_process';

const strict = process.argv.includes('--strict') || process.env.RELEASE_STATE_STRICT === '1';

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(`git ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`);
  }

  return result.stdout || '';
}

function normalizePath(statusLine) {
  const tabIndex = statusLine.indexOf('\t');
  if (tabIndex >= 0) return statusLine.slice(tabIndex + 1).trim();
  return statusLine.slice(3).trim();
}

function statusCode(line) {
  return line.slice(0, 2);
}

function stagedStatus(status) {
  return status[0] || ' ';
}

function unstagedStatus(status) {
  return status[1] || ' ';
}

function classify(pathname) {
  if (pathname.startsWith('tests/') || pathname.startsWith('e2e/')) return 'tests';
  if (pathname.startsWith('scripts/')) return 'scripts';
  if (pathname.endsWith('.md') || pathname === '.env.example') return 'docs';
  if (pathname.startsWith('app/api/')) return 'api';
  if (pathname.startsWith('app/')) return 'app';
  if (pathname.startsWith('components/')) return 'components';
  if (pathname.startsWith('lib/')) return 'lib';
  if (pathname.startsWith('.github/')) return 'ci';
  if (pathname.startsWith('.playwright-mcp/') || pathname.startsWith('test-results/') || pathname.startsWith('playwright-report/')) {
    return 'generated-artifacts';
  }
  if (pathname === 'package.json' || pathname === 'package-lock.json') return 'package';
  return 'other';
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

let porcelain;
let shortstat;
let branch;

try {
  porcelain = runGit(['status', '--porcelain=v1']);
  shortstat = runGit(['diff', '--shortstat']).trim();
  branch = runGit(['branch', '--show-current']).trim() || 'detached';
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

const lines = porcelain.split('\n').map((line) => line.trimEnd()).filter(Boolean);
const entries = lines.map((line) => {
  const pathname = normalizePath(line);
  return {
    status: statusCode(line),
    path: pathname,
    category: classify(pathname),
  };
});

const deleted = entries.filter((entry) => entry.status.includes('D'));
const untracked = entries.filter((entry) => entry.status === '??');
const modifiedOrStaged = entries.filter((entry) => entry.status !== '??' && !entry.status.includes('D'));
const trackedChanged = entries.filter((entry) => entry.status !== '??');
const staged = trackedChanged.filter((entry) => stagedStatus(entry.status) !== ' ');
const unstaged = trackedChanged.filter((entry) => unstagedStatus(entry.status) !== ' ');
const generatedArtifacts = entries.filter((entry) => entry.category === 'generated-artifacts');
const deletedPaths = deleted.map((entry) => entry.path);
const generatedArtifactPaths = generatedArtifacts.map((entry) => entry.path);

const summary = {
  clean: entries.length === 0,
  strict,
  branch,
  totalChangedPaths: entries.length,
  modifiedOrStaged: modifiedOrStaged.length,
  trackedChanged: trackedChanged.length,
  staged: staged.length,
  unstaged: unstaged.length,
  deleted: deleted.length,
  deletedPaths,
  untracked: untracked.length,
  generatedArtifacts: generatedArtifacts.length,
  generatedArtifactPaths,
  categories: countBy(entries, (entry) => entry.category),
  statuses: countBy(entries, (entry) => entry.status),
  shortstat: shortstat || null,
  blockers: [
    ...(entries.length > 0 ? ['Worktree has uncommitted or untracked paths'] : []),
    ...(deleted.length > 0 ? [`${deleted.length} deleted tracked paths require explicit review`] : []),
    ...(generatedArtifacts.length > 0 ? [`${generatedArtifacts.length} generated artifact paths should not be released unless intentionally tracked`] : []),
  ],
  nextActions: entries.length > 0
    ? [
        'Review git status --short and git diff --stat.',
        'Separate unrelated changes into reviewable commits.',
        'Run npm run release:state:strict after staging/committing intended changes.',
      ]
    : ['Worktree is clean; release-state strict gate can pass.'],
};

console.log(JSON.stringify(summary, null, 2));

if (strict && !summary.clean) {
  process.exit(1);
}
