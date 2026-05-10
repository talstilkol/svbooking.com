'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import HotelCard, { CatalogHotel } from '@/components/HotelCard';

function SearchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const initialCity = searchParams.get('city') || '';
  const [city, setCity] = useState(initialCity);
  const [allHotels, setAllHotels] = useState<CatalogHotel[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/compare');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load catalog');
        setAllHotels(data.hotels || []);
        setCities(data.cities || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = city
    ? allHotels.filter((h) => h.city.toLowerCase().includes(city.toLowerCase()))
    : allHotels;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city.trim()) params.set('city', city.trim());
    router.push(`/search${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">Find a Hotel</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Real hotels with live prices from Booking.com, Expedia, Hotels.com, Agoda &amp; more
        </p>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 mb-6 flex gap-3 flex-wrap">
          <input
            ref={inputRef}
            list="cities-list"
            type="text"
            placeholder="City (e.g. Tel Aviv, Paris, NYC)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="flex-1 min-w-[240px] px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
          />
          <datalist id="cities-list">
            {cities.map((c) => <option key={c} value={c} />)}
          </datalist>
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Search
          </button>
          {city && (
            <button type="button" onClick={() => setCity('')} className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg">
              Clear
            </button>
          )}
        </form>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-300">
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-zinc-600 dark:text-zinc-400 py-12">Loading hotels...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-zinc-600 dark:text-zinc-400 py-12">
            No hotels found in &quot;{city}&quot;. Try: {cities.slice(0, 5).join(', ')}
          </div>
        ) : (
          <>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Showing {filtered.length} of {allHotels.length} hotels
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((hotel) => (
                <HotelCard key={hotel.hotelKey} hotel={hotel} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50 dark:bg-black p-8 text-center text-zinc-600">Loading...</div>}>
      <SearchInner />
    </Suspense>
  );
}
