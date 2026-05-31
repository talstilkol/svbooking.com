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

  it('normalizes malformed provider events and reports empty metrics explicitly', async () => {
    const emptyMetrics = await getProviderUptimeMetrics({ limit: 0 });

    expect(emptyMetrics).toMatchObject({
      status: 'unavailable',
      eventCount: 0,
      providerCount: 0,
      successRatePct: null,
      providers: [],
      recentEvents: [],
    });

    const event = await recordProviderUptimeEvent({
      providerId: '  Bad Provider!* ',
      providerName: '',
      operation: '',
      ok: 0,
      latencyMs: -5,
      source: '',
      checkedAt: '',
    } as Parameters<typeof recordProviderUptimeEvent>[0]);

    expect(event).toEqual({
      providerId: 'bad-provider--',
      providerName: 'Bad Provider!*',
      operation: 'unknown',
      ok: false,
      latencyMs: null,
      source: 'unknown',
      checkedAt: '',
    });

    const limitedMetrics = await getProviderUptimeMetrics({ limit: -10 });
    expect(limitedMetrics.eventCount).toBe(1);
    expect(limitedMetrics.successRatePct).toBe(0);
    expect(limitedMetrics.providers[0]).toMatchObject({
      providerId: 'bad-provider--',
      providerName: 'Bad Provider!*',
      avgLatencyMs: null,
      p95LatencyMs: null,
      lastCheckedAt: null,
      lastStatus: 'failed',
      lastOperation: 'unknown',
    });
  });

  it('falls back to unknown provider identity and caps retained event history', async () => {
    const event = await recordProviderUptimeEvent({
      providerId: '',
      providerName: '',
      operation: 'health-check',
      ok: true,
      latencyMs: 12.4,
      checkedAt: '2026-05-14T10:00:00.000Z',
    });

    expect(event).toMatchObject({
      providerId: 'unknown',
      providerName: 'unknown',
      latencyMs: 12,
    });

    store.set(PROVIDER_UPTIME_EVENTS_KEY, Array.from({ length: 1000 }, (_, index) => ({
      providerId: 'xotelo',
      providerName: 'Xotelo',
      operation: `probe-${index}`,
      ok: true,
      latencyMs: index,
      checkedAt: `2026-05-14T10:${String(index % 60).padStart(2, '0')}:00.000Z`,
    })));

    await recordProviderUptimeEvent({
      providerId: 'serpapi',
      providerName: 'SerpAPI',
      operation: 'latest',
      ok: false,
      latencyMs: 500,
      checkedAt: '2026-05-14T11:00:00.000Z',
    });

    const rawEvents = store.get(PROVIDER_UPTIME_EVENTS_KEY) as Array<Record<string, unknown>>;
    expect(rawEvents).toHaveLength(1000);
    expect(rawEvents[0]).toMatchObject({ providerId: 'serpapi', operation: 'latest' });
  });

  it('limits metric windows without mutating stored provider history', async () => {
    await recordProviderUptimeEvent({
      providerId: 'xotelo',
      providerName: 'Xotelo',
      operation: 'older',
      ok: true,
      latencyMs: 20,
      checkedAt: '2026-05-14T10:00:00.000Z',
    });
    await recordProviderUptimeEvent({
      providerId: 'serpapi',
      providerName: 'SerpAPI',
      operation: 'newer',
      ok: false,
      latencyMs: 'bad',
      checkedAt: '2026-05-14T10:01:00.000Z',
    } as Parameters<typeof recordProviderUptimeEvent>[0]);

    const limited = await getProviderUptimeMetrics({ limit: 1 });
    const all = await getProviderUptimeMetrics({ limit: 9999 });

    expect(limited.eventCount).toBe(1);
    expect(limited.providerCount).toBe(1);
    expect(limited.providers[0].providerId).toBe('serpapi');
    expect(all.eventCount).toBe(2);
    expect(all.providerCount).toBe(2);
  });

  it('ignores blank provider IDs when building provider summaries', async () => {
    store.set(PROVIDER_UPTIME_EVENTS_KEY, [
      { providerId: '', ok: true, latencyMs: 10, providerName: 'Blank Provider' },
    ]);

    const metrics = await getProviderUptimeMetrics();

    expect(metrics.status).toBe('available');
    expect(metrics.eventCount).toBe(1);
    expect(metrics.providerCount).toBe(0);
    expect(metrics.successRatePct).toBe(100);
    expect(metrics.providers).toEqual([]);
    expect(metrics.recentEvents).toHaveLength(1);
  });

  it('uses provider IDs when sparse legacy events lack names or operations', async () => {
    store.set(PROVIDER_UPTIME_EVENTS_KEY, [
      { providerId: 'legacy-provider', ok: true, latencyMs: 41, checkedAt: '2026-05-14T10:00:00.000Z' },
    ]);

    const metrics = await getProviderUptimeMetrics();

    expect(metrics.providers).toEqual([
      expect.objectContaining({
        providerId: 'legacy-provider',
        providerName: 'legacy-provider',
        lastStatus: 'ok',
        lastOperation: null,
      }),
    ]);

    const event = await recordProviderUptimeEvent({
      ok: true,
      latencyMs: 9.8,
    } as Parameters<typeof recordProviderUptimeEvent>[0]);

    expect(event).toMatchObject({
      providerId: 'unknown',
      providerName: 'unknown',
      latencyMs: 10,
      source: 'unknown',
    });
  });

  it('keeps malformed legacy provider names from becoming public labels', async () => {
    store.set(PROVIDER_UPTIME_EVENTS_KEY, [
      { providerId: 'legacy-provider', providerName: '', ok: false, latencyMs: null },
    ]);

    const metrics = await getProviderUptimeMetrics();

    expect(metrics.providers[0]).toMatchObject({
      providerId: 'legacy-provider',
      providerName: 'legacy-provider',
      avgLatencyMs: null,
      p95LatencyMs: null,
      lastCheckedAt: null,
      lastStatus: 'failed',
    });
  });

  it('protects provider uptime metrics behind admin auth and no-store', async () => {
    const denied = await getProviderUptime(new Request('http://localhost:3000/api/agents/providers/uptime'));
    expect(denied!.status).toBe(401);
    expect(denied!.headers.get('Cache-Control')).toBe('no-store');

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
    const body = await accepted!.json();

    expect(accepted!.status).toBe(200);
    expect(accepted!.headers.get('Cache-Control')).toBe('no-store');
    expect(body.uptime.status).toBe('available');
    expect(body.uptime.providers[0]).toMatchObject({
      providerId: 'xotelo',
      total: 1,
      successRatePct: 100,
    });
  });
});
