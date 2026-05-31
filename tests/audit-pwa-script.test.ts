import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.join(process.cwd(), 'scripts/audit-pwa.mjs');

async function createFixture(files: Record<string, string>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'sv-booking-pwa-'));
  for (const [relativePath, source] of Object.entries(files)) {
    const filePath = path.join(directory, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, source);
  }
  return directory;
}

function runAudit(cwd: string) {
  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, PATH: process.env.PATH, HOME: process.env.HOME },
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

const validFiles = {
  'app/manifest.ts': "export default function manifest() { return { display: 'standalone', icons: [{ src: '/icon-192.png' }, { src: '/icon-512.png' }] }; }\n",
  'public/icon-192.png': '',
  'public/icon-512.png': '',
  'app/offline/page.tsx': 'export default function Offline() { return null; }\n',
  'components/ServiceWorkerRegistration.tsx': "if (process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js');\n",
  'lib/pwa-readiness.js': [
    "import { isEnvConfigured } from './production-readiness.mjs';",
    '',
    'export function getPwaReadiness() {',
    "  return { serviceWorker: { pushHandler: 'service-worker-handler-ready' }, offline: { livePrices: 'network-required' }, push: { requiresUserPermission: true }, env: ['NEXT_PUBLIC_PUSH_PUBLIC_KEY', 'PUSH_PRIVATE_KEY'] };",
    '}',
    '',
  ].join('\n'),
  'public/sw.js': [
    "const OFFLINE_URL = '/offline';",
    "const PRIVATE_NAVIGATION_PREFIXES = ['/api', '/agents', '/dashboard', '/profile', '/favorites', '/trips'];",
    'function shouldBypassServiceWorker(request, url) {',
    "  if (request.method !== 'GET') return true;",
    '  if (url.origin !== self.location.origin) return true;',
    '  return PRIVATE_NAVIGATION_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));',
    '}',
    'function toSameOriginUrl() {}',
    "self.addEventListener('fetch', () => { /* network first stale-while-revalidate */ });",
    "self.addEventListener('push', () => showNotification());",
    "self.addEventListener('notificationclick', () => {});",
    '',
  ].join('\n'),
};

describe('PWA audit script', () => {
  it('passes when service worker bypasses private and non-GET requests', async () => {
    const cwd = await createFixture(validFiles);

    const result = runAudit(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('PWA audit passed');
  });

  it('fails when service worker private route bypass is removed', async () => {
    const cwd = await createFixture({
      ...validFiles,
      'public/sw.js': validFiles['public/sw.js'].replace("'/dashboard', ", ''),
    });

    const result = runAudit(cwd);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("public/sw.js is missing: '/dashboard'");
  });
});
