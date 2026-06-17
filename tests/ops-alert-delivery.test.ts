import { describe, expect, it, vi } from 'vitest';
import {
  deliverOpsAlertReport,
  isOpsAlertDeliveryConfigured,
} from '@/lib/ops-alert-delivery';

const report = {
  service: 'sv-booking',
  checkedAt: '2026-05-14T12:00:00.000Z',
  status: 'critical',
  summary: { total: 1, critical: 1, warning: 0, info: 0, apiKey: 'summary-secret' },
  alerts: [{
    id: 'cache-not-durable',
    severity: 'critical',
    domain: 'production-readiness',
    message: 'Persistent KV cache is not configured.',
    evidence: {
      cacheMode: 'memory',
      webhookSecret: 'alert-evidence-secret',
      nested: { authorization: 'Bearer hidden' },
    },
    action: 'Configure persistent Redis/KV before production scale.',
    internalToken: 'alert-token',
  }],
  evidence: {
    healthStatus: 'error',
    providerApiKey: 'provider-secret',
  },
};

describe('ops alert delivery', () => {
  it('requires a valid webhook URL and secret before reporting configured', () => {
    expect(isOpsAlertDeliveryConfigured({
      OPS_ALERT_WEBHOOK_URL: '',
      OPS_ALERT_WEBHOOK_SECRET: '',
    } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isOpsAlertDeliveryConfigured({
      OPS_ALERT_WEBHOOK_URL: 'http://ops.svbooking.com/hook',
      OPS_ALERT_WEBHOOK_SECRET: 'svbooking-ops-alert-secret-0001',
    } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isOpsAlertDeliveryConfigured({
      OPS_ALERT_WEBHOOK_URL: 'https://ops.svbooking.invalid/hook',
      OPS_ALERT_WEBHOOK_SECRET: 'svbooking-ops-alert-secret-0001',
    } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isOpsAlertDeliveryConfigured({
      OPS_ALERT_WEBHOOK_URL: 'https://ops.svbooking.com/hook',
      OPS_ALERT_WEBHOOK_SECRET: 'svbooking-ops-alert-secret-0001',
    } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(isOpsAlertDeliveryConfigured({
      NODE_ENV: 'development',
      OPS_ALERT_WEBHOOK_URL: 'http://localhost:8787/hook',
      OPS_ALERT_WEBHOOK_SECRET: 'svbooking-ops-alert-secret-0001',
    } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(isOpsAlertDeliveryConfigured({
      NODE_ENV: 'production',
      OPS_ALERT_WEBHOOK_URL: 'http://localhost:8787/hook',
      OPS_ALERT_WEBHOOK_SECRET: 'svbooking-ops-alert-secret-0001',
    } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isOpsAlertDeliveryConfigured({
      OPS_ALERT_WEBHOOK_URL: 'https://user:pass@ops.svbooking.com/hook',
      OPS_ALERT_WEBHOOK_SECRET: 'svbooking-ops-alert-secret-0001',
    } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isOpsAlertDeliveryConfigured({
      OPS_ALERT_WEBHOOK_URL: 'https://ops.svbooking.com/hook',
      OPS_ALERT_WEBHOOK_SECRET: 'secret',
    } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it('sends only sanitized alert evidence to the configured webhook', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const result = await deliverOpsAlertReport(report, {
      env: {
        OPS_ALERT_WEBHOOK_URL: 'https://ops.svbooking.com/hook',
        OPS_ALERT_WEBHOOK_SECRET: 'svbooking-ops-alert-secret-0001',
      } as unknown as NodeJS.ProcessEnv,
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), init: init || {} });
        return new Response('{}', { status: 202 });
      },
    });

    expect(result).toEqual({ configured: true, status: 'sent', httpStatus: 202 });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://ops.svbooking.com/hook');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer svbooking-ops-alert-secret-0001');

    const payload = JSON.parse(String(calls[0].init.body));
    expect(payload.service).toBe('sv-booking');
    expect(payload.alerts).toHaveLength(1);
    expect(payload.alerts[0]).toEqual({
      id: 'cache-not-durable',
      severity: 'critical',
      domain: 'production-readiness',
      message: 'Persistent KV cache is not configured.',
      evidence: {
        cacheMode: 'memory',
        webhookSecret: '[redacted]',
        nested: { authorization: '[redacted]' },
      },
      action: 'Configure persistent Redis/KV before production scale.',
    });
    expect(JSON.stringify(payload)).not.toContain('svbooking-ops-alert-secret-0001');
    expect(JSON.stringify(payload)).not.toContain('alert-token');
    expect(JSON.stringify(payload)).not.toContain('provider-secret');
    expect(JSON.stringify(payload)).not.toContain('summary-secret');
    expect(JSON.stringify(payload)).not.toContain('Bearer hidden');

    const sparseReport = {
      ...report,
      alerts: [{
        id: 'sparse-alert',
        severity: 'warning',
        domain: 'ops',
        message: 'Sparse alert.',
      }],
    };
    await deliverOpsAlertReport(sparseReport, {
      env: {
        OPS_ALERT_WEBHOOK_URL: 'https://ops.svbooking.com/hook',
        OPS_ALERT_WEBHOOK_SECRET: 'svbooking-ops-alert-secret-0001',
      } as unknown as NodeJS.ProcessEnv,
      fetchImpl: async (_url, init) => {
        calls.push({ init: init || {}, url: 'https://ops.svbooking.com/hook' });
        return new Response('{}', { status: 202 });
      },
    });
    expect(JSON.parse(String(calls[1].init.body)).alerts[0].evidence).toEqual({});
  });

  it('sends an empty alert list when a report has no alert array', async () => {
    const calls: Array<{ init: RequestInit }> = [];
    const result = await deliverOpsAlertReport({
      service: 'sv-booking',
      checkedAt: '2026-05-14T12:00:00.000Z',
      status: 'healthy',
      summary: { total: 0 },
      evidence: undefined,
    }, {
      env: {
        OPS_ALERT_WEBHOOK_URL: 'https://ops.svbooking.com/hook',
        OPS_ALERT_WEBHOOK_SECRET: 'svbooking-ops-alert-secret-0001',
      } as unknown as NodeJS.ProcessEnv,
      fetchImpl: async (_url, init) => {
        calls.push({ init: init || {} });
        return new Response('{}', { status: 202 });
      },
    });

    expect(result).toEqual({ configured: true, status: 'sent', httpStatus: 202 });
    expect(JSON.parse(String(calls[0].init.body)).alerts).toEqual([]);
  });

  it('returns explicit unavailable states without attempting delivery', async () => {
    const missing = await deliverOpsAlertReport(report, {
      env: {
        OPS_ALERT_WEBHOOK_URL: '',
        OPS_ALERT_WEBHOOK_SECRET: '',
      } as unknown as NodeJS.ProcessEnv,
      fetchImpl: async () => new Response('{}'),
    });
    const invalid = await deliverOpsAlertReport(report, {
      env: {
        OPS_ALERT_WEBHOOK_URL: 'ftp://ops.svbooking.invalid/hook',
        OPS_ALERT_WEBHOOK_SECRET: 'svbooking-ops-alert-secret-0001',
      } as unknown as NodeJS.ProcessEnv,
      fetchImpl: async () => new Response('{}'),
    });

    expect(missing).toEqual({ configured: false, status: 'not-configured' });
    expect(invalid).toEqual({ configured: false, status: 'invalid-config' });
  });

  it('reports webhook failures without leaking deeply nested alert values', async () => {
    const calls: Array<{ init: RequestInit }> = [];
    const failed = await deliverOpsAlertReport({
      service: 'sv-booking',
      checkedAt: '2026-05-14T12:00:00.000Z',
      status: 'warning',
      summary: [{ nested: { a: { b: { c: { d: { e: { f: 'too deep' } } } } } } }],
      alerts: [{
        id: 'provider-warning',
        severity: 'warning',
        domain: 'providers',
        message: 'Provider probe failed.',
        evidence: {
          items: [null, undefined, { apiToken: 'must-not-leak' }],
        },
      }],
      evidence: null,
    }, {
      env: {
        OPS_ALERT_WEBHOOK_URL: 'https://ops.svbooking.com/hook',
        OPS_ALERT_WEBHOOK_SECRET: 'svbooking-ops-alert-secret-0001',
      } as unknown as NodeJS.ProcessEnv,
      fetchImpl: async (_url, init) => {
        calls.push({ init: init || {} });
        return new Response('{}', { status: 503 });
      },
    });

    expect(failed).toEqual({ configured: true, status: 'failed', httpStatus: 503 });
    const payload = JSON.parse(String(calls[0].init.body));
    expect(JSON.stringify(payload)).not.toContain('must-not-leak');
    expect(JSON.stringify(payload)).toContain('[redacted]');
    expect(JSON.stringify(payload)).toContain('[redacted-depth]');

    const thrown = await deliverOpsAlertReport(report, {
      env: {
        OPS_ALERT_WEBHOOK_URL: 'https://ops.svbooking.com/hook',
        OPS_ALERT_WEBHOOK_SECRET: 'svbooking-ops-alert-secret-0001',
      } as unknown as NodeJS.ProcessEnv,
      fetchImpl: async () => {
        throw new Error('webhook unavailable');
      },
    });
    expect(thrown).toEqual({ configured: true, status: 'failed' });
  });

  it('aborts slow webhook delivery attempts', async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn((_url: string | URL | Request, init?: RequestInit) => (
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        })
      )) as unknown as typeof fetch;

      const pending = deliverOpsAlertReport(report, {
        env: {
          OPS_ALERT_WEBHOOK_URL: 'https://ops.svbooking.com/hook',
          OPS_ALERT_WEBHOOK_SECRET: 'svbooking-ops-alert-secret-0001',
        } as unknown as NodeJS.ProcessEnv,
        fetchImpl,
      });

      await vi.advanceTimersByTimeAsync(5000);

      await expect(pending).resolves.toEqual({ configured: true, status: 'failed' });
    } finally {
      vi.useRealTimers();
    }
  });
});
