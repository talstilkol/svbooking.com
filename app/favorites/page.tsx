'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useFavorites } from '@/lib/useLocalStorage';
import RatingBadge from '@/components/RatingBadge';
import PriceAlertsDashboard from '@/components/PriceAlertsDashboard';
import { useState } from 'react';

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
    return <div className="min-h-screen p-8 text-center text-slate-500">Loading...</div>;
  }

  const compareUrl = favorites.length >= 2
    ? `/compare-hotels?hotels=${favorites.slice(0, 4).map((f) => f.hotelKey).join(',')}`
    : '';

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Favorites</h1>
            <p className="text-slate-500 mt-1">
              {favorites.length} hotel{favorites.length !== 1 ? 's' : ''} saved locally on your device
            </p>
          </div>
          {favorites.length >= 2 && (
            <div className="flex gap-2">
              <button
                onClick={checkAllPrices}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition"
              >
                &#128176; Check all prices
              </button>
              <Link
                href={compareUrl}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm font-medium transition"
              >
                &#9878;&#65039; Compare side by side
              </Link>
            </div>
          )}
        </div>

        <PriceAlertsDashboard className="mb-6" />

        {favorites.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-slate-200">
            <div className="text-6xl mb-4 opacity-60">&#9825;</div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">No favorites yet</h2>
            <p className="text-slate-500 mb-6">
              Browse hotels and tap the heart icon to save them here
            </p>
            <Link href="/search" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition">
              Browse Hotels
            </Link>
          </div>
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
                        aria-label={`Remove ${fav.name} from favorites`}
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
                      <RatingBadge hotelKey={fav.hotelKey} size="sm" />
                      <span className="text-xs text-slate-400">
                        Added {new Date(fav.addedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Quick price */}
                    {price?.cheapest ? (
                      <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-xs text-emerald-600">From {price.cheapest.provider}</div>
                            <div className="text-lg font-bold text-emerald-700">
                              {price.cheapest.currency} {price.cheapest.total.toFixed(0)}
                            </div>
                          </div>
                          <div className="text-xs text-emerald-600">
                            {price.providerCount} providers
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => quickCheck(fav.hotelKey)}
                        disabled={isChecking}
                        className="mt-3 w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:border-blue-300 transition disabled:opacity-50"
                      >
                        {isChecking ? 'Checking...' : '&#128176; Quick price check'}
                      </button>
                    )}

                    <div className="flex gap-2 mt-3">
                      <Link
                        href={`/hotel/${fav.hotelKey}`}
                        className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition"
                      >
                        View Details
                      </Link>
                      <Link
                        href={`/trips?hotelKey=${fav.hotelKey}`}
                        className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium transition"
                      >
                        Plan Trip
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
  );
}
