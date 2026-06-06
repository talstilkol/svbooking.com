'use client';

import { useState } from 'react';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { LOCAL_STORAGE_KEYS } from '@/lib/local-storage-keys';
import { useLocale } from '@/components/LocaleProvider';
import {
  type StoredPriceAlert,
  normalizeStoredPriceAlerts,
} from '@/lib/price-alert-local';

interface LocalAlert extends StoredPriceAlert {
  id: string;
  hotelKey: string;
  hotelName: string;
  city: string;
  checkIn?: string;
  checkOut?: string;
  targetPrice: number;
  currency: string;
  storage?: 'server' | 'local';
  unsubscribeStatus?: 'configured' | 'not-configured';
  sourcePolicy?: string;
  createdAt: string;
}

interface PriceAlertProps {
  hotelKey: string;
  hotelName: string;
  city: string;
  checkIn?: string;
  checkOut?: string;
  currentPrice?: number;
  currency?: string;
}

function localAlertId(hotelKey: string, targetPrice: string, currency: string) {
  return `local-${hotelKey}-${currency}-${targetPrice}`.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

export default function PriceAlert({ hotelKey, hotelName, city, checkIn, checkOut, currentPrice, currency = 'USD' }: PriceAlertProps) {
  const { t } = useLocale();
  const [alerts, setAlerts] = useLocalStorage<StoredPriceAlert[]>(LOCAL_STORAGE_KEYS.priceAlerts, []);
  const [open, setOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState(
    currentPrice ? Math.round(currentPrice * 0.9).toString() : ''
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const existingAlert = normalizeStoredPriceAlerts(alerts).find((a) => a.hotelKey === hotelKey);
  const deliveryLabel = (alert: NonNullable<typeof existingAlert>) => {
    if (alert.storage !== 'server') return t('paDeliveryLocalUnavailable');
    return alert.unsubscribeStatus === 'configured'
      ? t('paDeliveryServerUnsubscribe')
      : t('paDeliveryServerNoUnsubscribe');
  };

  const saveAlert = async () => {
    if (!targetPrice || isNaN(Number(targetPrice))) return;
    setSaving(true);
    const fallbackAlert: LocalAlert = {
      id: localAlertId(hotelKey, targetPrice, currency),
      hotelKey,
      hotelName,
      city,
      checkIn,
      checkOut,
      targetPrice: Number(targetPrice),
      currency,
      storage: 'local',
      unsubscribeStatus: 'not-configured',
      sourcePolicy: 'verified-provider-prices-only',
      createdAt: new Date().toISOString(),
    };

    let newAlert = fallbackAlert;
    if (checkIn && checkOut) {
      try {
        const res = await fetch('/api/price-alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hotelKey,
            checkIn,
            checkOut,
            targetPrice: Number(targetPrice),
            currentPrice,
            currency,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          newAlert = { ...fallbackAlert, ...data.alert, storage: 'server' };
        }
      } catch {
        // Local fallback keeps the user workflow available when auth/cloud storage is unavailable.
      }
    }

    setAlerts((prev) => [
      ...prev.filter((a) => a.hotelKey !== hotelKey),
      newAlert,
    ]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); setOpen(false); }, 2000);
  };

  const removeAlert = () => {
    setAlerts((prev) => prev.filter((a) => a.hotelKey !== hotelKey));
  };

  if (existingAlert && !open) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        <span>
          {interpolate(t('paAlertSet'), {
            currency: existingAlert.currency,
            price: existingAlert.targetPrice,
            delivery: deliveryLabel(existingAlert),
          })}
        </span>
        <button
          onClick={removeAlert}
          className="text-red-500 hover:text-red-600 ml-auto text-xs font-medium"
        >
          {t('paRemove')}
        </button>
      </div>
    );
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-amber-600 border border-slate-200 hover:border-amber-300 rounded-lg px-3 py-2 transition-colors"
        >
          🔔 {t('paSetAlert')}
        </button>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h4 className="font-semibold text-amber-800 mb-2 text-sm">
            🔔 {interpolate(t('paTitle'), { hotelName })}
          </h4>
          <p className="text-xs text-amber-700 mb-3">
            {t('paDescription')}
          </p>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-slate-600">{currency}</span>
            <input
              type="number"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder={t('paTargetPlaceholder')}
              className="flex-1 border border-amber-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-amber-400 outline-none"
            />
            <button
              onClick={saveAlert}
              disabled={!targetPrice || saving}
              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-40 transition"
            >
              {saving ? t('paSaving') : saved ? `✓ ${t('paSaved')}` : t('paSave')}
            </button>
            <button
              onClick={() => setOpen(false)}
              aria-label={t('paClose')}
              className="text-slate-500 hover:text-slate-600 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
