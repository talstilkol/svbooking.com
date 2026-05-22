'use client';

import { useEffect, useState, useMemo } from 'react';

interface HeatmapDay {
  date: string;
  price: number;
  priceSourceLabel?: string;
}

interface PriceCalendarProps {
  hotelKey: string;
  className?: string;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function priceColor(price: number, min: number, max: number): string {
  if (price <= 0) return 'bg-slate-50 text-slate-300';
  const range = max - min || 1;
  const ratio = (price - min) / range;
  if (ratio <= 0.25) return 'bg-green-100 text-green-800 font-semibold';
  if (ratio <= 0.5) return 'bg-green-50 text-green-700';
  if (ratio <= 0.75) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

export default function PriceCalendar({ hotelKey, className = '' }: PriceCalendarProps) {
  const [loading, setLoading] = useState(false);
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [hasRealData, setHasRealData] = useState(false);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const now = new Date();
  const viewYear = new Date(now.getFullYear(), now.getMonth() + monthOffset).getFullYear();
  const viewMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset).getMonth();

  useEffect(() => {
    if (!expanded || !hotelKey) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) setLoading(true);
    });

    const checkOut = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-28`;
    fetch(
      `/api/cheaper-dates?hotelKey=${hotelKey}&checkIn=${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01&checkOut=${checkOut}&mode=heatmap`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.heatmap && Array.isArray(data.heatmap)) {
          setHeatmap(data.heatmap);
          setHasRealData(Boolean(data.hasRealData && data.heatmap.length > 0));
          setSourceLabel(data.priceSourceLabel || data.heatmap[0]?.priceSourceLabel || null);
        } else {
          setHeatmap([]);
          setHasRealData(false);
          setSourceLabel(null);
        }
      })
      .catch((e) => {
        if (e.name !== 'AbortError') {
          setHeatmap([]);
          setHasRealData(false);
          setSourceLabel(null);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [hotelKey, expanded, viewYear, viewMonth]);

  const priceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of heatmap) {
      map.set(d.date, d.price);
    }
    return map;
  }, [heatmap]);

  const prices = heatmap.map((d) => d.price).filter((p) => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`w-full bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300 transition ${className}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Price Calendar</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              See observed source prices for this hotel
            </p>
          </div>
          <span className="text-blue-600 text-sm font-medium">View →</span>
        </div>
      </button>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Price Calendar</h3>
          <button
            onClick={() => setExpanded(false)}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Collapse ↑
          </button>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setMonthOffset((o) => Math.max(0, o - 1))}
            disabled={monthOffset === 0}
            className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 disabled:opacity-30"
          >
            ←
          </button>
          <span className="text-sm font-medium text-slate-800">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            onClick={() => setMonthOffset((o) => Math.min(5, o + 1))}
            disabled={monthOffset >= 5}
            className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 disabled:opacity-30"
          >
            →
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="p-4">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasRealData ? (
          <div className="h-48 flex items-center justify-center text-center">
            <div>
              <p className="text-sm font-medium text-slate-600">Price calendar unavailable</p>
              <p className="text-xs text-slate-400 mt-1">No verified source observations for this month.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_LABELS.map((d) => (
                <div key={d} className="text-center text-[10px] font-medium text-slate-400 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for offset */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const price = priceMap.get(dateStr) || 0;
                const colorClass = price > 0 ? priceColor(price, minPrice, maxPrice) : 'bg-slate-50 text-slate-300';
                const isToday =
                  day === now.getDate() &&
                  viewMonth === now.getMonth() &&
                  viewYear === now.getFullYear();
                const isPast = new Date(dateStr) < new Date(now.toISOString().split('T')[0]);

                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] relative transition ${colorClass} ${
                      isPast ? 'opacity-40' : ''
                    } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                    title={price > 0 ? `$${price}/night` : 'No data'}
                  >
                    <span className="font-medium">{day}</span>
                    {price > 0 && (
                      <span className="text-[8px] leading-none mt-0.5">
                        ${price}
                      </span>
                    )}
                    {price === minPrice && price > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            {prices.length > 0 && (
              <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-100 border border-green-200" />
                  Cheapest
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-amber-50 border border-amber-200" />
                  Average
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-50 border border-red-200" />
                  Expensive
                </span>
                <span>
                  ${minPrice}–${maxPrice}/night
                </span>
                {sourceLabel && <span>{sourceLabel}</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
