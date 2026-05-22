export type StoredPriceAlert = {
  id?: string;
  hotelKey?: string;
  hotelName?: string;
  city?: string;
  targetPrice?: number | string;
  currency?: string;
  createdAt?: string;
  status?: 'active' | 'cancelled' | string;
  storage?: 'server' | 'local' | string;
  unsubscribeStatus?: 'configured' | 'not-configured' | string;
  sourcePolicy?: string;
};

export type NormalizedPriceAlert = {
  id?: string;
  hotelKey: string;
  hotelName: string;
  city: string;
  targetPrice: number;
  currency: string;
  createdAt?: string;
  storage: 'server' | 'local';
  unsubscribeStatus: 'configured' | 'not-configured';
  sourcePolicy: string;
};

function cleanText(value: unknown) {
  const text = String(value || '').trim();
  return text.length > 0 ? text : null;
}

export function normalizeStoredPriceAlert(alert: StoredPriceAlert | null | undefined): NormalizedPriceAlert | null {
  if (!alert || alert.status === 'cancelled') return null;

  const hotelKey = cleanText(alert.hotelKey);
  const hotelName = cleanText(alert.hotelName);
  const city = cleanText(alert.city);
  const targetPrice = Number(alert.targetPrice);
  if (!hotelKey || !hotelName || !city || !Number.isFinite(targetPrice) || targetPrice < 0) return null;

  return {
    id: cleanText(alert.id) || undefined,
    hotelKey,
    hotelName,
    city,
    targetPrice,
    currency: cleanText(alert.currency) || 'USD',
    createdAt: cleanText(alert.createdAt) || undefined,
    storage: alert.storage === 'server' ? 'server' : 'local',
    unsubscribeStatus: alert.unsubscribeStatus === 'configured' ? 'configured' : 'not-configured',
    sourcePolicy: cleanText(alert.sourcePolicy) || 'verified-provider-prices-only',
  };
}

export function normalizeStoredPriceAlerts(alerts: StoredPriceAlert[] | null | undefined) {
  if (!Array.isArray(alerts)) return [];
  return alerts.map(normalizeStoredPriceAlert).filter((alert): alert is NormalizedPriceAlert => Boolean(alert));
}

export function priceAlertStorageLabel(alert: NormalizedPriceAlert) {
  return alert.storage === 'server' ? 'Account saved' : 'Local device';
}

export function priceAlertDeliveryLabel(alert: NormalizedPriceAlert) {
  if (alert.storage !== 'server') return 'Delivery unavailable until account storage and provider alerts are configured';
  return alert.unsubscribeStatus === 'configured'
    ? 'Server alert with unsubscribe enabled'
    : 'Server alert saved; unsubscribe delivery not configured';
}
