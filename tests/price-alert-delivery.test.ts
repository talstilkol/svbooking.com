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
    const result = await deliverPriceAlertEvent(event, { env: {}, fetchImpl });

    expect(result).toEqual({ configured: false, status: 'not-configured' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(isPriceAlertDeliveryConfigured({})).toBe(false);
  });

  it('rejects non-HTTPS webhook URLs outside localhost', async () => {
    const fetchImpl = vi.fn();
    const result = await deliverPriceAlertEvent(event, {
      env: {
        PRICE_ALERT_WEBHOOK_URL: 'http://alerts.example.com/hooks/sv-booking',
        PRICE_ALERT_WEBHOOK_SECRET: 'secret-value',
      },
      fetchImpl,
    });

    expect(result).toEqual({ configured: false, status: 'invalid-config' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(isPriceAlertDeliveryConfigured({
      PRICE_ALERT_WEBHOOK_URL: 'http://alerts.example.com/hooks/sv-booking',
      PRICE_ALERT_WEBHOOK_SECRET: 'secret-value',
    })).toBe(false);
    expect(isPriceAlertDeliveryConfigured({
      NODE_ENV: 'development',
      PRICE_ALERT_WEBHOOK_URL: 'http://localhost:8787/hooks/sv-booking',
      PRICE_ALERT_WEBHOOK_SECRET: 'secret-value',
    })).toBe(true);
    expect(isPriceAlertDeliveryConfigured({
      NODE_ENV: 'production',
      PRICE_ALERT_WEBHOOK_URL: 'http://localhost:8787/hooks/sv-booking',
      PRICE_ALERT_WEBHOOK_SECRET: 'secret-value',
    })).toBe(false);
    expect(isPriceAlertDeliveryConfigured({
      PRICE_ALERT_WEBHOOK_URL: 'https://user:pass@alerts.example.com/hooks/sv-booking',
      PRICE_ALERT_WEBHOOK_SECRET: 'secret-value',
    })).toBe(false);
  });

  it('sends only sanitized event payload when webhook config exists', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 202 }));
    const result = await deliverPriceAlertEvent(event, {
      env: {
        PRICE_ALERT_WEBHOOK_URL: 'https://alerts.example.com/hooks/sv-booking',
        PRICE_ALERT_WEBHOOK_SECRET: 'secret-value',
      },
      fetchImpl,
    });

    expect(result).toEqual({ configured: true, status: 'sent', httpStatus: 202 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, request] = fetchImpl.mock.calls[0];
    const body = JSON.parse(request.body);
    expect(body.userFingerprint).toBe('h_user');
    expect(body.unsubscribeToken).toBe('u_0123456789abcdef0123456789abcdef');
    expect(body.unsubscribePath).toContain('/api/price-alerts/unsubscribe');
    expect(JSON.stringify(body)).not.toContain('user_1');
    expect(request.headers.Authorization).toBe('Bearer secret-value');
  });
});
