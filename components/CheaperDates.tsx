'use client';

import { useState } from 'react';

interface Alternative {
  checkIn: string;
  checkOut: string;
  price: number;
  provider: string;
  savings: number;
  savingsPct: number;
}

interface CheaperDatesResult {
  originalDates: { checkIn: string; checkOut: string; nights: number };
  originalPrice: number | null;
  originalProvider: string | null;
  alternatives: {
    near: Alternative[];
    week: Alternative[];
    month: Alternative[];
  };
  cheapestOverall: Alternative | null;
}

interface Props {
  hotelKey: string;
  checkIn: string;
  checkOut: string;
}

export default function CheaperDates({ hotelKey, checkIn, checkOut }: Props) {
  const [result, setResult] = useState<CheaperDatesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'near' | 'week' | 'month'>('near');
  const [expanded, setExpanded] = useState(false);

  const fetchCheaperDates = async () => {
    if (result) {
      setExpanded(!expanded);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/cheaper-dates?hotelKey=${hotelKey}&checkIn=${checkIn}&checkOut=${checkOut}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setExpanded(true);
    } catch (err: any) {
      setError(err.message || 'Failed to find cheaper dates');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'near' as const, label: '±3 Days' },
    { key: 'week' as const, label: '±1 Week' },
    { key: 'month' as const, label: '±1 Month' },
  ];

  const currentAlternatives = result?.alternatives[activeTab] || [];
  const cheaperOptions = currentAlternatives.filter((a) => a.savingsPct > 0);

  return (
    <div className="mt-3">
      <button
        onClick={fetchCheaperDates}
        disabled={loading}
        className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Searching...' : expanded ? 'Hide Cheaper Dates' : 'Find Cheaper Dates'}
      </button>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {expanded && result && (
        <div className="mt-4 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 bg-zinc-50 dark:bg-zinc-800/50">
          {result.cheapestOverall && result.cheapestOverall.savingsPct > 0 && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <p className="text-emerald-800 dark:text-emerald-200 font-semibold text-sm">
                Best deal: Save {result.cheapestOverall.savingsPct}% (${result.cheapestOverall.savings.toFixed(0)})
              </p>
              <p className="text-emerald-700 dark:text-emerald-300 text-sm">
                {result.cheapestOverall.checkIn} → {result.cheapestOverall.checkOut} · ${result.cheapestOverall.price.toFixed(0)} via {result.cheapestOverall.provider}
              </p>
            </div>
          )}

          {result.originalPrice && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              Original: ${result.originalPrice.toFixed(0)} for {result.originalDates.nights} nights
            </p>
          )}

          <div className="flex gap-1 mb-3">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {cheaperOptions.length === 0 ? (
            <p className="text-sm text-zinc-500">No cheaper alternatives found in this range.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cheaperOptions.slice(0, 5).map((alt, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-white dark:bg-zinc-800 rounded border border-zinc-100 dark:border-zinc-700"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      {alt.checkIn} → {alt.checkOut}
                    </p>
                    <p className="text-xs text-zinc-500">{alt.provider}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">${alt.price.toFixed(0)}</p>
                    <span className="text-xs px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded">
                      -{alt.savingsPct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
