import { describe, expect, it } from 'vitest';
import {
  normalizeStoredPriceAlert,
  normalizeStoredPriceAlerts,
  priceAlertDeliveryLabel,
  priceAlertStorageLabel,
} from '@/lib/price-alert-local';

describe('local price alert normalization', () => {
  it('keeps valid local watches explicit about local-only delivery', () => {
    const alert = normalizeStoredPriceAlert({
      hotelKey: 'g297930-d305178',
      hotelName: 'Patong Beach Hotel',
      city: 'Phuket',
      targetPrice: '120',
      currency: 'USD',
      storage: 'local',
    });

    expect(alert).toMatchObject({
      hotelKey: 'g297930-d305178',
      hotelName: 'Patong Beach Hotel',
      city: 'Phuket',
      targetPrice: 120,
      storage: 'local',
      unsubscribeStatus: 'not-configured',
      sourcePolicy: 'verified-provider-prices-only',
    });
    expect(priceAlertStorageLabel(alert!)).toBe('Local device');
    expect(priceAlertDeliveryLabel(alert!)).toContain('Delivery unavailable');
  });

  it('filters cancelled and malformed stored records instead of showing them as active', () => {
    const alerts = normalizeStoredPriceAlerts([
      {
        hotelKey: 'g297930-d305178',
        hotelName: 'Patong Beach Hotel',
        city: 'Phuket',
        targetPrice: 120,
        currency: 'USD',
        status: 'cancelled',
      },
      {
        hotelKey: 'g3145596-d3145596',
        hotelName: 'Le Meurice',
        city: 'Paris',
        targetPrice: 480,
        currency: 'EUR',
        storage: 'server',
        unsubscribeStatus: 'configured',
      },
      {
        hotelKey: 'missing-price',
        hotelName: 'Incomplete',
        city: 'Paris',
      },
    ]);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].hotelName).toBe('Le Meurice');
    expect(priceAlertStorageLabel(alerts[0])).toBe('Account saved');
    expect(priceAlertDeliveryLabel(alerts[0])).toBe('Server alert with unsubscribe enabled');
  });

  it('defaults sparse valid alerts and labels server alerts without unsubscribe delivery honestly', () => {
    expect(normalizeStoredPriceAlerts(null)).toEqual([]);
    expect(normalizeStoredPriceAlerts({} as Parameters<typeof normalizeStoredPriceAlerts>[0])).toEqual([]);

    const alert = normalizeStoredPriceAlert({
      id: '   ',
      hotelKey: 'g187147-d188728',
      hotelName: 'Le Meurice',
      city: 'Paris',
      targetPrice: 550,
      currency: '',
      createdAt: '',
      storage: 'server',
      unsubscribeStatus: 'not-configured',
      sourcePolicy: '',
    });

    expect(alert).toMatchObject({
      id: undefined,
      currency: 'USD',
      createdAt: undefined,
      storage: 'server',
      unsubscribeStatus: 'not-configured',
      sourcePolicy: 'verified-provider-prices-only',
    });
    expect(priceAlertDeliveryLabel(alert!)).toBe('Server alert saved; unsubscribe delivery not configured');
  });
});
