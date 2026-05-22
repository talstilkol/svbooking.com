import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();

vi.mock('@/lib/kv', () => ({
  kv: {
    get: vi.fn(async (key: string) => store.get(key) || null),
    setWithTTL: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
  },
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

import { GET as getProviderUptime } from '@/app/api/agents/providers/uptime/route';
import {
  PROVIDER_UPTIME_EVENTS_KEY,
  getProviderUptimeMetrics,
  recordProviderUptimeEvent,
} from '@/lib/provider-observability';

describe('provider observability', () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it('records sanitized provider uptime events and computes metrics', async () => {
    await recordProviderUptimeEvent({
      providerId: 'Xotelo',
      providerName: 'Xotelo',
      operation: 'fetchRates',
      ok: true,
      latencyMs: 100,
      source: 'provider-registry',
      checkedAt: '2026-05-14T10:00:00.000Z',
    });
    await recordProviderUptimeEvent({
      providerId: 'xotelo',
      providerName: 'Xotelo',
      operation: 'fetchRates',
      ok: false,
      latencyMs: 300,
      source: 'provider-registry',
      checkedAt: '2026-05-14T10:01:00.000Z',
    });

    const rawEvents = store.get(PROVIDER_UPTIME_EVENTS_KEY) as Array<Record<string, unknown>>;
    expect(rawEvents).toHaveLength(2);
    expect(JSON.stringify(rawEvents)).not.toContain('Error:');
    expect(JSON.stringify(rawEvents)).not.toContain('secret');

    const metrics = await getProviderUptimeMetrics();
    expect(metrics.status).toBe('available');
    expect(metrics.rawErrorStorage).toBe('not-allowed');
    expect(metrics.successRatePct).toBe(50);
    expect(metrics.providers).toEqual([
      expect.objectContaining({
        providerId: 'xotelo',
        total: 2,
        successes: 1,
        failures: 1,
        avgLatencyMs: 200,
        p95LatencyMs: 300,
        lastStatus: 'failed',
      }),
    ]);
  });

  it('protects provider uptime metrics behind admin auth and no-store', async () => {
    const denied = await getProviderUptime(new Request('http://localhost:3000/api/agents/providers/uptime'));
    expect(denied.status).toBe(401);
    expect(denied.headers.get('Cache-Control')).toBe('no-store');

    await recordProviderUptimeEvent({
      providerId: 'xotelo',
      providerName: 'Xotelo',
      operation: 'rates-health-probe',
      ok: true,
      latencyMs: 42,
      source: 'agents-health-check',
    });

    const accepted = await getProviderUptime(new Request('http://localhost:3000/api/agents/providers/uptime', {
      headers: { Authorization: 'Bearer admin-secret' },
    }));
    const body = await accepted.json();

    expect(accepted.status).toBe(200);
    expect(accepted.headers.get('Cache-Control')).toBe('no-store');
    expect(body.uptime.status).toBe('available');
    expect(body.uptime.providers[0]).toMatchObject({
      providerId: 'xotelo',
      total: 1,
      successRatePct: 100,
    });
  });
});
