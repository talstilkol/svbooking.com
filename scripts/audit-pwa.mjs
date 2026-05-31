import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];

async function readProjectFile(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

async function requireFile(relativePath) {
  try {
    await access(path.join(root, relativePath));
  } catch {
    failures.push(`Missing required PWA file: ${relativePath}`);
  }
}

function requireIncludes(source, relativePath, snippets) {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) failures.push(`${relativePath} is missing: ${snippet}`);
  }
}

await requireFile('app/manifest.ts');
await requireFile('public/sw.js');
await requireFile('public/icon-192.png');
await requireFile('public/icon-512.png');
await requireFile('app/offline/page.tsx');
await requireFile('components/ServiceWorkerRegistration.tsx');
await requireFile('lib/pwa-readiness.js');

const manifest = await readProjectFile('app/manifest.ts');
requireIncludes(manifest, 'app/manifest.ts', [
  'display',
  'standalone',
  '/icon-192.png',
  '/icon-512.png',
]);

const serviceWorker = await readProjectFile('public/sw.js');
requireIncludes(serviceWorker, 'public/sw.js', [
  'OFFLINE_URL',
  '/offline',
  'PRIVATE_NAVIGATION_PREFIXES',
  "request.method !== 'GET'",
  'function shouldBypassServiceWorker',
  "'/api'",
  "'/agents'",
  "'/dashboard'",
  "'/profile'",
  "'/favorites'",
  "'/trips'",
  'network first',
  'stale-while-revalidate',
  'function toSameOriginUrl',
  'url.origin !== self.location.origin',
  "self.addEventListener('push'",
  'showNotification',
  "self.addEventListener('notificationclick'",
]);

const registration = await readProjectFile('components/ServiceWorkerRegistration.tsx');
requireIncludes(registration, 'components/ServiceWorkerRegistration.tsx', [
  "process.env.NODE_ENV === 'production'",
  "navigator.serviceWorker.register('/sw.js')",
]);

const readiness = await readProjectFile('lib/pwa-readiness.js');
requireIncludes(readiness, 'lib/pwa-readiness.js', [
  "import { isEnvConfigured } from './env-config.mjs';",
  'getPwaReadiness',
  'NEXT_PUBLIC_PUSH_PUBLIC_KEY',
  'PUSH_PRIVATE_KEY',
  'livePrices',
  'network-required',
  'pushHandler',
  'requiresUserPermission',
  'service-worker-handler-ready',
]);

if (failures.length > 0) {
  console.error('PWA audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('PWA audit passed');
