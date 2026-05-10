'use client';

import { useState, useEffect } from 'react';
import { CONTINENTS } from '@/lib/destinations';
import DealCard from './DealCard';

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

export default function DestinationExplorer() {
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedContinent && !selectedCountry) return;

    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCountry) {
      params.set('country', selectedCountry);
    } else if (selectedContinent) {
      params.set('continent', selectedContinent);
    }

    fetch(`/api/deals?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setDeals(data.deals || []);
      })
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, [selectedContinent, selectedCountry]);

  const selectedContinentData = CONTINENTS.find((c) => c.id === selectedContinent);

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-zinc-900 mb-6 text-center">
        Explore by Destination
      </h2>

      <div className="flex flex-wrap justify-center gap-3 mb-6">
        {CONTINENTS.map((continent) => (
          <button
            key={continent.id}
            onClick={() => {
              setSelectedContinent(continent.id === selectedContinent ? null : continent.id);
              setSelectedCountry(null);
            }}
            className={`px-5 py-3 rounded-xl text-sm font-medium transition-all ${
              selectedContinent === continent.id
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-white text-zinc-700 border border-zinc-200 hover:border-blue-300 hover:bg-blue-50:bg-zinc-700'
            }`}
          >
            <span className="mr-2">{continent.emoji}</span>
            {continent.name}
          </button>
        ))}
      </div>

      {selectedContinentData && (
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {selectedContinentData.countries.map((country) => (
            <button
              key={country.code}
              onClick={() =>
                setSelectedCountry(country.name === selectedCountry ? null : country.name)
              }
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                selectedCountry === country.name
                  ? 'bg-amber-500 text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200:bg-zinc-700'
              }`}
            >
              {country.name}
              <span className="ml-1 text-xs opacity-70">({country.cities.length} {country.cities.length === 1 ? 'city' : 'cities'})</span>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-500 mt-2">Finding best deals...</p>
        </div>
      )}

      {!loading && deals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deals.map((deal) => (
            <DealCard key={deal.hotel.hotelKey} deal={deal} />
          ))}
        </div>
      )}

      {!loading && (selectedContinent || selectedCountry) && deals.length === 0 && (
        <p className="text-center text-zinc-500 py-8">
          No deals available right now. Try a different region.
        </p>
      )}
    </div>
  );
}
