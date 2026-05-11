'use client';

import { useState, useEffect } from 'react';

interface TrendDay {
  date: string;
  avg: number;
  min: number;
}

interface BestTimeToBookProps {
  hotelKey: string;
  hotelName: string;
}

export default function BestTimeToBook({ hotelKey, hotelName }: BestTimeToBookProps) {
  const [trend, setTrend] = useState<TrendDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    setLoading(true);
    fetch(`/api/deals?hotelKey=${hotelKey}`)
      .then((r) => r.json())
      .then((d) => setTrend(d.trend || []))
      .catch(() => setTrend([]))
      .finally(() => setLoading(false));
  }, [hotelKey, expanded]);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-4 transition"
      >
        <span>&#128197;</span> When is the best time to book {hotelName}?
      </button>
    );
  }

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
        <div className="flex items-center gap-2 text-sm text-indigo-600">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Analyzing 30-day price trends...
        </div>
      </div>
    );
  }

  if (trend.length === 0) {
    return (
      <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500">
        No trend data available for this hotel.
      </div>
    );
  }

  // Analyze the trend
  const prices = trend.filter((d) => d.min > 0);
  if (prices.length === 0) {
    return (
      <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500">
        No pricing data available for analysis.
      </div>
    );
  }

  const cheapest = prices.reduce((a, b) => (a.min < b.min ? a : b));
  const mostExpensive = prices.reduce((a, b) => (a.min > b.min ? a : b));
  const avgPrice = prices.reduce((sum, d) => sum + d.min, 0) / prices.length;
  const savingVsCheapest = Math.round(((avgPrice - cheapest.min) / avgPrice) * 100);

  const cheapestDate = new Date(cheapest.date);
  const dayOfWeek = cheapestDate.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = cheapestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Determine day-of-week pattern
  const dayPrices: Record<number, number[]> = {};
  prices.forEach((d) => {
    const dow = new Date(d.date).getDay();
    if (!dayPrices[dow]) dayPrices[dow] = [];
    dayPrices[dow].push(d.min);
  });
  const dayAvgs = Object.entries(dayPrices).map(([dow, ps]) => ({
    dow: Number(dow),
    avg: ps.reduce((s, p) => s + p, 0) / ps.length,
  }));
  dayAvgs.sort((a, b) => a.avg - b.avg);
  const cheapestDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayAvgs[0]?.dow || 0];

  return (
    <div className="mt-4 p-5 bg-indigo-50 border border-indigo-100 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-indigo-900 text-sm flex items-center gap-2">
          <span>&#128197;</span> Best Time to Book
        </h3>
        <button
          onClick={() => setExpanded(false)}
          className="text-indigo-400 hover:text-indigo-600 text-sm"
        >
          &#10005;
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg p-3 border border-indigo-100">
          <div className="text-xs text-indigo-600 font-medium">Cheapest date found</div>
          <div className="text-lg font-bold text-indigo-900">{formattedDate}</div>
          <div className="text-xs text-indigo-600">{dayOfWeek} &middot; ${cheapest.min.toFixed(0)}/night</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-indigo-100">
          <div className="text-xs text-indigo-600 font-medium">Cheapest day of week</div>
          <div className="text-lg font-bold text-indigo-900">{cheapestDayName}s</div>
          <div className="text-xs text-indigo-600">avg ${dayAvgs[0]?.avg.toFixed(0)}/night</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-indigo-100">
          <div className="text-xs text-indigo-600 font-medium">Potential savings</div>
          <div className="text-lg font-bold text-emerald-700">{savingVsCheapest}% off</div>
          <div className="text-xs text-indigo-600">vs 30-day average</div>
        </div>
      </div>

      <div className="text-xs text-indigo-700 space-y-1">
        <p>
          &#128161; <strong>Tip:</strong> Prices for {hotelName} range from
          <strong> ${cheapest.min.toFixed(0)}</strong> to
          <strong> ${mostExpensive.min.toFixed(0)}</strong> per night over the next 30 days.
        </p>
        <p>
          Booking on a <strong>{cheapestDayName}</strong> check-in tends to be cheapest.
          {savingVsCheapest >= 15 && ' Significant savings are possible by choosing the right dates!'}
        </p>
      </div>
    </div>
  );
}
