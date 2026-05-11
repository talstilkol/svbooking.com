'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Alert {
  hotelKey: string;
  hotelName: string;
  city: string;
  targetPrice: number;
  currency: string;
  createdAt: string;
}

export default function SavedAlertsList({ className = '' }: { className?: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('price-alerts') || '[]');
      setAlerts(stored);
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
    <div className={`bg-white border border-slate-200 rounded-2xl overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">🔔 Active Price Alerts</h3>
        <span className="text-[10px] text-slate-400">{alerts.length} alert{alerts.length !== 1 ? 's' : ''}</span>
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
              <p className="text-[10px] text-slate-400">
                {alert.city} · Target: {alert.currency} {alert.targetPrice}/night
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Active" />
              <button
                onClick={() => removeAlert(alert.hotelKey)}
                className="text-xs text-slate-400 hover:text-red-500 transition"
                aria-label={`Remove alert for ${alert.hotelName}`}
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
