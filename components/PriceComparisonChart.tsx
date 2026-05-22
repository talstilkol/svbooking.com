'use client';

interface Rate {
  provider: string;
  total: number;
  currency: string;
}

interface PriceComparisonChartProps {
  rates: Rate[];
  nights: number;
  className?: string;
}

const COLORS = [
  '#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#EC4899', '#F97316', '#14B8A6', '#6366F1',
];

export default function PriceComparisonChart({
  rates,
  nights,
  className = '',
}: PriceComparisonChartProps) {
  if (rates.length === 0) return null;

  const maxTotal = Math.max(...rates.map((r) => r.total));
  const minTotal = Math.min(...rates.map((r) => r.total));
  const range = maxTotal - minTotal;

  return (
    <div className={className}>
      <h3 className="text-sm font-bold text-slate-900 mb-3">📊 Price Comparison</h3>

      <div className="space-y-2">
        {rates.map((rate, i) => {
          const pct = maxTotal > 0 ? (rate.total / maxTotal) * 100 : 0;
          const isCheapest = rate.total === minTotal;
          const savings = rate.total - minTotal;

          return (
            <div key={rate.provider} className="flex items-center gap-3">
              <span className="text-xs text-slate-600 w-24 shrink-0 truncate">{rate.provider}</span>
              <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden relative">
                <div
                  className="h-full rounded-lg transition-all duration-500"
                  style={{
                    width: `${Math.max(pct, 10)}%`,
                    backgroundColor: COLORS[i % COLORS.length],
                    opacity: isCheapest ? 1 : 0.7,
                  }}
                />
                <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-white drop-shadow">
                  {rate.currency} {rate.total.toFixed(0)}
                  {nights > 0 && (
                    <span className="opacity-70 ml-1">
                      ({rate.currency} {(rate.total / nights).toFixed(0)}/n)
                    </span>
                  )}
                </span>
              </div>
              <span className="text-[10px] w-16 text-right shrink-0">
                {isCheapest ? (
                  <span className="text-green-600 font-bold">Lowest</span>
                ) : range > 0 ? (
                  <span className="text-slate-400">+{savings.toFixed(0)}</span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>

      {range > 0 && (
        <p className="text-[10px] text-slate-400 mt-2 text-center">
          Spread: {rates[0]?.currency} {range.toFixed(0)} ({((range / maxTotal) * 100).toFixed(0)}%) between providers
        </p>
      )}
    </div>
  );
}
