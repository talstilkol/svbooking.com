import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3456';
const useExistingServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const webServerEnv = {
  ...Object.fromEntries(
    Object.entries(process.env).filter(([key, value]) => (
      typeof value === 'string' &&
      key !== 'NO_COLOR' &&
      key !== 'FORCE_COLOR' &&
      key !== 'NODE_OPTIONS'
    )),
  ),
  KINDE_ISSUER_URL: process.env.KINDE_ISSUER_URL || 'https://auth.svbooking.test',
} as Record<string, string>;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  expect: { timeout: 10000 },
  retries: 1,
  workers: 1,
  use: {
    baseURL,
    headless: true,
    serviceWorkers: 'block',
  },
  webServer: useExistingServer ? undefined : {
    command: 'npm run build && npm run start -- --port 3456',
    env: webServerEnv,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
