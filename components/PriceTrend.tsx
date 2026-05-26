'use client';

import { useEffect, useState } from 'react';

interface PricePoint {
  date: string; // YYYY-MM-DD
  price: number;
  label: string; // e.g. "Mon", "Jan 5"
  priceSourceLabel?: string;
}

interface PriceTrendProps {
  hotelKey: string;
  nights?: number;
  currency?: string;
}

export default function PriceTrend({ hotelKey, nights = 1, currency = 'USD' }: PriceTrendProps) {
  const [points, setPoints] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!hotelKey) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setError('');
    });

    fetch(`/api/deals?hotelKey=${hotelKey}&nights=${nights}&currency=${currency}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.trend && Array.isArray(data.trend)) {
          setPoints(data.trend);
        }
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError('');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [hotelKey, nights, currency]);

  if (loading) {
    return (
      <div className="h-24 bg-slate-50 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-xs text-slate-500">Loading price trend…</span>
      </div>
    );
  }

  if (error || points.length === 0) return null;

  const prices = points.map((p) => p.price).filter((p) => p > 0);
  if (prices.length === 0) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const cheapestIdx = prices.indexOf(min);
  const sourceLabel = points.find((p) => p.priceSourceLabel)?.priceSourceLabel;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">30-day price trend</h3>
        <span className="text-xs text-slate-500">
          {currency} {min.toFixed(0)} – {max.toFixed(0)}/night
        </span>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1 h-20 relative" role="img" aria-label="Price trend chart">
        {points.map((p, idx) => {
          const heightPct = p.price > 0 ? ((p.price - min) / range) * 70 + 30 : 10;
          const isCheapest = idx === cheapestIdx;
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={p.date}
              className="flex-1 flex flex-col items-center justify-end h-full cursor-pointer group"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                  {p.label}: {currency} {p.price.toFixed(0)}
                </div>
              )}
              <div
                style={{ height: `${heightPct}%` }}
                className={`w-full rounded-t transition-all ${
                  isCheapest
                    ? 'bg-green-400 group-hover:bg-green-500'
                    : isHovered
                    ? 'bg-blue-400'
                    : 'bg-blue-200 group-hover:bg-blue-300'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels — show every ~5th */}
      <div className="flex gap-1 mt-1">
        {points.map((p, idx) => (
          <div key={p.date} className="flex-1 text-center">
            {idx % 5 === 0 && (
              <span className="text-[10px] text-slate-500">{p.label}</span>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500 mt-2 text-center">
        Cheapest observed date · Hover bars for exact price{sourceLabel ? ` · ${sourceLabel}` : ''}
      </p>
    </div>
  );
}
