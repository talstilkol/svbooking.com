import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/health-readiness', () => ({
  buildHealthSnapshot: vi.fn(() => ({
    service: 'sv-booking',
    status: 'error',
    ready: false,
    checkedAt: '2026-05-14T12:00:00.000Z',
    checks: {
      security: { productionReady: false, adminAuthConfigured: false },
      cache: { durable: false, mode: 'memory' },
      providers: { available: 0 },
      alerts: { deliveryConfigured: false, deliveryStatus: 'not-configured' },
    },
    warnings: [],
  })),
}));

vi.mock('@/lib/ops-scorecard', () => ({
  buildOpsScorecard: vi.fn(() => ({
    service: 'sv-booking',
    status: 'blocked',
    score: 0.5,
    blockers: [
      { domain: 'production-readiness', blocker: 'Configure persistent Redis/KV' },
      { domain: 'inventory-scale', blocker: 'Catalog is below the 30-day approved-hotel target' },
    ],
  })),
}));

vi.mock('@/lib/provider-observability', () => ({
  getProviderUptimeMetrics: vi.fn(async () => ({
    status: 'available',
    eventCount: 6,
    providerCount: 1,
    successRatePct: 83.3,
    providers: [{
      providerId: 'xotelo',
      providerName: 'Xotelo',
      total: 6,
      successes: 5,
      failures: 1,
      successRatePct: 83.3,
      p95LatencyMs: 9000,
    }],
  })),
}));

vi.mock('@/lib/price-accuracy', () => ({
  getPriceAccuracyMetrics: vi.fn(async () => ({
    days: 7,
    observations: 20,
    mismatches: 3,
    mismatchRate: 0.15,
    byProvider: {},
  })),
}));

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: vi.fn((request: Request) => {
    if (request.headers.get('authorization') === 'Bearer admin-secret') {
      return { authorized: true, subject: 'admin' };
    }
    return {
      authorized: false,
      response: Response.json(
        { error: 'Unauthorized' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }),
}));

import { GET } from '@/app/api/ops/alerts/route';
import { buildOpsAlerts } from '@/lib/ops-alerts';
import { buildHealthSnapshot } from '@/lib/health-readiness';
import { buildOpsScorecard } from '@/lib/ops-scorecard';
import { getProviderUptimeMetrics } from '@/lib/provider-observability';
import { getPriceAccuracyMetrics } from '@/lib/price-accuracy';

describe('ops alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds evidence-based alerts from readiness, provider uptime, and price accuracy drift', async () => {
    const result = await buildOpsAlerts({ now: new Date('2026-05-14T12:00:00.000Z') });

    expect(result.status).toBe('critical');
    expect(result.summary.critical).toBeGreaterThanOrEqual(3);
    expect(result.alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'cache-not-durable', severity: 'critical' }),
      expect.objectContaining({ id: 'provider-xotelo-critical-success-rate', severity: 'critical' }),
      expect.objectContaining({ id: 'provider-xotelo-critical-latency', severity: 'critical' }),
      expect.objectContaining({ id: 'price-accuracy-critical-drift', severity: 'critical' }),
    ]));
    expect(result.evidence.providerUptime.eventCount).toBe(6);
    expect(result.evidence.priceAccuracy.mismatchRate).toBe(0.15);
    expect(JSON.stringify(result)).not.toContain('admin-secret');
  });

  it('marks provider and price accuracy alerts as insufficient-data rather than healthy when evidence is too thin', async () => {
    vi.mocked(getProviderUptimeMetrics).mockResolvedValueOnce({
      status: 'unavailable',
      eventCount: 0,
      providerCount: 0,
      successRatePct: null,
      providers: [],
    } as unknown as Awaited<ReturnType<typeof getProviderUptimeMetrics>>);
    vi.mocked(getPriceAccuracyMetrics).mockResolvedValueOnce({
      days: 7,
      observations: 0,
      mismatches: 0,
      mismatchRate: null,
      byProvider: {},
    });

    const result = await buildOpsAlerts({ now: new Date('2026-05-14T12:00:00.000Z') });

    expect(result.alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'provider-uptime-insufficient-data', severity: 'info' }),
      expect.objectContaining({ id: 'price-accuracy-insufficient-data', severity: 'info' }),
    ]));
  });

  it('does not escalate provider-specific alerts until each provider has enough evidence', async () => {
    vi.mocked(getProviderUptimeMetrics).mockResolvedValueOnce({
      status: 'available',
      eventCount: 6,
      providerCount: 1,
      successRatePct: 50,
      providers: [{
        providerId: ' Partner API ',
        providerName: ' Partner\nAPI ',
        total: 4,
        successes: 0,
        failures: 4,
        successRatePct: 0,
        p95LatencyMs: 12000,
      }],
    } as unknown as Awaited<ReturnType<typeof getProviderUptimeMetrics>>);
    vi.mocked(getPriceAccuracyMetrics).mockResolvedValueOnce({
      days: 7,
      observations: 20,
      mismatches: 0,
      mismatchRate: 0,
      byProvider: {},
    });

    const result = await buildOpsAlerts({ now: new Date('2026-05-14T12:00:00.000Z') });

    expect(result.alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'provider-partner-api-insufficient-data',
        severity: 'info',
        evidence: expect.objectContaining({
          providerId: 'partner-api',
          eventCount: 4,
          requiredEvents: 5,
        }),
      }),
    ]));
    expect(result.alerts.map((item) => item.id)).not.toContain('provider-partner-api-critical-success-rate');
    expect(result.alerts.map((item) => item.id)).not.toContain('provider-partner-api-critical-latency');
    expect(JSON.stringify(result.alerts)).not.toContain('\n');
  });

  it('emits provider and price-accuracy warnings below critical thresholds', async () => {
    vi.mocked(getProviderUptimeMetrics).mockResolvedValueOnce({
      status: 'available',
      eventCount: 5,
      providerCount: 1,
      successRatePct: 94,
      providers: [{
        providerId: 'xotelo',
        providerName: 'Xotelo',
        total: 5,
        successes: 4,
        failures: 1,
        successRatePct: 94,
        p95LatencyMs: 4000,
      }],
    } as unknown as Awaited<ReturnType<typeof getProviderUptimeMetrics>>);
    vi.mocked(getPriceAccuracyMetrics).mockResolvedValueOnce({
      days: 7,
      observations: 20,
      mismatches: 1,
      mismatchRate: 0.05,
      byProvider: {},
    });

    const result = await buildOpsAlerts({ now: new Date('2026-05-14T12:00:00.000Z') });

    expect(result.alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'provider-xotelo-warning-success-rate', severity: 'warning' }),
      expect.objectContaining({ id: 'provider-xotelo-warning-latency', severity: 'warning' }),
      expect.objectContaining({ id: 'price-accuracy-warning-drift', severity: 'warning' }),
    ]));
    expect(result.alerts.map((item) => item.id)).not.toContain('provider-xotelo-critical-success-rate');
    expect(result.alerts.map((item) => item.id)).not.toContain('price-accuracy-critical-drift');
  });

  it('reports warning status when only non-critical provider alerts remain', async () => {
    vi.mocked(buildHealthSnapshot).mockReturnValueOnce({
      service: 'sv-booking',
      status: 'healthy',
      ready: true,
      checkedAt: '2026-05-14T12:00:00.000Z',
      checks: {
        security: { productionReady: true, adminAuthConfigured: true },
        cache: { durable: true, mode: 'persistent' },
        providers: { available: 2 },
        alerts: { deliveryConfigured: true, deliveryStatus: 'configured' },
      },
      warnings: [],
    } as unknown as ReturnType<typeof buildHealthSnapshot>);
    vi.mocked(buildOpsScorecard).mockReturnValueOnce({
      service: 'sv-booking',
      status: 'partial',
      score: 0.8,
    } as unknown as ReturnType<typeof buildOpsScorecard>);
    vi.mocked(getProviderUptimeMetrics).mockResolvedValueOnce({
      status: 'available',
      eventCount: 5,
      providerCount: 1,
      successRatePct: 94,
      providers: [{
        providerId: '!!!',
        providerName: '   ',
        total: 5,
        successes: 4,
        failures: 1,
        successRatePct: 94,
        p95LatencyMs: 4000,
      }],
    } as unknown as Awaited<ReturnType<typeof getProviderUptimeMetrics>>);
    vi.mocked(getPriceAccuracyMetrics).mockResolvedValueOnce({
      days: 7,
      observations: 20,
      mismatches: 0,
      mismatchRate: 0,
      byProvider: {},
    });

    const result = await buildOpsAlerts({ now: new Date('2026-05-14T12:00:00.000Z') });

    expect(result.status).toBe('warning');
    expect(result.summary).toMatchObject({ critical: 0, warning: 2 });
    expect(result.alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'provider-unknown-warning-success-rate',
        message: 'unknown success rate is below target.',
      }),
      expect.objectContaining({
        id: 'provider-unknown-warning-latency',
        message: 'unknown p95 latency is above target.',
      }),
    ]));
  });

  it('stays healthy when readiness, provider uptime, and price accuracy are within thresholds', async () => {
    vi.mocked(buildHealthSnapshot).mockReturnValueOnce({
      service: 'sv-booking',
      status: 'healthy',
      ready: true,
      checkedAt: '2026-05-14T12:00:00.000Z',
      checks: {
        security: { productionReady: true, adminAuthConfigured: true },
        cache: { durable: true, mode: 'persistent' },
        providers: { available: 2 },
        alerts: { deliveryConfigured: true, deliveryStatus: 'configured' },
      },
      warnings: [],
    } as unknown as ReturnType<typeof buildHealthSnapshot>);
    vi.mocked(buildOpsScorecard).mockReturnValueOnce({
      service: 'sv-booking',
      status: 'healthy',
      score: 1,
      blockers: [],
    } as unknown as ReturnType<typeof buildOpsScorecard>);
    vi.mocked(getProviderUptimeMetrics).mockResolvedValueOnce({
      status: 'available',
      eventCount: 5,
      providerCount: 1,
      successRatePct: 100,
      providers: [{
        providerId: 'xotelo',
        providerName: 'Xotelo',
        total: 5,
        successes: 5,
        failures: 0,
        successRatePct: 100,
        p95LatencyMs: 1200,
      }],
    } as unknown as Awaited<ReturnType<typeof getProviderUptimeMetrics>>);
    vi.mocked(getPriceAccuracyMetrics).mockResolvedValueOnce({
      days: 7,
      observations: 20,
      mismatches: 0,
      mismatchRate: 0,
      byProvider: {},
    });

    const result = await buildOpsAlerts({ now: new Date('2026-05-14T12:00:00.000Z') });

    expect(result.status).toBe('healthy');
    expect(result.summary).toEqual({ total: 0, critical: 0, warning: 0, info: 0 });
    expect(result.alerts).toEqual([]);
  });

  it('falls back to unknown provider identity and does not invent alerts for null threshold metrics', async () => {
    vi.mocked(buildHealthSnapshot).mockReturnValueOnce({
      service: 'sv-booking',
      status: 'healthy',
      ready: true,
      checkedAt: '2026-05-14T12:00:00.000Z',
      checks: {
        security: { productionReady: true, adminAuthConfigured: true },
        cache: { durable: true, mode: 'persistent' },
        providers: { available: 2 },
        alerts: { deliveryConfigured: true, deliveryStatus: 'configured' },
      },
      warnings: [],
    } as unknown as ReturnType<typeof buildHealthSnapshot>);
    vi.mocked(buildOpsScorecard).mockReturnValueOnce({
      service: 'sv-booking',
      status: 'healthy',
      score: 1,
      blockers: [],
    } as unknown as ReturnType<typeof buildOpsScorecard>);
    vi.mocked(getProviderUptimeMetrics).mockResolvedValueOnce({
      status: 'available',
      eventCount: 10,
      providerCount: 2,
      successRatePct: null,
      providers: [
        {
          providerId: '',
          providerName: '',
          total: 'not-a-number',
          successes: 0,
          failures: 0,
          successRatePct: null,
          p95LatencyMs: null,
        },
        {
          providerId: 'null-metrics',
          providerName: 'Null Metrics',
          total: 5,
          successes: 0,
          failures: 0,
          successRatePct: null,
          p95LatencyMs: null,
        },
      ],
    } as unknown as Awaited<ReturnType<typeof getProviderUptimeMetrics>>);
    vi.mocked(getPriceAccuracyMetrics).mockResolvedValueOnce({
      days: 7,
      observations: 10,
      mismatches: 0,
      mismatchRate: null,
      byProvider: {},
    });

    const result = await buildOpsAlerts({ now: new Date('2026-05-14T12:00:00.000Z') });

    expect(result.status).toBe('healthy');
    expect(result.alerts).toEqual([
      expect.objectContaining({
        id: 'provider-unknown-insufficient-data',
        severity: 'info',
        evidence: expect.objectContaining({
          providerId: 'unknown',
          eventCount: 0,
          requiredEvents: 5,
        }),
      }),
    ]);
    expect(result.alerts.map((item) => item.id)).not.toContain('provider-null-metrics-warning-success-rate');
    expect(result.alerts.map((item) => item.id)).not.toContain('provider-null-metrics-warning-latency');
    expect(result.alerts.map((item) => item.id)).not.toContain('price-accuracy-warning-drift');
  });

  it('handles missing provider lists after aggregate uptime has enough evidence', async () => {
    vi.mocked(buildHealthSnapshot).mockReturnValueOnce({
      service: 'sv-booking',
      status: 'healthy',
      ready: true,
      checkedAt: '2026-05-14T12:00:00.000Z',
      checks: {
        security: { productionReady: true, adminAuthConfigured: true },
        cache: { durable: true, mode: 'persistent' },
        providers: { available: 2 },
        alerts: { deliveryConfigured: true, deliveryStatus: 'configured' },
      },
      warnings: [],
    } as unknown as ReturnType<typeof buildHealthSnapshot>);
    vi.mocked(buildOpsScorecard).mockReturnValueOnce({
      service: 'sv-booking',
      status: 'healthy',
      score: 1,
      blockers: [],
    } as unknown as ReturnType<typeof buildOpsScorecard>);
    vi.mocked(getProviderUptimeMetrics).mockResolvedValueOnce({
      status: 'available',
      eventCount: 5,
      providerCount: 0,
      successRatePct: 100,
    } as unknown as Awaited<ReturnType<typeof getProviderUptimeMetrics>>);
    vi.mocked(getPriceAccuracyMetrics).mockResolvedValueOnce({
      days: 7,
      observations: 10,
      mismatches: 0,
      mismatchRate: 0,
      byProvider: {},
    });

    const result = await buildOpsAlerts({ now: new Date('2026-05-14T12:00:00.000Z') });

    expect(result.status).toBe('healthy');
    expect(result.alerts).toEqual([]);
    expect(result.evidence.providerUptime).toMatchObject({
      eventCount: 5,
      providerCount: 0,
      successRatePct: 100,
    });
  });

  it('protects ops alerts behind admin auth and no-store', async () => {
    const denied = await GET(new Request('http://localhost:3000/api/ops/alerts'));
    expect(denied!.status).toBe(401);
    expect(denied!.headers.get('Cache-Control')).toBe('no-store');

    const accepted = await GET(new Request('http://localhost:3000/api/ops/alerts', {
      headers: { Authorization: 'Bearer admin-secret' },
    }));
    const body = await accepted!.json();

    expect(accepted!.status).toBe(200);
    expect(accepted!.headers.get('Cache-Control')).toBe('no-store');
    expect(body.service).toBe('sv-booking');
    expect(body.alerts.length).toBeGreaterThan(0);
  });
});
