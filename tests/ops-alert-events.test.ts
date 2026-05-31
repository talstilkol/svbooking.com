import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
  verifyAdminAuth: vi.fn(),
  isOpsAlertDeliveryConfigured: vi.fn(),
}));

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminAuth: mocks.verifyAdminAuth,
}));

vi.mock('@/lib/kv', () => ({
  kv: {
    get: vi.fn(async (key: string) => mocks.store.get(key) || null),
    setWithTTL: vi.fn(async (key: string, value: unknown) => mocks.store.set(key, value)),
  },
}));

vi.mock('@/lib/ops-alert-delivery', () => ({
  isOpsAlertDeliveryConfigured: mocks.isOpsAlertDeliveryConfigured,
}));

import { GET } from '@/app/api/ops/alerts/events/route';
import {
  appendOpsAlertDeliveryEvent,
  getOpsAlertDeliveryEvents,
  OPS_ALERT_EVENTS_KEY,
} from '@/lib/ops-alert-events';

describe('ops alert delivery events', () => {
  beforeEach(() => {
    mocks.store.clear();
    mocks.verifyAdminAuth.mockReset();
    mocks.isOpsAlertDeliveryConfigured.mockReset();
    mocks.verifyAdminAuth.mockReturnValue({ authorized: true, subject: 'admin' });
    mocks.isOpsAlertDeliveryConfigured.mockReturnValue(false);
  });

  it('stores sanitized delivery events and drops unexpected sensitive fields', async () => {
    const stored = await appendOpsAlertDeliveryEvent({
      id: 'ops-event-1',
      at: '2026-05-14T12:00:00.000Z',
      reportStatus: 'critical',
      alertCount: 3,
      actionableAlertCount: 2,
      critical: 1,
      warning: 1,
      deliveryConfigured: true,
      deliveryStatus: 'sent',
      deliveryHttpStatus: 202,
      webhookSecret: 'raw-secret',
      authorization: 'Bearer raw-secret',
    });

    expect(stored).toEqual({
      id: 'ops-event-1',
      at: '2026-05-14T12:00:00.000Z',
      reportStatus: 'critical',
      alertCount: 3,
      actionableAlertCount: 2,
      critical: 1,
      warning: 1,
      deliveryConfigured: true,
      deliveryStatus: 'sent',
      deliveryHttpStatus: 202,
    });
    expect(JSON.stringify(mocks.store.get(OPS_ALERT_EVENTS_KEY))).not.toContain('raw-secret');
    expect(JSON.stringify(mocks.store.get(OPS_ALERT_EVENTS_KEY))).not.toContain('authorization');
  });

  it('requires admin auth and returns no-store event history', async () => {
    mocks.verifyAdminAuth.mockReturnValueOnce({
      authorized: false,
      response: Response.json({ error: 'Unauthorized' }, {
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      }),
    });

    const denied = await GET(new Request('http://localhost:3000/api/ops/alerts/events'));
    expect(denied!.status).toBe(401);
    expect(denied!.headers.get('cache-control')).toBe('no-store');

    mocks.store.set(OPS_ALERT_EVENTS_KEY, [{
      id: 'ops-event-2',
      at: '2026-05-14T13:00:00.000Z',
      reportStatus: 'warning',
      alertCount: '2',
      actionableAlertCount: '1',
      critical: '0',
      warning: '1',
      deliveryConfigured: true,
      deliveryStatus: 'failed',
      deliveryHttpStatus: '500',
      token: 'raw-token',
    }]);
    mocks.isOpsAlertDeliveryConfigured.mockReturnValueOnce(true);

    const accepted = await GET(new Request('http://localhost:3000/api/ops/alerts/events?limit=1'));
    const body = await accepted!.json();

    expect(accepted!.status).toBe(200);
    expect(accepted!.headers.get('cache-control')).toBe('no-store');
    expect(body).toEqual({
      count: 1,
      deliveryConfigured: true,
      deliveryStatus: 'configured',
      retentionDays: 30,
      events: [{
        id: 'ops-event-2',
        at: '2026-05-14T13:00:00.000Z',
        reportStatus: 'warning',
        alertCount: 2,
        actionableAlertCount: 1,
        critical: 0,
        warning: 1,
        deliveryConfigured: true,
        deliveryStatus: 'failed',
        deliveryHttpStatus: 500,
      }],
    });
    expect(JSON.stringify(body)).not.toContain('raw-token');
  });

  it('normalizes malformed stored events and clamps requested history limits', async () => {
    const empty = await appendOpsAlertDeliveryEvent(undefined);

    expect(empty).toEqual({
      id: null,
      at: null,
      reportStatus: 'unknown',
      alertCount: 0,
      actionableAlertCount: 0,
      critical: 0,
      warning: 0,
      deliveryConfigured: false,
      deliveryStatus: 'unknown',
      deliveryHttpStatus: null,
    });

    mocks.store.set(OPS_ALERT_EVENTS_KEY, [
      { id: 'ops-event-3', alertCount: 'bad', deliveryHttpStatus: 'bad' },
      { id: 'ops-event-4', alertCount: 4, deliveryHttpStatus: 204 },
      { id: 'ops-event-5', alertCount: 5, deliveryHttpStatus: 202 },
    ]);

    expect(await getOpsAlertDeliveryEvents({ limit: -10 })).toHaveLength(1);
    expect(await getOpsAlertDeliveryEvents({ limit: 'not-a-number' })).toHaveLength(3);
    expect(await getOpsAlertDeliveryEvents({ limit: 999 })).toHaveLength(3);

    const [malformed] = await getOpsAlertDeliveryEvents({ limit: 1 });
    expect(malformed).toEqual({
      id: 'ops-event-3',
      at: null,
      reportStatus: 'unknown',
      alertCount: 0,
      actionableAlertCount: 0,
      critical: 0,
      warning: 0,
      deliveryConfigured: false,
      deliveryStatus: 'unknown',
      deliveryHttpStatus: null,
    });
  });
});
