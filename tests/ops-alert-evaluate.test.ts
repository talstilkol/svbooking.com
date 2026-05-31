import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RETENTION_SECONDS } from '@/lib/data-retention';

const mocks = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
  verifyCronAuth: vi.fn(),
  buildOpsAlerts: vi.fn(),
  deliverOpsAlertReport: vi.fn(),
  isOpsAlertDeliveryConfigured: vi.fn(),
  setWithTTL: vi.fn(),
}));

vi.mock('@/lib/agent-utils', () => ({
  verifyCronAuth: mocks.verifyCronAuth,
}));

vi.mock('@/lib/kv', () => ({
  kv: {
    get: vi.fn(async (key: string) => mocks.store.get(key) || null),
    setWithTTL: mocks.setWithTTL,
  },
}));

vi.mock('@/lib/ops-alerts', () => ({
  buildOpsAlerts: mocks.buildOpsAlerts,
}));

vi.mock('@/lib/ops-alert-delivery', () => ({
  deliverOpsAlertReport: mocks.deliverOpsAlertReport,
  isOpsAlertDeliveryConfigured: mocks.isOpsAlertDeliveryConfigured,
}));

import { GET } from '@/app/api/ops/alerts/evaluate/route';

function baseReport(alerts: Array<Record<string, unknown>>) {
  return {
    service: 'sv-booking',
    checkedAt: '2026-05-14T12:00:00.000Z',
    status: alerts.some((alert) => alert.severity === 'critical') ? 'critical' : 'healthy',
    summary: {
      total: alerts.length,
      critical: alerts.filter((alert) => alert.severity === 'critical').length,
      warning: alerts.filter((alert) => alert.severity === 'warning').length,
      info: alerts.filter((alert) => alert.severity === 'info').length,
    },
    alerts,
    evidence: { healthStatus: 'error' },
  };
}

describe('ops alert evaluator route', () => {
  beforeEach(() => {
    mocks.store.clear();
    mocks.verifyCronAuth.mockReset();
    mocks.buildOpsAlerts.mockReset();
    mocks.deliverOpsAlertReport.mockReset();
    mocks.isOpsAlertDeliveryConfigured.mockReset();
    mocks.setWithTTL.mockReset();

    mocks.verifyCronAuth.mockReturnValue({ authorized: true });
    mocks.isOpsAlertDeliveryConfigured.mockReturnValue(true);
    mocks.setWithTTL.mockImplementation(async (key: string, value: unknown) => {
      mocks.store.set(key, value);
    });
  });

  it('cron-protects the evaluator before building reports', async () => {
    mocks.verifyCronAuth.mockReturnValueOnce({
      authorized: false,
      response: Response.json({ error: 'Unauthorized' }, {
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      }),
    });

    const response = await GET(new Request('http://localhost:3000/api/ops/alerts/evaluate'));

    expect(response!.status).toBe(401);
    expect(response!.headers.get('cache-control')).toBe('no-store');
    expect(mocks.buildOpsAlerts).not.toHaveBeenCalled();
    expect(mocks.deliverOpsAlertReport).not.toHaveBeenCalled();
  });

  it('delivers only critical and warning alerts and records a sanitized event', async () => {
    const critical = {
      id: 'cache-not-durable',
      severity: 'critical',
      domain: 'production-readiness',
      message: 'Persistent KV cache is not configured.',
      evidence: { cacheMode: 'memory' },
      action: 'Configure persistent Redis/KV before production scale.',
    };
    const warning = {
      id: 'price-alert-delivery-not-configured',
      severity: 'warning',
      domain: 'mobile-retention',
      message: 'Price alert delivery is not configured.',
      evidence: { deliveryStatus: 'not-configured' },
      action: 'Configure alert delivery.',
    };
    const info = {
      id: 'provider-uptime-insufficient-data',
      severity: 'info',
      domain: 'observability',
      message: 'Provider uptime history has insufficient events.',
      evidence: { eventCount: 0 },
      action: 'Run health probes.',
    };

    mocks.buildOpsAlerts.mockResolvedValueOnce(baseReport([info, critical, warning]));
    mocks.deliverOpsAlertReport.mockResolvedValueOnce({ configured: true, status: 'sent', httpStatus: 202 });

    const response = await GET(new Request('http://localhost:3000/api/ops/alerts/evaluate'));
    const body = await response!.json();

    expect(response!.status).toBe(200);
    expect(response!.headers.get('cache-control')).toBe('no-store');
    expect(mocks.deliverOpsAlertReport).toHaveBeenCalledTimes(1);
    const [deliveredReport] = mocks.deliverOpsAlertReport.mock.calls[0] as [{
      alerts: Array<{ id: string }>;
      summary: { total: number; critical: number; warning: number; info: number };
    }];
    expect(deliveredReport.alerts.map((alert: { id: string }) => alert.id)).toEqual([
      'cache-not-durable',
      'price-alert-delivery-not-configured',
    ]);
    expect(deliveredReport.summary).toEqual({ total: 2, critical: 1, warning: 1, info: 0 });
    expect(mocks.setWithTTL).toHaveBeenCalledWith(
      'ops:alert-deliveries',
      expect.any(Array),
      RETENTION_SECONDS.opsAlertEvents
    );
    expect(body.delivery).toEqual({ configured: true, status: 'sent', httpStatus: 202 });
    expect(body.event.actionableAlertCount).toBe(2);
    expect(body.event.deliveryStatus).toBe('sent');
    expect(JSON.stringify(body)).not.toContain('ops-webhook-secret');
  });

  it('skips delivery when only informational alerts exist', async () => {
    mocks.isOpsAlertDeliveryConfigured.mockReturnValueOnce(false);
    mocks.buildOpsAlerts.mockResolvedValueOnce(baseReport([{
      id: 'price-accuracy-insufficient-data',
      severity: 'info',
      domain: 'price-accuracy',
      message: 'Price accuracy history has insufficient observations.',
      evidence: { observations: 0 },
      action: 'Accumulate observed clicks.',
    }]));

    const response = await GET(new Request('http://localhost:3000/api/ops/alerts/evaluate'));
    const body = await response!.json();

    expect(response!.status).toBe(200);
    expect(mocks.deliverOpsAlertReport).not.toHaveBeenCalled();
    expect(body.delivery).toEqual({
      configured: false,
      status: 'skipped-no-actionable-alerts',
    });
    expect(body.event.actionableAlertCount).toBe(0);
    expect(body.event.deliveryStatus).toBe('skipped-no-actionable-alerts');
  });
});
