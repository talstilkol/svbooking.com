import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getHealth } from '@/app/api/health/route';
import { GET as getAgentHealth } from '@/app/api/agents/health-check/route';
import { getHeatmap, getRates } from '@/lib/xotelo';

vi.mock('@/lib/xotelo', () => ({
  getRates: vi.fn(async () => ({ rates: [] })),
  getHeatmap: vi.fn(async () => ({ rates: [] })),
}));

vi.mock('@/lib/kv', () => {
  const store = new Map<string, unknown>();
  return {
    kv: {
      get: vi.fn(async (key: string) => store.get(key) || null),
      set: vi.fn(async (key: string, value: unknown) => store.set(key, value)),
      setWithTTL: vi.fn(async (key: string, value: unknown) => store.set(key, value)),
      del: vi.fn(async (key: string) => store.delete(key)),
      mget: vi.fn(async (keys: string[]) => keys.map((key) => store.get(key) || null)),
      keys: vi.fn(async () => []),
      isConfigured: vi.fn(async () => false),
    },
    __store: store,
  };
});

describe('health APIs', () => {
  beforeEach(async () => {
    const mod = await import('@/lib/kv') as Record<string, unknown>;
    (mod.__store as Map<string, unknown>).clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns a no-store readiness snapshot without leaking secrets', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-secret-health');

    const response = await getHealth();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.service).toBe('sv-booking');
    expect(body.ready).toBe(true);
    expect(body.launchReadiness.model).toBe('meta-search');
    expect(body.launchReadiness.dataBudget).toBe('free-only');
    expect(body.launchReadiness.freeOnlyLaunchReady).toBe(false);
    expect(body.launchReadiness.globalParityReady).toBe(false);
    expect(body.launchReadiness.blockers).toContain('Persistent KV cache is not configured');
    expect(body.checks.catalog.hotels).toBeGreaterThanOrEqual(500);
    expect(body.checks.providers.available).toBeGreaterThan(0);
    expect(body.checks.alerts.deliveryStatus).toBe('not-configured');
    expect(body.checks.alerts.unsubscribeStatus).toBe('not-configured');
    expect(body.checks.opsAlerts.deliveryStatus).toBe('not-configured');
    expect(body.checks.opsAlerts.evaluateEndpoint).toBe('/api/ops/alerts/evaluate');
    expect(body.checks.reviews.status).toBe('unavailable');
    expect(body.checks.i18n.rtlSupported).toBe(true);
    expect(body.checks.pwa.installable).toBe(true);
    expect(body.checks.pwa.push.status).toBe('not-configured');
    expect(body.checks.retention.status).toBe('defined');
    expect(body.checks.retention.rawSecretStorage).toBe('not-allowed');
    expect(body.checks.privacy.status).toBe('available');
    expect(body.checks.privacy.deletionRequiresConfirmationHeader).toBe(true);
    expect(JSON.stringify(body)).not.toContain('admin-secret-health');
  });

  it('marks free-only launch ready only when durable cache, auth, and partner provider env are configured', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'svbooking-admin-secret-health-0001');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.svbooking.com');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'svbooking-redis-token-health-0001');
    vi.stubEnv('KINDE_CLIENT_ID', 'svbooking-kinde-client-id-0001');
    vi.stubEnv('KINDE_CLIENT_SECRET', 'svbooking-kinde-client-secret-0001');
    vi.stubEnv('KINDE_ISSUER_URL', 'https://auth.svbooking.com');
    vi.stubEnv('KINDE_SITE_URL', 'https://svbooking.com');
    vi.stubEnv('KINDE_POST_LOGOUT_REDIRECT_URL', 'https://svbooking.com');
    vi.stubEnv('KINDE_POST_LOGIN_REDIRECT_URL', 'https://svbooking.com/dashboard');
    vi.stubEnv('SERPAPI_KEY', 'svbooking-serpapi-key-health-0001');

    const response = await getHealth();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.launchReadiness.freeOnlyLaunchReady).toBe(true);
    expect(body.launchReadiness.globalParityReady).toBe(false);
    expect(body.checks.security.kindeConfigured).toBe(true);
    expect(body.checks.providers.partnerConfigured).toBe(true);
    expect(JSON.stringify(body)).not.toContain('svbooking-redis-token-health-0001');
    expect(JSON.stringify(body)).not.toContain('svbooking-kinde-client-secret-0001');
    expect(JSON.stringify(body)).not.toContain('svbooking-serpapi-key-health-0001');
  });

  it('keeps launch readiness blocked when Kinde auth is missing', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-secret-health');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.svbooking.com');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'svbooking-redis-token-health-0001');
    vi.stubEnv('SERPAPI_KEY', 'svbooking-serpapi-key-health-0001');

    const response = await getHealth();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.launchReadiness.freeOnlyLaunchReady).toBe(false);
    expect(body.checks.security.kindeConfigured).toBe(false);
    expect(body.launchReadiness.blockers).toContain('Kinde auth environment is not configured');
    expect(body.warnings).toContain('Kinde auth environment is not configured');
  });

  it('accepts cron auth and KV REST env as production readiness inputs without exposing values', async () => {
    vi.stubEnv('CRON_SECRET', 'svbooking-cron-secret-health-0001');
    vi.stubEnv('KV_REST_API_URL', 'https://redis.svbooking.com');
    vi.stubEnv('KV_REST_API_TOKEN', 'svbooking-kv-token-health-0001');

    const response = await getHealth();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checks.security.adminAuthConfigured).toBe(true);
    expect(body.checks.cache).toMatchObject({
      durable: true,
      mode: 'persistent',
    });
    expect(body.warnings).not.toContain('Admin bearer auth secret is not configured');
    expect(body.warnings).not.toContain('Persistent KV cache is not configured');
    expect(JSON.stringify(body)).not.toContain('svbooking-cron-secret-health-0001');
    expect(JSON.stringify(body)).not.toContain('svbooking-kv-token-health-0001');
  });

  it('reports healthy status with non-launch warnings when local auth and providers are available', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-secret-health');

    const response = await getHealth();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ready).toBe(true);
    expect(body.status).toBe('degraded');
    expect(body.warnings).toEqual(expect.arrayContaining([
      'Kinde auth environment is not configured',
      'Persistent KV cache is not configured',
    ]));
  });

  it('reports alert delivery configured without leaking webhook secrets', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-secret-health');
    vi.stubEnv('PRICE_ALERT_WEBHOOK_URL', 'https://alerts.example.com/hook');
    vi.stubEnv('PRICE_ALERT_WEBHOOK_SECRET', 'alert-secret-value');

    const response = await getHealth();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checks.alerts.deliveryConfigured).toBe(true);
    expect(body.checks.alerts.deliveryStatus).toBe('configured');
    expect(body.checks.alerts.unsubscribeConfigured).toBe(false);
    expect(body.checks.opsAlerts.deliveryConfigured).toBe(false);
    expect(JSON.stringify(body)).not.toContain('alert-secret-value');
    expect(JSON.stringify(body)).not.toContain('alerts.example.com');
  });

  it('reports alert unsubscribe configured without leaking unsubscribe secrets', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-secret-health');
    vi.stubEnv('PRICE_ALERT_UNSUBSCRIBE_SECRET', 'unsubscribe-secret-value');

    const response = await getHealth();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checks.alerts.unsubscribeConfigured).toBe(true);
    expect(body.checks.alerts.unsubscribeStatus).toBe('configured');
    expect(JSON.stringify(body)).not.toContain('unsubscribe-secret-value');
  });

  it('reports ops alert delivery configured without leaking webhook secrets', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-secret-health');
    vi.stubEnv('OPS_ALERT_WEBHOOK_URL', 'https://ops.example.com/hook');
    vi.stubEnv('OPS_ALERT_WEBHOOK_SECRET', 'ops-secret-value');

    const response = await getHealth();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checks.opsAlerts.deliveryConfigured).toBe(true);
    expect(body.checks.opsAlerts.deliveryStatus).toBe('configured');
    expect(JSON.stringify(body)).not.toContain('ops-secret-value');
    expect(JSON.stringify(body)).not.toContain('ops.example.com');
  });

  it('fails production readiness when admin auth is not configured', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_API_SECRET', '');
    vi.stubEnv('CRON_SECRET', '');

    const response = await getHealth();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.ready).toBe(false);
    expect(body.checks.security.productionReady).toBe(false);
    expect(body.warnings).toContain('Admin bearer auth secret is not configured');
  });

  it('fails production readiness when Kinde auth is not configured', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_API_SECRET', 'admin-health-secret');
    vi.stubEnv('CRON_SECRET', 'cron-health-secret');

    const response = await getHealth();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.ready).toBe(false);
    expect(body.checks.security.productionReady).toBe(false);
    expect(body.checks.security.kindeConfigured).toBe(false);
    expect(body.warnings).toContain('Kinde auth environment is not configured');
  });

  it('rate limits expensive agent health probes before provider calls', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-health-secret');
    const request = new Request('http://localhost:3000/api/agents/health-check', {
      headers: {
        'x-forwarded-for': '198.51.100.10',
        Authorization: 'Bearer admin-health-secret',
      },
    });

    for (let i = 0; i < 10; i++) {
      const allowed = await getAgentHealth(request);
      expect(allowed!.status).toBe(200);
    }

    const blocked = await getAgentHealth(request);
    expect(blocked!.status).toBe(429);
    expect(blocked!.headers.get('cache-control')).toBe('no-store');
    expect(getRates).toHaveBeenCalledTimes(10);
    expect(getHeatmap).toHaveBeenCalledTimes(10);
  });
});
