import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildOpsScorecard } from '@/lib/ops-scorecard';
import { GET as getOpsScorecard } from '@/app/api/ops/scorecard/route';

describe('ops scorecard', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('summarizes competitive blockers without leaking secret values', () => {
    const scorecard = buildOpsScorecard({
      env: {
        ADMIN_API_SECRET: 'admin-secret-value',
        PRICE_ALERT_WEBHOOK_SECRET: 'webhook-secret-value',
      } as unknown as NodeJS.ProcessEnv,
      now: new Date('2026-05-14T12:00:00.000Z'),
    });

    expect(scorecard.service).toBe('sv-booking');
    expect(scorecard.checkedAt).toBe('2026-05-14T12:00:00.000Z');
    expect(scorecard.productTruth.model).toBe('meta-search');
    expect(scorecard.productTruth.dataBudget).toBe('free-only');
    expect(scorecard.productTruth.globalParityReady).toBe(false);
    expect(scorecard.productTruth.globalParityBlockers.length).toBeGreaterThan(0);
    expect(scorecard.productTruth.scores.engineering.current).toBe(8.8);
    expect(scorecard.productTruth.scores.competitive.current).toBe(4.8);
    expect(scorecard.domains.map((domain) => domain.id)).toEqual(
      expect.arrayContaining([
        'production-readiness',
        'inventory-scale',
        'reviews-and-property-content',
        'mobile-retention',
        'localization',
        'observability',
      ])
    );
    expect(scorecard.blockers.length).toBeGreaterThan(0);
    expect(JSON.stringify(scorecard)).not.toContain('admin-secret-value');
    expect(JSON.stringify(scorecard)).not.toContain('webhook-secret-value');
  });

  it('separates free-only launch readiness from global parity claims', () => {
    const scorecard = buildOpsScorecard({
      env: {
        ADMIN_API_SECRET: 'admin-secret-value',
        UPSTASH_REDIS_REST_URL: 'https://redis.svbooking.com',
        UPSTASH_REDIS_REST_TOKEN: 'svbooking-redis-token-scorecard-0001',
        KINDE_CLIENT_ID: 'svbooking-kinde-client-id-0001',
        KINDE_CLIENT_SECRET: 'svbooking-kinde-client-secret-0001',
        KINDE_ISSUER_URL: 'https://auth.svbooking.com',
        KINDE_SITE_URL: 'https://svbooking.com',
        KINDE_POST_LOGOUT_REDIRECT_URL: 'https://svbooking.com',
        KINDE_POST_LOGIN_REDIRECT_URL: 'https://svbooking.com/dashboard',
        SERPAPI_KEY: 'svbooking-serpapi-key-scorecard-0001',
      } as unknown as NodeJS.ProcessEnv,
      now: new Date('2026-05-14T12:00:00.000Z'),
    });

    expect(scorecard.productTruth.freeOnlyLaunchReady).toBe(true);
    expect(scorecard.productTruth.globalParityReady).toBe(false);
    expect(JSON.stringify(scorecard)).not.toContain('svbooking-kinde-client-secret-0001');
    expect(JSON.stringify(scorecard)).not.toContain('svbooking-serpapi-key-scorecard-0001');
    expect(JSON.stringify(scorecard)).not.toContain('svbooking-redis-token-scorecard-0001');
  });

  it('blocks production readiness without Kinde and a complete partner provider group', () => {
    const scorecard = buildOpsScorecard({
      env: {
        ADMIN_API_SECRET: 'admin-secret-value',
        UPSTASH_REDIS_REST_URL: 'https://redis.svbooking.com',
        UPSTASH_REDIS_REST_TOKEN: 'svbooking-redis-token-scorecard-0001',
      } as unknown as NodeJS.ProcessEnv,
      now: new Date('2026-05-14T12:00:00.000Z'),
    });
    const production = scorecard.domains.find((domain) => domain.id === 'production-readiness');

    expect(production?.status).toBe('blocked');
    expect(production?.current.kindeConfigured).toBe(false);
    expect(production?.current.partnerPricingProviderConfigured).toBe(false);
    expect(production?.blockers).toContain('Configure Kinde auth environment');
    expect(production?.blockers).toContain('Configure at least one complete partner pricing provider env group');
  });

  it('marks observability healthy only when ops alert delivery is configured', () => {
    const scorecard = buildOpsScorecard({
      env: {
        ADMIN_API_SECRET: 'admin-secret-value',
        OPS_ALERT_WEBHOOK_URL: 'https://ops.svbooking.invalid/hook',
        OPS_ALERT_WEBHOOK_SECRET: 'ops-webhook-secret',
      } as unknown as NodeJS.ProcessEnv,
      now: new Date('2026-05-14T12:00:00.000Z'),
    });
    const observability = scorecard.domains.find((domain) => domain.id === 'observability');

    expect(observability?.status).toBe('healthy');
    expect(observability?.current.alertDelivery).toBe('configured');
    expect(observability?.blockers).toEqual([]);
    expect(JSON.stringify(scorecard)).not.toContain('ops-webhook-secret');
    expect(JSON.stringify(scorecard)).not.toContain('ops.svbooking.invalid');
  });

  it('protects the scorecard route with admin bearer auth and no-store caching', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-scorecard-secret');

    const denied = await getOpsScorecard(new Request('http://localhost:3000/api/ops/scorecard'));
    expect(denied!.status).toBe(401);
    expect(denied!.headers.get('cache-control')).toBe('no-store');

    const accepted = await getOpsScorecard(new Request('http://localhost:3000/api/ops/scorecard', {
      headers: { Authorization: 'Bearer admin-scorecard-secret' },
    }));
    const body = await accepted!.json();

    expect(accepted!.status).toBe(200);
    expect(accepted!.headers.get('cache-control')).toBe('no-store');
    expect(body.domains.some((domain: { id: string }) => domain.id === 'inventory-scale')).toBe(true);
    expect(JSON.stringify(body)).not.toContain('admin-scorecard-secret');
  });
});
