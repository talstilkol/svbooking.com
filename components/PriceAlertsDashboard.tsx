'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LOCAL_STORAGE_KEYS, readLocalStorageJsonWithFallback, writeLocalStorageJson } from '@/lib/local-storage-keys';
import { useLocale } from '@/components/LocaleProvider';
import {
  type NormalizedPriceAlert,
  type StoredPriceAlert,
  normalizeStoredPriceAlerts,
} from '@/lib/price-alert-local';

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

export default function PriceAlertsDashboard({ className = '' }: { className?: string }) {
  const { t } = useLocale();
  const [alerts, setAlerts] = useState<NormalizedPriceAlert[]>([]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        setAlerts(normalizeStoredPriceAlerts(
          readLocalStorageJsonWithFallback<StoredPriceAlert[]>(LOCAL_STORAGE_KEYS.priceAlerts, [], [])
        ));
      } catch (err) {
        console.warn('PriceAlertsDashboard: failed to read saved alerts', err);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const removeAlert = (hotelKey: string) => {
    const updated = alerts.filter((a) => a.hotelKey !== hotelKey);
    setAlerts(updated);
    try {
      writeLocalStorageJson(LOCAL_STORAGE_KEYS.priceAlerts, updated);
    } catch (err) {
      console.warn('PriceAlertsDashboard: failed to persist alert removal', err);
    }
  };

  if (alerts.length === 0) return null;

  const activeCountLabel = interpolate(
    t(alerts.length === 1 ? 'paActiveCountSingular' : 'paActiveCountPlural'),
    { count: alerts.length }
  );
  const storageLabel = (alert: NormalizedPriceAlert) => (
    alert.storage === 'server' ? t('paStorageServer') : t('paStorageLocal')
  );
  const deliveryLabel = (alert: NormalizedPriceAlert) => {
    if (alert.storage !== 'server') return t('paDeliveryLocalUnavailable');
    return alert.unsubscribeStatus === 'configured'
      ? t('paDeliveryServerUnsubscribe')
      : t('paDeliveryServerNoUnsubscribe');
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">{t('paDashboardTitle')}</h3>
          <p className="text-xs text-slate-500">
            {activeCountLabel}
          </p>
        </div>
        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
          {t('paWatching')}
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {alerts.map((alert) => (
          <div
            key={alert.hotelKey}
            className="p-4 flex items-center gap-3 hover:bg-slate-50 transition"
          >
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-sm">🔔</span>
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={`/hotel/${alert.hotelKey}`}
                className="text-sm font-medium text-slate-800 hover:text-blue-600 transition truncate block"
              >
                {alert.hotelName}
              </Link>
              <p className="text-xs text-slate-500">
                {interpolate(t('paTargetLine'), {
                  city: alert.city,
                  currency: alert.currency,
                  price: alert.targetPrice.toFixed(0),
                })}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {storageLabel(alert)} · {deliveryLabel(alert)}
              </p>
            </div>
            <button
              onClick={() => removeAlert(alert.hotelKey)}
              className="text-xs text-red-400 hover:text-red-600 shrink-0"
              aria-label={interpolate(t('paRemoveAria'), { hotelName: alert.hotelName })}
            >
              {t('paRemove')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
