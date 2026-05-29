#!/usr/bin/env node
/**
 * Lighthouse runner for the deployed site (task: verify real prod performance).
 *
 * Local LCP is dominated by cold-cache image optimization and is NOT
 * representative — always run this against the deployed Vercel URL.
 *
 * Usage:
 *   node scripts/lighthouse.mjs [url] [--min-perf 90] [--min-a11y 90] \
 *                               [--min-seo 95] [--min-bp 90]
 *
 * Requires network + Chrome; shells out to `npx lighthouse` (no added dep).
 * Exits non-zero if any category falls below its threshold.
 */
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const url = positional[0] || process.env.LIGHTHOUSE_URL || 'https://svbooking.com';

function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? Number(args[i + 1]) : fallback;
}

const thresholds = {
  performance: flag('min-perf', 90),
  accessibility: flag('min-a11y', 90),
  seo: flag('min-seo', 95),
  'best-practices': flag('min-bp', 90),
};

function runLighthouse() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      [
        '--yes',
        'lighthouse',
        url,
        '--quiet',
        '--chrome-flags=--headless=new --no-sandbox',
        '--only-categories=performance,accessibility,best-practices,seo',
        '--output=json',
        '--output-path=stdout',
      ],
      { encoding: 'utf8' }
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0 && !stdout) {
        reject(new Error(`lighthouse exited ${code}: ${stderr.slice(-500)}`));
        return;
      }
      resolve(stdout);
    });
  });
}

function pct(score) {
  return Math.round((score ?? 0) * 100);
}

async function main() {
  console.log(`\nRunning Lighthouse against: ${url}\n`);
  const raw = await runLighthouse();

  let report;
  try {
    report = JSON.parse(raw);
  } catch {
    console.error('Could not parse Lighthouse JSON output.');
    process.exit(2);
  }

  const cats = report.categories || {};
  const rows = Object.keys(thresholds).map((key) => {
    const score = pct(cats[key]?.score);
    const min = thresholds[key];
    const pass = score >= min;
    return { key, score, min, pass };
  });

  console.log('Category            Score   Min   Result');
  console.log('--------------------------------------------');
  for (const r of rows) {
    const name = r.key.padEnd(18);
    console.log(`${name} ${String(r.score).padStart(3)}   ${String(r.min).padStart(3)}   ${r.pass ? 'PASS' : 'FAIL'}`);
  }

  // Surface the headline metric for quick LCP review.
  const lcp = report.audits?.['largest-contentful-paint']?.displayValue;
  const cls = report.audits?.['cumulative-layout-shift']?.displayValue;
  if (lcp || cls) console.log(`\nLCP: ${lcp ?? 'n/a'}   CLS: ${cls ?? 'n/a'}`);

  const failed = rows.filter((r) => !r.pass);
  if (failed.length) {
    console.error(`\n${failed.length} category(ies) below threshold.`);
    process.exit(1);
  }
  console.log('\nAll categories meet thresholds.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(2);
});
