'use client';

import { useState, useEffect } from 'react';

interface PriceHistoryProps {
  hotelKey: string;
  className?: string;
}

interface PricePoint {
  date: string;
  price: number;
  provider?: string;
}

export default function PriceHistory({ hotelKey, className = '' }: PriceHistoryProps) {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [realData, setRealData] = useState<PricePoint[] | null>(null);
  const [hasRealData, setHasRealData] = useState(false);
  const [loading, setLoading] = useState(true);

  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });

    fetch(`/api/price-history?hotelKey=${encodeURIComponent(hotelKey)}&period=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.hasRealData && Array.isArray(d.points) && d.points.length > 0) {
          setRealData(d.points);
          setHasRealData(true);
        } else {
          setRealData(null);
          setHasRealData(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRealData(null);
          setHasRealData(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [hotelKey, days]);

  const data = hasRealData && realData ? realData : [];
  const hasChartData = data.length > 0;

  if (loading) {
    return (
      <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">&#128200; Price History</h3>
        </div>
        <div className="w-full h-24 bg-slate-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!hasChartData) {
    return (
      <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">&#128200; Price History</h3>
          <span className="text-[9px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
            Unavailable
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Real price history is unavailable for this hotel until live comparison snapshots are collected.
        </p>
      </div>
    );
  }

  const minPrice = Math.min(...data.map((d) => d.price));
  const maxPrice = Math.max(...data.map((d) => d.price));
  const avgPrice = Math.round(data.reduce((sum, d) => sum + d.price, 0) / data.length);
  const currentPrice = data[data.length - 1]?.price || 0;
  const range = maxPrice - minPrice || 1;

  // SVG path
  const W = 400;
  const H = 120;
  const padding = 5;

  const points = data.map((d, i) => {
    const x = padding + ((W - 2 * padding) / (data.length - 1)) * i;
    const y = padding + ((H - 2 * padding) * (maxPrice - d.price)) / range;
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${W - padding},${H - padding} L ${padding},${H - padding} Z`;

  const isDown = currentPrice < avgPrice;

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">&#128200; Price History</h3>
          {!loading && hasRealData && (
            <span className="text-[9px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
              Real data
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-1 rounded text-[10px] font-medium transition ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-3">
        <div>
          <p className="text-[10px] text-slate-400">Current</p>
          <p className={`text-sm font-bold ${isDown ? 'text-green-600' : 'text-slate-900'}`}>
            ${currentPrice}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400">Average</p>
          <p className="text-sm font-bold text-slate-900">${avgPrice}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400">Lowest</p>
          <p className="text-sm font-bold text-green-600">${minPrice}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400">Highest</p>
          <p className="text-sm font-bold text-red-600">${maxPrice}</p>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="w-full h-24 bg-slate-100 rounded-lg animate-pulse" />
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`grad-${hotelKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isDown ? '#22C55E' : '#3B82F6'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={isDown ? '#22C55E' : '#3B82F6'} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={areaPath} fill={`url(#grad-${hotelKey})`} />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke={isDown ? '#22C55E' : '#3B82F6'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Min dot */}
          {(() => {
            const minIdx = data.findIndex((d) => d.price === minPrice);
            const x = padding + ((W - 2 * padding) / (data.length - 1)) * minIdx;
            const y = padding + ((H - 2 * padding) * (maxPrice - minPrice)) / range;
            return <circle cx={x} cy={y} r="3" fill="#22C55E" />;
          })()}

          {/* Current dot */}
          {(() => {
            const x = W - padding;
            const y = padding + ((H - 2 * padding) * (maxPrice - currentPrice)) / range;
            return <circle cx={x} cy={y} r="3" fill={isDown ? '#22C55E' : '#3B82F6'} />;
          })()}
        </svg>
      )}

      {/* Verdict */}
      <div className={`mt-3 p-2 rounded-lg text-xs font-medium text-center ${
        isDown ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
      }`}>
        {isDown
          ? `&#128176; Price is ${Math.round(((avgPrice - currentPrice) / avgPrice) * 100)}% below average — good time to book!`
          : `&#128202; Price is near or above average — consider flexible dates for savings`}
      </div>
    </div>
  );
}
