import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-rum.mjs');

async function writeFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-rum-audit-'));

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(directory, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, contents, 'utf8');
  }

  return directory;
}

function runAudit(cwd: string) {
  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

const packageJson = JSON.stringify({
  dependencies: {
    '@vercel/analytics': '1.0.0',
    '@vercel/speed-insights': '1.0.0',
  },
});

describe('RUM audit script', () => {
  it('passes when analytics, speed insights, and Core Web Vitals monitoring are wired', async () => {
    const cwd = await writeFixture({
      'package.json': packageJson,
      'app/layout.tsx': [
        'import { Analytics } from "@vercel/analytics/next";',
        'import { SpeedInsights } from "@vercel/speed-insights/next";',
        'const PerformanceMonitor = dynamic(() => import("@/components/PerformanceMonitor"));',
        'export default function RootLayout() { return <><PerformanceMonitor /><Analytics /><SpeedInsights /></>; }',
      ].join('\n'),
      'components/PerformanceMonitor.tsx': [
        'const metrics = ["lcp", "inp", "cls", "ttfb", "fcp"];',
        'const title = "Core Web Vitals";',
        'const disabled = process.env.NODE_ENV !== \'development\';',
        'observer.observe({ type: "largest-contentful-paint", buffered: true });',
        'observer.observe({ type: "event", buffered: true, durationThreshold: 16 });',
        'observer.observe({ type: "layout-shift", buffered: true });',
        'performance.getEntriesByType("navigation");',
      ].join('\n'),
    });

    const result = runAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('RUM audit passed');
  });

  it('fails when production analytics wiring is removed', async () => {
    const cwd = await writeFixture({
      'package.json': packageJson,
      'app/layout.tsx': 'const PerformanceMonitor = "PerformanceMonitor";',
      'components/PerformanceMonitor.tsx': [
        'const metrics = ["lcp", "inp", "cls", "ttfb", "fcp"];',
        'const title = "Core Web Vitals";',
        'const disabled = process.env.NODE_ENV !== \'development\';',
        'observer.observe({ type: "largest-contentful-paint", buffered: true });',
        'observer.observe({ type: "event", buffered: true, durationThreshold: 16 });',
        'observer.observe({ type: "layout-shift", buffered: true });',
        'performance.getEntriesByType("navigation");',
      ].join('\n'),
    });

    const result = runAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('app/layout.tsx is missing: @vercel/analytics/next');
    expect(result.stderr).toContain('app/layout.tsx is missing: <SpeedInsights />');
  });
});
