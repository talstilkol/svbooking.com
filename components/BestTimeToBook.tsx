'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocale } from '@/components/LocaleProvider';

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

interface TrendDay {
  date: string;
  price?: number;
  avg?: number;
  min?: number;
  priceSourceLabel?: string;
}

interface BestTimeToBookProps {
  hotelKey: string;
  hotelName: string;
}

export default function BestTimeToBook({ hotelKey, hotelName }: BestTimeToBookProps) {
  const { t, locale } = useLocale();
  const dateLocale = locale === 'he' ? 'he-IL' : 'en-US';
  const [trend, setTrend] = useState<TrendDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    fetch(`/api/deals?hotelKey=${hotelKey}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setTrend(d.trend || []);
      })
      .catch(() => {
        if (!cancelled) setTrend([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hotelKey, expanded]);

  const analysis = useMemo(() => {
    if (trend.length === 0) return null;

    const prices = trend
      .map((d) => ({
        ...d,
        min: Number(d.min ?? d.price ?? 0),
        avg: Number(d.avg ?? d.price ?? 0),
      }))
      .filter((d) => d.min > 0);
    if (prices.length === 0) return null;

    const cheapest = prices.reduce((a, b) => (a.min < b.min ? a : b));
    const mostExpensive = prices.reduce((a, b) => (a.min > b.min ? a : b));
    const avgPrice = prices.reduce((sum, d) => sum + d.min, 0) / prices.length;
    const savingVsCheapest = Math.round(((avgPrice - cheapest.min) / avgPrice) * 100);

    const cheapestDate = new Date(cheapest.date);
    const dayOfWeek = cheapestDate.toLocaleDateString(dateLocale, { weekday: 'long' });
    const formattedDate = cheapestDate.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });

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
    // Locale-aware full weekday name (2024-01-07 is a Sunday, so +dow lands on the right day).
    const cheapestDayName = new Date(2024, 0, 7 + (dayAvgs[0]?.dow || 0))
      .toLocaleDateString(dateLocale, { weekday: 'long' });
    const sourceLabel = prices.find((d) => d.priceSourceLabel)?.priceSourceLabel;

    return { prices, cheapest, mostExpensive, avgPrice, savingVsCheapest, dayOfWeek, formattedDate, dayAvgs, cheapestDayName, sourceLabel };
  }, [trend, dateLocale]);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-4 transition"
      >
        {interpolate(t('bttbWhen'), { hotelName })}
      </button>
    );
  }

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
        <div className="flex items-center gap-2 text-sm text-indigo-600">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          {t('bttbAnalyzing')}
        </div>
      </div>
    );
  }

  if (!analysis) {
    return trend.length === 0 ? (
      <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500">
        {t('bttbNoTrend')}
      </div>
    ) : (
      <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500">
        {t('bttbNoPricing')}
      </div>
    );
  }

  const { cheapest, mostExpensive, savingVsCheapest, dayOfWeek, formattedDate, dayAvgs, cheapestDayName, sourceLabel } = analysis;

  return (
    <div className="mt-4 p-5 bg-indigo-50 border border-indigo-100 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-indigo-900 text-sm flex items-center gap-2">
          {t('bttbTitle')}
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
          <div className="text-xs text-indigo-600 font-medium">{t('bttbCheapestDate')}</div>
          <div className="text-lg font-bold text-indigo-900">{formattedDate}</div>
          <div className="text-xs text-indigo-600">{dayOfWeek} &middot; ${cheapest.min.toFixed(0)}{t('chPerNight')}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-indigo-100">
          <div className="text-xs text-indigo-600 font-medium">{t('bttbCheapestWeekday')}</div>
          <div className="text-lg font-bold text-indigo-900">{interpolate(t('bttbWeekdayPlural'), { day: cheapestDayName })}</div>
          <div className="text-xs text-indigo-600">{interpolate(t('bttbAvg'), { amount: dayAvgs[0]?.avg.toFixed(0) ?? '0' })}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-indigo-100">
          <div className="text-xs text-indigo-600 font-medium">{t('bttbPotentialSavings')}</div>
          <div className="text-lg font-bold text-emerald-700">{interpolate(t('bttbPctOff'), { pct: savingVsCheapest })}</div>
          <div className="text-xs text-indigo-600">{t('bttbVsAvg')}</div>
        </div>
      </div>

      <div className="text-xs text-indigo-700 space-y-1">
        <p>
          {interpolate(t('bttbRangeSentence'), {
            hotelName,
            min: cheapest.min.toFixed(0),
            max: mostExpensive.min.toFixed(0),
          })}
        </p>
        <p>
          {interpolate(t('bttbObservedDay'), { day: cheapestDayName })}
          {savingVsCheapest >= 15 && t('bttbSignificant')}
        </p>
        {sourceLabel && <p>{interpolate(t('bttbNotOffer'), { source: sourceLabel })}</p>}
      </div>
    </div>
  );
}
