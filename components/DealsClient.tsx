'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DealCard from '@/components/DealCard';
import { CONTINENTS } from '@/lib/destinations';

interface Deal {
  hotel: { hotelKey: string; name: string; city: string; country: string; image: string };
  bestPrice: number;
  pricePerNight: number;
  bestProvider: string | null;
  priceSourceLabel?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  currency: string;
}

type SortOption = 'price-asc' | 'price-desc' | 'city' | 'country';

export default function DealsClient() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [continent, setContinent] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('price-asc');
  const [lastScanned, setLastScanned] = useState('');
  const [strategy, setStrategy] = useState('');
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setError('');
    });
    const params = new URLSearchParams();
    if (continent) params.set('continent', continent);
    fetch(`/api/deals?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        setDeals(d.deals || []);
        setStrategy(d.strategy || '');
        if (d.scannedAt) {
          setLastScanned(new Date(d.scannedAt).toLocaleTimeString());
        } else {
          setLastScanned('');
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setDeals([]);
        setError('Failed to load deals. Please try again.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [continent, refreshKey]);

  const sorted = [...deals].sort((a, b) => {
    if (sort === 'price-asc') return a.pricePerNight - b.pricePerNight;
    if (sort === 'price-desc') return b.pricePerNight - a.pricePerNight;
    if (sort === 'city') return a.hotel.city.localeCompare(b.hotel.city);
    if (sort === 'country') return a.hotel.country.localeCompare(b.hotel.country);
    return 0;
  });

  return (
    <div className="min-h-screen">
      <div className="bg-linear-to-r from-amber-500 to-orange-500 text-white py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/" className="text-white/80 text-sm hover:text-white">&larr; Home</Link>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Provider-Returned Hotel Deals</h1>
          <p className="text-lg opacity-90">
            Verified provider data when available across {CONTINENTS.length} regions
          </p>
          {lastScanned && (
            <p className="text-sm opacity-70 mt-2">
              Last scanned: {lastScanned}
              {strategy === 'cached-agent' && ' (instant from AI agent cache)'}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setContinent(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              !continent ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:border-amber-300'
            }`}
          >
            All Regions
          </button>
          {CONTINENTS.map((c) => (
            <button
              key={c.id}
              onClick={() => setContinent(c.id === continent ? null : c.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                continent === c.id ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:border-amber-300'
              }`}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>

        {/* Sort + count */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <p className="text-sm text-slate-500">
            {loading ? 'Scanning...' : `${sorted.length} deal${sorted.length !== 1 ? 's' : ''} found`}
          </p>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            aria-label="Sort deals"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900"
          >
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="city">City A-Z</option>
            <option value="country">Country A-Z</option>
          </select>
        </div>

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 mt-3">Scanning hotels for available rate observations...</p>
          </div>
        ) : sorted.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((deal) => (
              <DealCard key={deal.hotel.hotelKey} deal={deal} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-500">
            <div className="text-5xl mb-4">&#128270;</div>
            <p className="text-lg">No deals available right now</p>
            <p className="text-sm mt-2">Try a different region or check back later</p>
          </div>
        )}

        {/* Refresh */}
        {!loading && (
          <div className="text-center mt-10">
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-medium transition"
            >
              &#128260; Refresh Deals
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
