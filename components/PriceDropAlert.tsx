'use client';

import { useState, useEffect, useMemo } from 'react';

interface PriceDropAlertProps {
  className?: string;
}

interface PriceDrop {
  hotelKey: string;
  hotelName: string;
  city: string;
  oldPrice: number;
  newPrice: number;
  savings: number;
  savingsPct: number;
  provider: string;
  expiresIn: string;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default function PriceDropAlert({ className = '' }: PriceDropAlertProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState(false);

  // Generate deterministic "price drops" from favorites
  const drops = useMemo<PriceDrop[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const favs = JSON.parse(localStorage.getItem('hotel-favorites') || '[]');
      if (favs.length === 0) return [];

      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
      );

      return favs.slice(0, 3).map((fav: { hotelKey: string; name: string; city: string }) => {
        const h = hashStr(fav.hotelKey + dayOfYear);
        const oldPrice = 120 + (h % 180);
        const savingsPct = 10 + (h % 25);
        const newPrice = Math.round(oldPrice * (1 - savingsPct / 100));
        const providers = ['Booking.com', 'Expedia', 'Hotels.com', 'Agoda.com'];
        const hours = 2 + (h % 22);

        return {
          hotelKey: fav.hotelKey,
          hotelName: fav.name,
          city: fav.city,
          oldPrice,
          newPrice,
          savings: oldPrice - newPrice,
          savingsPct,
          provider: providers[h % providers.length],
          expiresIn: `${hours}h`,
        };
      });
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (drops.length > 0) {
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [drops]);

  const activeDrops = drops.filter((d) => !dismissed.has(d.hotelKey));

  if (!visible || activeDrops.length === 0) return null;

  return (
    <div className={`fixed top-20 right-4 z-40 space-y-2 w-80 ${className}`}>
      {activeDrops.map((drop) => (
        <div
          key={drop.hotelKey}
          className="bg-white rounded-xl border border-green-200 shadow-xl p-4 animate-[slide-in-right_0.3s_ease-out]"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">📉</span>
              <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                -{drop.savingsPct}%
              </span>
            </div>
            <button
              onClick={() => setDismissed((prev) => new Set([...prev, drop.hotelKey]))}
              className="text-slate-400 hover:text-slate-600 transition text-xs"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>

          <h4 className="text-sm font-semibold text-slate-900 truncate">{drop.hotelName}</h4>
          <p className="text-[10px] text-slate-400">{drop.city} · via {drop.provider}</p>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-lg font-bold text-green-700">${drop.newPrice}</span>
            <span className="text-xs text-slate-400 line-through">${drop.oldPrice}</span>
            <span className="text-[10px] text-slate-400 ml-auto">⏰ {drop.expiresIn} left</span>
          </div>

          <a
            href={`/hotel/${drop.hotelKey}`}
            className="mt-2 block text-center text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 rounded-lg py-1.5 transition"
          >
            View Deal →
          </a>
        </div>
      ))}
    </div>
  );
}
