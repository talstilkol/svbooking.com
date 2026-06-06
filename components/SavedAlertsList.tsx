'use client';

import { useState, useEffect } from 'react';
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

export default function SavedAlertsList({ className = '' }: { className?: string }) {
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
      } catch {}
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
    } catch {}
  };

  if (alerts.length === 0) return null;

  const alertWord = alerts.length === 1 ? t('paAlertSingular') : t('paAlertPlural');
  const storageLabel = (alert: NormalizedPriceAlert) => (
    alert.storage === 'server' ? t('paStorageServer') : t('paStorageLocal')
  );

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">🔔 {t('paActiveListTitle')}</h3>
        <span className="text-[10px] text-slate-500">
          {interpolate(t('paCompactCount'), { count: alerts.length, alertWord })}
        </span>
      </div>
      <div className="divide-y divide-slate-50">
        {alerts.map((alert) => (
          <div key={alert.hotelKey} className="px-5 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <Link
                href={`/hotel/${alert.hotelKey}`}
                className="text-xs font-semibold text-slate-800 hover:text-blue-600 transition truncate block"
              >
                {alert.hotelName}
              </Link>
              <p className="text-[10px] text-slate-500">
                {interpolate(t('paTargetLine'), {
                  city: alert.city,
                  currency: alert.currency,
                  price: alert.targetPrice,
                })}
              </p>
              <p className="text-[10px] text-slate-500">
                {storageLabel(alert)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title={t('paActiveStatus')} />
              <button
                onClick={() => removeAlert(alert.hotelKey)}
                className="text-xs text-slate-500 hover:text-red-500 transition"
                aria-label={interpolate(t('paRemoveAria'), { hotelName: alert.hotelName })}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
