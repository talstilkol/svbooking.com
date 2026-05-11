'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface QuickCompareResult {
  provider: string;
  total: number;
  currency: string;
}

interface QuickCompareProps {
  hotelKey: string;
  hotelName: string;
  checkIn?: string;
  checkOut?: string;
  className?: string;
}

export default function QuickCompare({
  hotelKey,
  hotelName,
  checkIn,
  checkOut,
  className = '',
}: QuickCompareProps) {
  const [results, setResults] = useState<QuickCompareResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded || !checkIn || !checkOut) return;

    const controller = new AbortController();
    setLoading(true);

    fetch(
      `/api/compare?hotelKey=${hotelKey}&checkIn=${checkIn}&checkOut=${checkOut}`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.rates) {
          setResults(
            data.rates.slice(0, 5).map((r: { provider: string; total: number; currency: string }) => ({
              provider: r.provider,
              total: r.total,
              currency: r.currency,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [expanded, hotelKey, checkIn, checkOut]);

  return (
    <div className={className}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-xs font-medium transition"
      >
        ⚡ Quick Compare
      </button>

      {expanded && (
        <div className="mt-2 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <h4 className="text-xs font-bold text-slate-700 mb-2">
            {hotelName} — Quick Price Check
          </h4>

          {!checkIn || !checkOut ? (
            <p className="text-xs text-slate-400">Select dates first to compare prices</p>
          ) : loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between animate-pulse">
                  <div className="h-3 bg-slate-100 rounded w-20" />
                  <div className="h-3 bg-slate-100 rounded w-16" />
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1.5">
              {results.map((r, i) => (
                <div
                  key={r.provider}
                  className={`flex items-center justify-between text-xs py-1 ${
                    i === 0 ? 'font-bold text-green-700' : 'text-slate-600'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {i === 0 && <span className="text-green-600">✓</span>}
                    {r.provider}
                  </span>
                  <span>
                    {r.currency} {r.total.toFixed(0)}
                  </span>
                </div>
              ))}
              <Link
                href={`/hotel/${hotelKey}?checkIn=${checkIn}&checkOut=${checkOut}`}
                className="block text-center text-[10px] text-blue-600 font-medium mt-2 py-1 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              >
                See full comparison →
              </Link>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No prices available</p>
          )}
        </div>
      )}
    </div>
  );
}
