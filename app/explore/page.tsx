'use client';

import { useState, useEffect } from 'react';
import { CONTINENTS } from '@/lib/destinations';
import DealCard from '@/components/DealCard';
import Link from 'next/link';

interface Deal {
  hotel: { hotelKey: string; name: string; city: string; country: string; image: string };
  bestPrice: number;
  pricePerNight: number;
  bestProvider: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  currency: string;
}

export default function ExplorePage() {
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedContinent && !selectedCountry) return;

    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCountry) params.set('country', selectedCountry);
    else if (selectedContinent) params.set('continent', selectedContinent);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);

    fetch(`/api/deals?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setDeals(data.deals || []))
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, [selectedContinent, selectedCountry, checkIn, checkOut]);

  const selectedContinentData = CONTINENTS.find((c) => c.id === selectedContinent);

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Explore Destinations</h1>
          <p className="text-lg opacity-90">Find the best hotel deals by region, country, or city</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Date Filter */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Optional dates:</span>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              placeholder="Check-in"
            />
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              placeholder="Check-out"
            />
            {(checkIn || checkOut) && (
              <button
                onClick={() => { setCheckIn(''); setCheckOut(''); }}
                className="text-sm text-red-500 hover:text-red-600"
              >
                Clear dates
              </button>
            )}
          </div>
        </div>

        {/* Continent Selection */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {CONTINENTS.map((continent) => (
            <button
              key={continent.id}
              onClick={() => {
                setSelectedContinent(continent.id === selectedContinent ? null : continent.id);
                setSelectedCountry(null);
              }}
              className={`flex flex-col items-center p-6 rounded-xl transition-all min-w-[140px] ${
                selectedContinent === continent.id
                  ? 'bg-indigo-600 text-white shadow-xl scale-105'
                  : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 hover:shadow-md'
              }`}
            >
              <span className="text-3xl mb-2">{continent.emoji}</span>
              <span className="font-medium text-sm">{continent.name}</span>
              <span className="text-xs opacity-70 mt-1">
                {continent.countries.length} {continent.countries.length === 1 ? 'country' : 'countries'}
              </span>
            </button>
          ))}
        </div>

        {/* Country Selection */}
        {selectedContinentData && (
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {selectedContinentData.countries.map((country) => (
              <button
                key={country.code}
                onClick={() =>
                  setSelectedCountry(country.name === selectedCountry ? null : country.name)
                }
                className={`px-5 py-3 rounded-lg text-sm font-medium transition-all ${
                  selectedCountry === country.name
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                }`}
              >
                {country.name}
                <span className="ml-2 text-xs opacity-70">
                  {country.cities.join(', ')}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-500 mt-3">Finding the best deals...</p>
          </div>
        ) : deals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deals.map((deal) => (
              <DealCard key={deal.hotel.hotelKey} deal={deal} />
            ))}
          </div>
        ) : (selectedContinent || selectedCountry) ? (
          <div className="text-center py-12 text-zinc-500">
            <p className="text-lg">No deals available for this selection.</p>
            <p className="text-sm mt-2">Try selecting a different region or clearing date filters.</p>
          </div>
        ) : (
          <div className="text-center py-12 text-zinc-500">
            <p className="text-lg">Select a continent above to explore deals</p>
          </div>
        )}
      </div>
    </div>
  );
}
