'use client';

import { useState, useMemo } from 'react';

interface PricePoint {
  date: string;
  price: number;
  label: string;
}

interface PriceHistoryChartProps {
  points: PricePoint[];
  currency?: string;
  className?: string;
}

export default function PriceHistoryChart({
  points,
  currency = 'USD',
  className = '',
}: PriceHistoryChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const { validPoints, min, max, avg, cheapestIdx } = useMemo(() => {
    const valid = points.filter((p) => p.price > 0);
    if (valid.length === 0) return { validPoints: [], min: 0, max: 0, avg: 0, cheapestIdx: -1 };
    const prices = valid.map((p) => p.price);
    const mn = Math.min(...prices);
    const mx = Math.max(...prices);
    const av = prices.reduce((s, p) => s + p, 0) / prices.length;
    const ci = prices.indexOf(mn);
    return { validPoints: valid, min: mn, max: mx, avg: av, cheapestIdx: ci };
  }, [points]);

  if (validPoints.length < 2) return null;

  const W = 600;
  const H = 200;
  const PAD_X = 40;
  const PAD_Y = 20;
  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_Y * 2;
  const range = max - min || 1;

  const getX = (i: number) => PAD_X + (i / (validPoints.length - 1)) * chartW;
  const getY = (price: number) =>
    PAD_Y + chartH - ((price - min) / range) * chartH;

  // Build SVG path for line
  const linePath = validPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${getX(i).toFixed(1)},${getY(p.price).toFixed(1)}`)
    .join(' ');

  // Build gradient fill area
  const areaPath = `${linePath} L${getX(validPoints.length - 1).toFixed(1)},${H - PAD_Y} L${PAD_X},${H - PAD_Y} Z`;

  // Average line Y
  const avgY = getY(avg);

  const hoveredPoint = hoveredIdx !== null ? validPoints[hoveredIdx] : null;

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Price History</h3>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-500 inline-block rounded" /> Price
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-slate-300 inline-block rounded border-dashed" /> Average
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Cheapest
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-green-600 uppercase font-medium">Low</p>
          <p className="text-sm font-bold text-green-700">
            {currency} {min.toFixed(0)}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-slate-500 uppercase font-medium">Average</p>
          <p className="text-sm font-bold text-slate-700">
            {currency} {avg.toFixed(0)}
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-red-600 uppercase font-medium">High</p>
          <p className="text-sm font-bold text-red-700">
            {currency} {max.toFixed(0)}
          </p>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Price history line chart"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = PAD_Y + chartH * (1 - pct);
            const price = min + range * pct;
            return (
              <g key={pct}>
                <line
                  x1={PAD_X}
                  y1={y}
                  x2={W - PAD_X}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth={0.5}
                />
                <text
                  x={PAD_X - 4}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 text-[9px]"
                >
                  {price.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Average dashed line */}
          <line
            x1={PAD_X}
            y1={avgY}
            x2={W - PAD_X}
            y2={avgY}
            stroke="#94a3b8"
            strokeWidth={1}
            strokeDasharray="4,3"
          />

          {/* Fill area */}
          <path d={areaPath} fill="url(#priceGrad)" />

          {/* Price line */}
          <path
            d={linePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Cheapest marker */}
          {cheapestIdx >= 0 && (
            <circle
              cx={getX(cheapestIdx)}
              cy={getY(validPoints[cheapestIdx].price)}
              r={5}
              fill="#22c55e"
              stroke="white"
              strokeWidth={2}
            />
          )}

          {/* Hover markers */}
          {hoveredIdx !== null && (
            <>
              <line
                x1={getX(hoveredIdx)}
                y1={PAD_Y}
                x2={getX(hoveredIdx)}
                y2={H - PAD_Y}
                stroke="#3b82f6"
                strokeWidth={1}
                strokeDasharray="3,3"
                opacity={0.5}
              />
              <circle
                cx={getX(hoveredIdx)}
                cy={getY(validPoints[hoveredIdx].price)}
                r={5}
                fill="#3b82f6"
                stroke="white"
                strokeWidth={2}
              />
            </>
          )}

          {/* Invisible hover targets */}
          {validPoints.map((_, i) => (
            <rect
              key={i}
              x={getX(i) - chartW / validPoints.length / 2}
              y={PAD_Y}
              width={chartW / validPoints.length}
              height={chartH}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseMove={(e) => {
                const svg = e.currentTarget.closest('svg');
                if (!svg) return;
                const rect = svg.getBoundingClientRect();
                setMousePos({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                });
              }}
            />
          ))}

          {/* X-axis labels */}
          {validPoints.map((p, i) => {
            if (validPoints.length <= 10 || i % Math.ceil(validPoints.length / 8) === 0) {
              return (
                <text
                  key={p.date}
                  x={getX(i)}
                  y={H - 2}
                  textAnchor="middle"
                  className="fill-slate-400 text-[9px]"
                >
                  {p.label}
                </text>
              );
            }
            return null;
          })}
        </svg>

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-10 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg pointer-events-none whitespace-nowrap shadow-lg"
            style={{
              left: `${(mousePos.x / (600)) * 100}%`,
              top: `${Math.max(0, (mousePos.y / 200) * 100 - 20)}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <span className="font-medium">{hoveredPoint.label}</span>
            <span className="mx-1.5 opacity-50">·</span>
            <span className="font-bold">
              {currency} {hoveredPoint.price.toFixed(0)}
            </span>
            {hoveredIdx === cheapestIdx && (
              <span className="ml-1 text-green-400">★ Cheapest</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
