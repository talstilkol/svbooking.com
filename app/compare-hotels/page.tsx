'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import RatingBadge from '@/components/RatingBadge';
import { PageSkeleton } from '@/components/Skeleton';
import type { CatalogHotel, ProviderRate } from '@/lib/types';

type Hotel = CatalogHotel;
type Rate = ProviderRate;

interface ComparisonResult {
  hotel: Hotel;
  rates: Rate[];
  cheapest: Rate | null;
  providerCount: number;
}

function localDate(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function rateSourceLabel(rate: Rate) {
  return `Source: ${rate.source || 'unavailable'}`;
}

function rateFreshnessLabel(rate: Rate) {
  return `Freshness: ${rate.freshness || 'unknown'}`;
}

function rateCompletenessLabel(rate: Rate) {
  return rate.partial ? 'Partial provider response' : 'Complete provider response';
}

function rateTaxLabel(rate: Rate) {
  if (rate.taxesIncluded === true) return 'Taxes included';
  if (rate.taxesIncluded === false) return 'Taxes may be excluded';
  return 'Tax status unavailable';
}

function rateAccuracyLabel(rate: Rate) {
  return `Accuracy: ${rate.priceAccuracyState || 'unobserved'}`;
}

function CompareHotelsInner() {
  const searchParams = useSearchParams();
  const initialKeys = (searchParams.get('hotels') || searchParams.get('keys'))?.split(',').filter(Boolean) || [];

  const [allHotels, setAllHotels] = useState<Hotel[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(initialKeys);
  const [checkIn, setCheckIn] = useState(localDate(7));
  const [checkOut, setCheckOut] = useState(localDate(9));
  const [results, setResults] = useState<Record<string, ComparisonResult>>({});
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/compare', { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setAllHotels(d.hotels || []))
      .catch((err) => { if (err instanceof Error && err.name !== 'AbortError') console.warn('compare-hotels: catalog fetch failed', err); })
      .finally(() => setCatalogLoading(false));
    return () => controller.abort();
  }, []);

  const addHotel = (key: string) => {
    if (key && !selectedKeys.includes(key) && selectedKeys.length < 4) {
      setSelectedKeys((prev) => [...prev, key]);
    }
  };

  const removeHotel = (key: string) => {
    setSelectedKeys((prev) => prev.filter((k) => k !== key));
    setResults((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const compareAll = async () => {
    if (selectedKeys.length === 0 || !checkIn || !checkOut) return;
    setLoading(true);
    const newResults: Record<string, ComparisonResult> = {};

    await Promise.all(
      selectedKeys.map(async (key) => {
        try {
          const params = new URLSearchParams({ hotelKey: key, checkIn, checkOut });
          const res = await fetch(`/api/compare?${params}`);
          const data = await res.json();
          if (res.ok && data.hotel) {
            newResults[key] = data;
          }
        } catch (err) { console.warn(`compare-hotels: fetch failed for ${key}`, err); }
      })
    );

    setResults(newResults);
    setLoading(false);
  };

  const selectedHotels = selectedKeys
    .map((key) => allHotels.find((h) => h.hotelKey === key))
    .filter(Boolean) as Hotel[];

  const allProviders = Array.from(
    new Set(Object.values(results).flatMap((r) => r.rates.map((rate) => rate.provider)))
  ).sort();

  const nights = Math.max(
    1,
    Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
  );

  return (
    <div className="min-h-screen">
      {/* Gradient header */}
      <div className="bg-linear-to-r from-cyan-600 via-teal-600 to-emerald-600 text-white py-10 px-4 mb-8">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="text-white/70 hover:text-white text-sm mb-3 inline-block transition-colors">&larr; Home</Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Compare Hotels Side by Side</h1>
          <p className="text-white/70">Select up to 4 hotels and compare provider-returned prices when available</p>
        </div>
      </div>

      <div className="px-4 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Hotel Selection */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-4">
            Select hotels to compare ({selectedKeys.length}/4)
          </h2>
          <div className="flex flex-wrap gap-3 mb-4">
            {selectedHotels.map((hotel) => (
              <div
                key={hotel.hotelKey}
                className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2"
              >
                <Image src={hotel.image} alt={hotel.name} width={32} height={32} className="w-8 h-8 rounded object-cover" />
                <span className="text-sm font-medium text-slate-800">{hotel.name}</span>
                <button
                  onClick={() => removeHotel(hotel.hotelKey)}
                  className="text-red-400 hover:text-red-600 ml-1"
                  aria-label={`Remove ${hotel.name}`}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          {selectedKeys.length < 4 && (
            <select
              value=""
              onChange={(e) => addHotel(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-slate-900 max-w-md"
              disabled={catalogLoading}
            >
              <option value="">{catalogLoading ? 'Loading hotels...' : '+ Add a hotel...'}</option>
              {allHotels
                .filter((h) => !selectedKeys.includes(h.hotelKey))
                .map((h) => (
                  <option key={h.hotelKey} value={h.hotelKey}>
                    {h.name} — {h.city}, {h.country}
                  </option>
                ))}
            </select>
          )}
        </div>

        {/* Date Selection + Compare Button */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8 flex flex-wrap gap-4 items-end">
          <div className="min-w-[160px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Check-in</label>
            <input
              type="date"
              value={checkIn}
              min={localDate(0)}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900"
            />
          </div>
          <div className="min-w-[160px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Check-out</label>
            <input
              type="date"
              value={checkOut}
              min={checkIn || localDate(0)}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900"
            />
          </div>
          <button
            onClick={compareAll}
            disabled={loading || selectedKeys.length < 2}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold transition"
          >
            {loading ? 'Comparing...' : `Compare ${selectedKeys.length} hotels`}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 mt-3">Fetching provider-returned prices when available...</p>
          </div>
        )}

        {/* Results Table */}
        {!loading && Object.keys(results).length >= 2 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-4 text-sm font-semibold text-slate-600 bg-slate-50 min-w-[140px]">
                      Provider
                    </th>
                    {selectedKeys.map((key) => {
                      const r = results[key];
                      if (!r) return null;
                      return (
                        <th key={key} className="p-4 text-center bg-slate-50 min-w-[180px]">
                          <Image
                            src={r.hotel.image}
                            alt={r.hotel.name}
                            width={120}
                            height={64}
                            className="w-full h-16 object-cover rounded-lg mb-2"
                          />
                          <div className="font-semibold text-slate-900 text-sm">{r.hotel.name}</div>
                          <div className="text-xs text-slate-500">{r.hotel.city}</div>
                          <RatingBadge size="sm" className="mt-1 justify-center" />
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* Cheapest row */}
                  <tr className="bg-green-50 border-b border-green-100">
                    <td className="p-4 font-semibold text-green-800 text-sm">
                      &#11088; Lowest returned price
                    </td>
                    {selectedKeys.map((key) => {
                      const r = results[key];
                      if (!r?.cheapest) return <td key={key} className="p-4 text-center text-slate-400">—</td>;
                      return (
                        <td key={key} className="p-4 text-center">
                          <div className="text-xl font-bold text-green-700">
                            {r.cheapest.currency} {r.cheapest.total.toFixed(0)}
                          </div>
                          <div className="text-xs text-green-600">
                            {r.cheapest.currency} {(r.cheapest.total / nights).toFixed(0)}/night
                          </div>
                          <div className="text-xs text-green-600 font-medium mt-0.5">
                            on {r.cheapest.provider}
                          </div>
                          <div className="mt-2 flex flex-wrap justify-center gap-1">
                            {[rateSourceLabel(r.cheapest), rateFreshnessLabel(r.cheapest)].map((label) => (
                              <span key={label} className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                                {label}
                              </span>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Per-provider rows */}
                  {allProviders.map((provider) => (
                    <tr key={provider} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4 text-sm font-medium text-slate-700">{provider}</td>
                      {selectedKeys.map((key) => {
                        const r = results[key];
                        const rate = r?.rates.find((rt) => rt.provider === provider);
                        const isCheapest = rate && r?.cheapest && rate.provider === r.cheapest.provider && rate.total === r.cheapest.total;
                        if (!rate) {
                          return (
                            <td key={key} className="p-4 text-center text-slate-400 text-sm">
                              No provider-returned rate
                            </td>
                          );
                        }
                        return (
                          <td key={key} className={`p-4 text-center ${isCheapest ? 'bg-green-50' : ''}`}>
                            <div className={`font-semibold ${isCheapest ? 'text-green-700' : 'text-slate-900'}`}>
                              {rate.currency} {rate.total.toFixed(0)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {rate.currency} {(rate.total / nights).toFixed(0)}/night
                            </div>
                            <div
                              className="mt-2 flex flex-wrap justify-center gap-1"
                              aria-label={`Rate metadata for ${provider} at ${r?.hotel.name || key}`}
                            >
                              {[
                                rateSourceLabel(rate),
                                rateFreshnessLabel(rate),
                                rateCompletenessLabel(rate),
                                rateTaxLabel(rate),
                                rateAccuracyLabel(rate),
                                rate.deepLink ? 'Provider link returned' : 'Provider search unavailable',
                              ].map((label) => (
                                <span
                                  key={label}
                                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Provider count row */}
                  <tr className="bg-slate-50">
                    <td className="p-4 text-sm font-medium text-slate-600">Providers</td>
                    {selectedKeys.map((key) => {
                      const r = results[key];
                      return (
                        <td key={key} className="p-4 text-center text-sm text-slate-600">
                          {r?.providerCount || 0} found
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Action buttons */}
            <div className="p-4 border-t border-slate-200 flex flex-wrap gap-3 justify-center">
              {selectedKeys.map((key) => {
                const r = results[key];
                if (!r) return null;
                return (
                  <Link
                    key={key}
                    href={`/hotel/${key}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    View {r.hotel.name} &rarr;
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty states */}
        {!loading && selectedKeys.length < 2 && (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-4">&#9878;&#65039;</div>
            <p className="text-lg">Select at least 2 hotels above to compare them side by side</p>
          </div>
        )}

        {!loading && selectedKeys.length >= 2 && Object.keys(results).length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-4">&#128200;</div>
            <p className="text-lg">Click &quot;Compare&quot; to fetch provider-returned prices for all selected hotels</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export default function CompareHotelsPage() {
  return (
    <Suspense fallback={<PageSkeleton headerColor="bg-teal-700" />}>
      <CompareHotelsInner />
    </Suspense>
  );
}
