'use client';

import { useState } from 'react';
import { useLocalStorage } from '@/lib/useLocalStorage';

interface Alert {
  id: string;
  hotelKey: string;
  hotelName: string;
  city: string;
  targetPrice: number;
  currency: string;
  createdAt: string;
}

interface PriceAlertProps {
  hotelKey: string;
  hotelName: string;
  city: string;
  currentPrice?: number;
  currency?: string;
}

export default function PriceAlert({ hotelKey, hotelName, city, currentPrice, currency = 'USD' }: PriceAlertProps) {
  const [alerts, setAlerts] = useLocalStorage<Alert[]>('svbooking:alerts', []);
  const [open, setOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState(
    currentPrice ? Math.round(currentPrice * 0.9).toString() : ''
  );
  const [saved, setSaved] = useState(false);

  const existingAlert = alerts.find((a) => a.hotelKey === hotelKey);

  const saveAlert = () => {
    if (!targetPrice || isNaN(Number(targetPrice))) return;
    const newAlert: Alert = {
      id: `${hotelKey}-${Date.now()}`,
      hotelKey,
      hotelName,
      city,
      targetPrice: Number(targetPrice),
      currency,
      createdAt: new Date().toISOString(),
    };
    setAlerts((prev) => [
      ...prev.filter((a) => a.hotelKey !== hotelKey),
      newAlert,
    ]);
    setSaved(true);
    setTimeout(() => { setSaved(false); setOpen(false); }, 2000);
  };

  const removeAlert = () => {
    setAlerts((prev) => prev.filter((a) => a.hotelKey !== hotelKey));
  };

  if (existingAlert && !open) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        <span>🔔 Alert set: {existingAlert.currency} {existingAlert.targetPrice}/night</span>
        <button
          onClick={removeAlert}
          className="text-red-500 hover:text-red-600 ml-auto text-xs font-medium"
        >
          Remove
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
          🔔 Set price alert
        </button>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h4 className="font-semibold text-amber-800 mb-2 text-sm">
            🔔 Price alert for {hotelName}
          </h4>
          <p className="text-xs text-amber-700 mb-3">
            We&apos;ll store this alert locally. Check back to see if prices dropped.
          </p>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-slate-600">{currency}</span>
            <input
              type="number"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="Target price/night"
              className="flex-1 border border-amber-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-amber-400 outline-none"
            />
            <button
              onClick={saveAlert}
              disabled={!targetPrice}
              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-40 transition"
            >
              {saved ? '✓ Saved!' : 'Save'}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
