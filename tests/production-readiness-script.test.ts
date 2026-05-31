import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';

const SCRIPT = 'scripts/audit-production-readiness.mjs';

function runAudit(env: Record<string, string | undefined> = {}) {
  try {
    const stdout = execFileSync(process.execPath, ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', SCRIPT], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        ...env,
      } as unknown as NodeJS.ProcessEnv,
    });
    return { status: 0, stdout };
  } catch (error) {
    const err = error as { status?: number; stdout?: string };
    return { status: err.status || 1, stdout: err.stdout || '' };
  }
}

describe('production readiness audit script', () => {
  it('reports missing env names without printing secret values', () => {
    const result = runAudit({
      ADMIN_API_SECRET: 'must-not-print',
      CRON_SECRET: '',
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
    });
    const body = JSON.parse(result.stdout);

    expect(result.status).toBe(0);
    expect(body.productionReady).toBe(false);
    expect(body.blockers).toContain('Missing required env: CRON_SECRET');
    expect(body.blockers).toContain('Missing Kinde env: KINDE_CLIENT_ID');
    expect(result.stdout).not.toContain('must-not-print');
  });

  it('fails strict mode when required env is missing', () => {
    const result = runAudit({ PRODUCTION_READINESS_STRICT: '1' });
    const body = JSON.parse(result.stdout);

    expect(result.status).toBe(1);
    expect(body.strict).toBe(true);
    expect(body.productionReady).toBe(false);
  });

  it('fails strict mode with required env while launch services and catalog media are not ready', () => {
    const result = runAudit({
      PRODUCTION_READINESS_STRICT: '1',
      ADMIN_API_SECRET: 'svbooking-admin-secret-0001',
      CRON_SECRET: 'svbooking-cron-secret-0001',
      UPSTASH_REDIS_REST_URL: 'https://redis.svbooking.com',
      UPSTASH_REDIS_REST_TOKEN: 'svbooking-redis-token-0001',
      KINDE_CLIENT_ID: 'svbooking-kinde-client-id-0001',
      KINDE_CLIENT_SECRET: 'svbooking-kinde-client-secret-0001',
      KINDE_ISSUER_URL: 'https://auth.svbooking.com',
      KINDE_SITE_URL: 'https://svbooking.com',
      KINDE_POST_LOGOUT_REDIRECT_URL: 'https://svbooking.com',
      KINDE_POST_LOGIN_REDIRECT_URL: 'https://svbooking.com/dashboard',
      SERPAPI_KEY: 'svbooking-serpapi-key-0001',
    });
    const body = JSON.parse(result.stdout);

    expect(result.status).toBe(1);
    expect(body.strict).toBe(true);
    expect(body.productionReady).toBe(false);
    expect(body.catalogMediaQuality.status).toBe('partial');
    expect(body.launchServices.reviews.configured).toBe(false);
    expect(body.launchServices.priceAlerts.deliveryConfigured).toBe(false);
    expect(body.launchServices.priceAlerts.unsubscribeConfigured).toBe(false);
    expect(body.launchServices.opsAlerts.deliveryConfigured).toBe(false);
    expect(body.launchServices.push.configured).toBe(false);
    expect(body.blockers).toContain('Catalog media quality is not launch-ready');
    expect(body.blockers).toContain('Licensed review/property provider is not configured');
    expect(body.blockers).toContain('Price alert webhook delivery is not configured');
    expect(body.blockers).toContain('Price alert unsubscribe secret is not configured');
    expect(body.blockers).toContain('Ops alert webhook delivery is not configured');
    expect(body.blockers).toContain('Web push keys are not configured');
    expect(body.blockers.some((blocker: string) => blocker.includes('catalog image sources require approved license metadata or replacement'))).toBe(true);
    expect(result.stdout).not.toContain('svbooking-admin-secret-0001');
    expect(result.stdout).not.toContain('svbooking-kinde-client-secret-0001');
    expect(result.stdout).not.toContain('svbooking-serpapi-key-0001');
  });

  it('requires complete multi-env provider groups', () => {
    const result = runAudit({
      PRODUCTION_READINESS_STRICT: '1',
      ADMIN_API_SECRET: 'svbooking-admin-secret-0001',
      CRON_SECRET: 'svbooking-cron-secret-0001',
      UPSTASH_REDIS_REST_URL: 'https://redis.svbooking.com',
      UPSTASH_REDIS_REST_TOKEN: 'svbooking-redis-token-0001',
      KINDE_CLIENT_ID: 'svbooking-kinde-client-id-0001',
      KINDE_CLIENT_SECRET: 'svbooking-kinde-client-secret-0001',
      KINDE_ISSUER_URL: 'https://auth.svbooking.com',
      KINDE_SITE_URL: 'https://svbooking.com',
      KINDE_POST_LOGOUT_REDIRECT_URL: 'https://svbooking.com',
      KINDE_POST_LOGIN_REDIRECT_URL: 'https://svbooking.com/dashboard',
      AMADEUS_CLIENT_ID: 'svbooking-amadeus-client-id-0001',
      AMADEUS_CLIENT_SECRET: '',
    });
    const body = JSON.parse(result.stdout);

    expect(result.status).toBe(1);
    expect(body.productionReady).toBe(false);
    expect(body.blockers).toContain('No complete paid/partner pricing provider env group is configured');
    expect(body.pricingProviders.find((provider: { name: string }) => provider.name === 'Amadeus').configured).toBe(false);
  });

  it('fails strict mode for placeholder or weak env values without printing them', () => {
    const result = runAudit({
      PRODUCTION_READINESS_STRICT: '1',
      ADMIN_API_SECRET: 'change-me',
      CRON_SECRET: 'short',
      UPSTASH_REDIS_REST_URL: 'http://redis.svbooking.com',
      UPSTASH_REDIS_REST_TOKEN: 'svbooking-redis-token-0001',
      KINDE_CLIENT_ID: 'svbooking-kinde-client-id-0001',
      KINDE_CLIENT_SECRET: 'svbooking-kinde-client-secret-0001',
      KINDE_ISSUER_URL: 'https://user:pass@auth.svbooking.com',
      KINDE_SITE_URL: 'https://svbooking.com',
      KINDE_POST_LOGOUT_REDIRECT_URL: 'https://svbooking.com',
      KINDE_POST_LOGIN_REDIRECT_URL: 'https://svbooking.com/dashboard',
      SERPAPI_KEY: 'svbooking-serpapi-key-0001',
    });
    const body = JSON.parse(result.stdout);

    expect(result.status).toBe(1);
    expect(body.productionReady).toBe(false);
    expect(body.blockers).toContain('Invalid required env: ADMIN_API_SECRET (placeholder value is not allowed)');
    expect(body.blockers).toContain('Invalid required env: CRON_SECRET (must be at least 16 characters)');
    expect(body.blockers).toContain('Invalid required env: UPSTASH_REDIS_REST_URL (must be an HTTPS URL without credentials)');
    expect(body.blockers).toContain('Invalid Kinde env: KINDE_ISSUER_URL (must be an HTTPS URL without credentials)');
    expect(result.stdout).not.toContain('change-me');
    expect(result.stdout).not.toContain('short');
  });
});
