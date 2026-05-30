'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useFavorites } from '@/lib/useLocalStorage';
import RatingBadge from '@/components/RatingBadge';
import PriceAlertsDashboard from '@/components/PriceAlertsDashboard';
import EmptyState from '@/components/EmptyState';
import { useState } from 'react';
import { useLocale } from '@/components/LocaleProvider';

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

interface QuickPrice {
  cheapest: { provider: string; total: number; currency: string } | null;
  providerCount: number;
}

function localDate(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function FavoritesPage() {
  const { t } = useLocale();
  const { favorites, removeFavorite, hydrated } = useFavorites();
  const [prices, setPrices] = useState<Record<string, QuickPrice>>({});
  const [loadingPrices, setLoadingPrices] = useState<string | null>(null);
  const [checkIn] = useState(localDate(7));
  const [checkOut] = useState(localDate(9));

  const quickCheck = async (hotelKey: string) => {
    setLoadingPrices(hotelKey);
    try {
      const params = new URLSearchParams({ hotelKey, checkIn, checkOut });
      const res = await fetch(`/api/compare?${params}`);
      const data = await res.json();
      if (res.ok) {
        setPrices((prev) => ({
          ...prev,
          [hotelKey]: {
            cheapest: data.cheapest,
            providerCount: data.providerCount || 0,
          },
        }));
      }
    } catch { /* ignore */ }
    setLoadingPrices(null);
  };

  const checkAllPrices = async () => {
    for (const fav of favorites.slice(0, 6)) {
      await quickCheck(fav.hotelKey);
    }
  };

  if (!hydrated) {
    return <div className="min-h-screen p-8 text-center text-slate-500">{t('favLoading')}</div>;
  }

  const compareUrl = favorites.length >= 2
    ? `/compare-hotels?hotels=${favorites.slice(0, 4).map((f) => f.hotelKey).join(',')}`
    : '';

  return (
    <div className="min-h-screen">
      {/* Gradient header */}
      <div className="bg-linear-to-r from-rose-500 via-pink-500 to-fuchsia-500 text-white py-10 px-4 mb-8">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="text-white/70 hover:text-white text-sm mb-3 inline-block transition-colors">← {t('compareHome')}</Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-1">{t('favTitle')}</h1>
          <p className="text-white/70">
            {interpolate(t('favSubtext'), { count: favorites.length })}
          </p>
        </div>
      </div>

      <div className="px-4 pb-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div></div>
          {favorites.length >= 2 && (
            <div className="flex gap-2">
              <button
                onClick={checkAllPrices}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition"
              >
                &#128176; {t('favCheckAll')}
              </button>
              <Link
                href={compareUrl}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm font-medium transition"
              >
                &#9878;&#65039; {t('favCompareSide')}
              </Link>
            </div>
          )}
        </div>

        <PriceAlertsDashboard className="mb-6" />

        {favorites.length === 0 ? (
          <EmptyState
            icon="♡"
            title={t('favEmptyTitle')}
            description={t('favEmptyDesc')}
            action={{ label: t('footerBrowseHotels'), href: '/search' }}
            className="bg-white rounded-2xl border border-slate-200"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((fav) => {
              const price = prices[fav.hotelKey];
              const isChecking = loadingPrices === fav.hotelKey;
              return (
                <div
                  key={fav.hotelKey}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group"
                >
                  <Link href={`/hotel/${fav.hotelKey}`} className="block relative">
                    <Image
                      src={fav.image}
                      alt={fav.name}
                      width={400}
                      height={200}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={(e) => { e.preventDefault(); removeFavorite(fav.hotelKey); }}
                        className="w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center hover:bg-red-50 transition shadow-sm"
                        aria-label={interpolate(t('favRemoveAria'), { name: fav.name })}
                      >
                        <span className="text-red-500 text-lg">&#9829;</span>
                      </button>
                    </div>
                  </Link>
                  <div className="p-5">
                    <Link href={`/hotel/${fav.hotelKey}`} className="hover:text-blue-600 transition">
                      <h2 className="font-bold text-slate-900 truncate">{fav.name}</h2>
                    </Link>
                    <p className="text-sm text-slate-500 mt-0.5">
                      &#128205; {fav.city}, {fav.country}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <RatingBadge size="sm" />
                      <span className="text-xs text-slate-500">
                        {t('favAdded')} {new Date(fav.addedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Quick price */}
                    {price?.cheapest ? (
                      <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-xs text-emerald-600">{t('favFrom')} {price.cheapest.provider}</div>
                            <div className="text-lg font-bold text-emerald-700">
                              {price.cheapest.currency} {price.cheapest.total.toFixed(0)}
                            </div>
                          </div>
                          <div className="text-xs text-emerald-600">
                            {price.providerCount} {t('favProviders')}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => quickCheck(fav.hotelKey)}
                        disabled={isChecking}
                        className="mt-3 w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:border-blue-300 transition disabled:opacity-50"
                      >
                        {isChecking ? t('favChecking') : `💰 ${t('favQuickCheck')}`}
                      </button>
                    )}

                    <div className="flex gap-2 mt-3">
                      <Link
                        href={`/hotel/${fav.hotelKey}`}
                        className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition"
                      >
                        {t('favViewDetails')}
                      </Link>
                      <Link
                        href={`/trips?hotelKey=${fav.hotelKey}`}
                        className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium transition"
                      >
                        {t('favPlanTrip')}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
