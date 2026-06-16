'use client';

import { useState } from 'react';
import { useLocale } from '@/components/LocaleProvider';

interface Alternative {
  checkIn: string;
  checkOut: string;
  price: number;
  provider: string | null;
  bookingProvider?: boolean;
  priceSourceLabel?: string;
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
  hasRealData?: boolean;
  dataPolicy?: string;
}

interface Props {
  hotelKey: string;
  checkIn: string;
  checkOut: string;
}

export default function CheaperDates({ hotelKey, checkIn, checkOut }: Props) {
  const { t } = useLocale();
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
      if (!res.ok || data.error) throw new Error(t('cheaperDatesSearchUnavailable'));
      setResult(data);
      setExpanded(true);
    } catch {
      setError(t('cheaperDatesSearchUnavailableNow'));
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'near' as const, label: t('cheaperDatesTabNear') },
    { key: 'week' as const, label: t('cheaperDatesTabWeek') },
    { key: 'month' as const, label: t('cheaperDatesTabMonth') },
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
        {loading ? t('cheaperDatesSearching') : expanded ? t('cheaperDatesHide') : t('cheaperDatesFind')}
      </button>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {expanded && result && (
        <div className="mt-4 border border-zinc-200 rounded-lg p-4 bg-zinc-50">
          {result.hasRealData === false && (
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-slate-700 text-sm">
                {t('cheaperDatesUnavailable')}
              </p>
            </div>
          )}

          {result.cheapestOverall && result.cheapestOverall.savingsPct > 0 && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-emerald-800 font-semibold text-sm">
                {t('cheaperDatesLowestObserved')
                  .replace('{pct}', String(result.cheapestOverall.savingsPct))
                  .replace('{amount}', result.cheapestOverall.savings.toFixed(0))}
              </p>
              <p className="text-emerald-700 text-sm">
                {result.cheapestOverall.checkIn} → {result.cheapestOverall.checkOut} · ${result.cheapestOverall.price.toFixed(0)} · {result.cheapestOverall.provider || result.cheapestOverall.priceSourceLabel || t('dealProviderUnavailable')}
              </p>
            </div>
          )}

          {result.originalPrice && (
            <p className="text-sm text-zinc-600 mb-3">
              {t('cheaperDatesOriginal')
                .replace('{amount}', result.originalPrice.toFixed(0))
                .replace('{nights}', String(result.originalDates.nights))
                .replace('{nightWord}', result.originalDates.nights === 1 ? t('dealNight') : t('dealNights'))}
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
                    : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {cheaperOptions.length === 0 ? (
            <p className="text-sm text-zinc-500">{t('cheaperDatesNoAlternatives')}</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cheaperOptions.slice(0, 5).map((alt, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-white rounded border border-zinc-100"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {alt.checkIn} → {alt.checkOut}
                    </p>
                    <p className="text-xs text-zinc-500">{alt.provider || alt.priceSourceLabel || t('dealProviderUnavailable')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-zinc-900">${alt.price.toFixed(0)}</p>
                    <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">
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
