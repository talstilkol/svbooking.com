'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PriceAlertData {
  hotelKey: string;
  hotelName: string;
  city: string;
  targetPrice: number;
  currency: string;
  createdAt: string;
}

export default function PriceAlertsDashboard({ className = '' }: { className?: string }) {
  const [alerts, setAlerts] = useState<PriceAlertData[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('price-alerts');
      if (stored) {
        setAlerts(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const removeAlert = (hotelKey: string) => {
    const updated = alerts.filter((a) => a.hotelKey !== hotelKey);
    setAlerts(updated);
    try {
      localStorage.setItem('price-alerts', JSON.stringify(updated));
    } catch {}
  };

  if (alerts.length === 0) return null;

  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Price Alerts</h3>
          <p className="text-xs text-slate-400">
            {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
          🔔 ACTIVE
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
              <p className="text-xs text-slate-400">
                {alert.city} · Target: {alert.currency} {alert.targetPrice.toFixed(0)}/night
              </p>
            </div>
            <button
              onClick={() => removeAlert(alert.hotelKey)}
              className="text-xs text-red-400 hover:text-red-600 shrink-0"
              aria-label={`Remove alert for ${alert.hotelName}`}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
