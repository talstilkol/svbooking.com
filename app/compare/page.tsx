'use client';

import { useEffect, useState } from 'react';

interface Hotel {
  hotelKey: string;
  name: string;
  city: string;
  country: string;
  image: string;
}

interface Rate {
  provider: string;
  code: string;
  rate: number;
  tax: number;
  total: number;
  currency: string;
}

interface Comparison {
  hotel: Hotel;
  checkIn: string;
  checkOut: string;
  currency: string;
  rates: Rate[];
  cheapest: Rate | null;
  mostExpensive: Rate | null;
  savingsPct: number;
  savingsAmount: number;
  providerCount: number;
}

const PROVIDER_COLORS: Record<string, string> = {
  'Booking.com': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  'Expedia': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
  'Hotels.com': 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  'Agoda.com': 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  'Vio.com': 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
};

function tomorrow(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + 1 + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default function ComparePage() {
  const [cities, setCities] = useState<string[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [checkIn, setCheckIn] = useState(tomorrow(0));
  const [checkOut, setCheckOut] = useState(tomorrow(2));
  const [comparing, setComparing] = useState<string | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/compare');
        const data = await res.json();
        setCities(data.cities || []);
        setHotels(data.hotels || []);
      } catch {
        setError('Failed to load catalog');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredHotels = selectedCity
    ? hotels.filter((h) => h.city === selectedCity)
    : hotels;

  const compareHotel = async (hotel: Hotel) => {
    setComparing(hotel.hotelKey);
    setComparison(null);
    setError('');
    try {
      const params = new URLSearchParams({
        hotelKey: hotel.hotelKey,
        checkIn,
        checkOut,
      });
      const res = await fetch(`/api/compare?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      setComparison(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare');
    } finally {
      setComparing(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">
          Hotel Price Comparison
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Real-time prices from Booking.com, Expedia, Hotels.com, Agoda, Vio &amp; more — powered by Xotelo (free, no auth)
        </p>

        <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 shadow-md border border-zinc-200 dark:border-zinc-800 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                City
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              >
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Check-in
              </label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Check-out
              </label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-300">
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-zinc-600 dark:text-zinc-400 py-12">Loading hotels...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredHotels.map((hotel) => {
              const isComparing = comparing === hotel.hotelKey;
              const result = comparison?.hotel.hotelKey === hotel.hotelKey ? comparison : null;
              return (
                <div
                  key={hotel.hotelKey}
                  className="bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                >
                  <img src={hotel.image} alt={hotel.name} className="w-full h-48 object-cover" />
                  <div className="p-5">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{hotel.name}</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                      {hotel.city}, {hotel.country}
                    </p>

                    {result && result.rates.length > 0 && (
                      <div className="mb-3 p-3 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-900">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-xs text-green-700 dark:text-green-300 uppercase">
                              Cheapest
                            </div>
                            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                              {result.cheapest?.currency} {result.cheapest?.total.toFixed(2)}
                            </div>
                            <div className="text-sm text-green-700 dark:text-green-300">
                              on {result.cheapest?.provider}
                            </div>
                          </div>
                          {result.savingsPct > 0 && (
                            <div className="text-right">
                              <div className="inline-block px-2 py-1 bg-green-600 text-white text-xs font-bold rounded">
                                SAVE {result.savingsPct}%
                              </div>
                              <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                                ${result.savingsAmount} less
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {result && result.rates.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {result.rates.map((rate, idx) => (
                          <div
                            key={rate.code}
                            className="flex justify-between items-center p-2 rounded border border-zinc-200 dark:border-zinc-800"
                          >
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                PROVIDER_COLORS[rate.provider] ||
                                'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                              }`}
                            >
                              {rate.provider}
                              {idx === 0 && ' ⭐'}
                            </span>
                            <span className="font-semibold text-zinc-900 dark:text-white">
                              {rate.currency} {rate.total.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {result && result.rates.length === 0 && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                        No rates found for these dates
                      </p>
                    )}

                    <button
                      onClick={() => compareHotel(hotel)}
                      disabled={isComparing}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                    >
                      {isComparing ? 'Comparing...' : result ? 'Refresh prices' : 'Compare prices'}
                    </button>
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
