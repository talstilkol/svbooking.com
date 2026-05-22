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
