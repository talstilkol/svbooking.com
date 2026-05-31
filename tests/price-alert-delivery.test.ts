import { describe, expect, it, vi } from 'vitest';
import { deliverPriceAlertEvent, isPriceAlertDeliveryConfigured } from '@/lib/price-alert-delivery';

const event = {
  id: 'h_event',
  userFingerprint: 'h_user',
  alertId: 'h_alert',
  hotelKey: 'g1-d1',
  observedPrice: 95,
  targetPrice: 100,
  currency: 'USD',
  provider: 'Provider A',
  at: '2026-05-14T10:00:00.000Z',
  unsubscribeToken: 'u_0123456789abcdef0123456789abcdef',
  unsubscribePath: '/api/price-alerts/unsubscribe?token=u_0123456789abcdef0123456789abcdef',
  uid: 'user_1',
};

describe('price alert delivery', () => {
  it('does not send when webhook config is missing', async () => {
    const fetchImpl = vi.fn();
    const result = await deliverPriceAlertEvent(event, { env: {} as unknown as NodeJS.ProcessEnv, fetchImpl });

    expect(result).toEqual({ configured: false, status: 'not-configured' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(isPriceAlertDeliveryConfigured({} as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it('rejects non-HTTPS webhook URLs outside localhost', async () => {
    const fetchImpl = vi.fn();
    const result = await deliverPriceAlertEvent(event, {
      env: {
        PRICE_ALERT_WEBHOOK_URL: 'http://alerts.svbooking.com/hooks/sv-booking',
        PRICE_ALERT_WEBHOOK_SECRET: 'svbooking-price-alert-secret-0001',
      } as unknown as NodeJS.ProcessEnv,
      fetchImpl,
    });

    expect(result).toEqual({ configured: false, status: 'invalid-config' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(isPriceAlertDeliveryConfigured({
      PRICE_ALERT_WEBHOOK_URL: 'http://alerts.svbooking.com/hooks/sv-booking',
      PRICE_ALERT_WEBHOOK_SECRET: 'svbooking-price-alert-secret-0001',
    } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isPriceAlertDeliveryConfigured({
      NODE_ENV: 'development',
      PRICE_ALERT_WEBHOOK_URL: 'http://localhost:8787/hooks/sv-booking',
      PRICE_ALERT_WEBHOOK_SECRET: 'svbooking-price-alert-secret-0001',
    } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(isPriceAlertDeliveryConfigured({
      NODE_ENV: 'production',
      PRICE_ALERT_WEBHOOK_URL: 'http://localhost:8787/hooks/sv-booking',
      PRICE_ALERT_WEBHOOK_SECRET: 'svbooking-price-alert-secret-0001',
    } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isPriceAlertDeliveryConfigured({
      PRICE_ALERT_WEBHOOK_URL: 'https://user:pass@alerts.svbooking.com/hooks/sv-booking',
      PRICE_ALERT_WEBHOOK_SECRET: 'svbooking-price-alert-secret-0001',
    } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isPriceAlertDeliveryConfigured({
      PRICE_ALERT_WEBHOOK_URL: 'https://alerts.svbooking.com/hooks/sv-booking',
      PRICE_ALERT_WEBHOOK_SECRET: 'secret',
    } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it('sends only sanitized event payload when webhook config exists', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 202 })) as unknown as typeof fetch;
    const result = await deliverPriceAlertEvent(event, {
      env: {
        PRICE_ALERT_WEBHOOK_URL: 'https://alerts.svbooking.com/hooks/sv-booking',
        PRICE_ALERT_WEBHOOK_SECRET: 'svbooking-price-alert-secret-0001',
      } as unknown as NodeJS.ProcessEnv,
      fetchImpl,
    });

    expect(result).toEqual({ configured: true, status: 'sent', httpStatus: 202 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, request] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    const body = JSON.parse(request!.body as string);
    expect(body.userFingerprint).toBe('h_user');
    expect(body.unsubscribeToken).toBe('u_0123456789abcdef0123456789abcdef');
    expect(body.unsubscribePath).toContain('/api/price-alerts/unsubscribe');
    expect(JSON.stringify(body)).not.toContain('user_1');
    expect((request! as Record<string, unknown> & { headers: Record<string, string> }).headers.Authorization).toBe('Bearer svbooking-price-alert-secret-0001');
  });

  it('marks non-2xx webhook responses as failed without leaking unsubscribe defaults', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 503 })) as unknown as typeof fetch;
    const result = await deliverPriceAlertEvent({
      ...event,
      unsubscribeToken: '',
      unsubscribePath: '',
    }, {
      env: {
        PRICE_ALERT_WEBHOOK_URL: 'https://alerts.svbooking.com/hooks/sv-booking',
        PRICE_ALERT_WEBHOOK_SECRET: 'svbooking-price-alert-secret-0001',
      } as unknown as NodeJS.ProcessEnv,
      fetchImpl,
    });

    expect(result).toEqual({ configured: true, status: 'failed', httpStatus: 503 });
    const [, request] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    const body = JSON.parse(request!.body as string);
    expect(body.unsubscribeToken).toBeNull();
    expect(body.unsubscribePath).toBeNull();
    expect(JSON.stringify(body)).not.toContain('user_1');
  });

  it('reports failed delivery when the webhook request throws', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('webhook unavailable');
    }) as unknown as typeof fetch;
    const result = await deliverPriceAlertEvent(event, {
      env: {
        PRICE_ALERT_WEBHOOK_URL: 'https://alerts.svbooking.com/hooks/sv-booking',
        PRICE_ALERT_WEBHOOK_SECRET: 'svbooking-price-alert-secret-0001',
      } as unknown as NodeJS.ProcessEnv,
      fetchImpl,
    });

    expect(result).toEqual({ configured: true, status: 'failed' });
  });

  it('aborts slow webhook delivery attempts', async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn((_url: string | URL | Request, init?: RequestInit) => (
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        })
      )) as unknown as typeof fetch;

      const pending = deliverPriceAlertEvent(event, {
        env: {
          PRICE_ALERT_WEBHOOK_URL: 'https://alerts.svbooking.com/hooks/sv-booking',
          PRICE_ALERT_WEBHOOK_SECRET: 'svbooking-price-alert-secret-0001',
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
