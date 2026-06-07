'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/LocaleProvider';

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
  const { t } = useLocale();
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
        <span className="text-xs text-slate-500">{t('priceTrendLoading')}</span>
      </div>
    );
  }

  if (error || points.length === 0) return null;

  const positivePoints = points
    .map((point, idx) => ({ point, idx }))
    .filter(({ point }) => point.price > 0);
  if (positivePoints.length === 0) return null;

  const prices = positivePoints.map(({ point }) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const cheapestIdx = positivePoints.find(({ point }) => point.price === min)?.idx ?? -1;
  const sourceLabel = points.find((p) => p.priceSourceLabel)?.priceSourceLabel;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">{t('priceTrendHeading')}</h3>
        <span className="text-xs text-slate-500">
          {currency} {min.toFixed(0)} – {max.toFixed(0)}/{t('priceTrendPerNight')}
        </span>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1 h-20 relative" role="img" aria-label={t('priceTrendChartLabel')}>
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
                data-testid="price-trend-bar"
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
        {t('priceTrendCheapestObserved')} · {t('priceTrendHoverExact')}{sourceLabel ? ` · ${sourceLabel}` : ''}
      </p>
    </div>
  );
}
