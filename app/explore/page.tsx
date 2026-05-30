'use client';

import { useState, useEffect } from 'react';
import { CONTINENTS } from '@/lib/destinations';
import DealCard from '@/components/DealCard';
import WorldMap from '@/components/WorldMap';
import DestinationIntel from '@/components/DestinationIntel';
import { useLocale } from '@/components/LocaleProvider';

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

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

type SortOption = 'price' | 'name' | 'country';

function sortDeals(deals: Deal[], sortBy: SortOption): Deal[] {
  return [...deals].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.pricePerNight - b.pricePerNight;
      case 'name':
        return a.hotel.name.localeCompare(b.hotel.name);
      case 'country':
        return a.hotel.country.localeCompare(b.hotel.country) || a.pricePerNight - b.pricePerNight;
      default:
        return 0;
    }
  });
}

export default function ExplorePage() {
  const { t } = useLocale();
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('price');
  const [strategy, setStrategy] = useState('');

  const sortedDeals = sortDeals(deals, sortBy);

  // Load featured deals on initial mount (from agent cache if available)
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) setLoading(true);
    });
    fetch('/api/deals?limit=12', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setDeals(data.deals || []);
        setStrategy(data.strategy || '');
      })
      .catch((err) => { if (err.name !== 'AbortError') setDeals([]); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  // Fetch filtered deals when user selects a filter
  useEffect(() => {
    if (!selectedContinent && !selectedCountry && !selectedCity) return;

    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) setLoading(true);
    });
    const params = new URLSearchParams();
    if (selectedCity) params.set('city', selectedCity);
    else if (selectedCountry) params.set('country', selectedCountry);
    else if (selectedContinent) params.set('continent', selectedContinent);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);

    fetch(`/api/deals?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setDeals(data.deals || []);
        setStrategy(data.strategy || '');
      })
      .catch((err) => { if (err.name !== 'AbortError') setDeals([]); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [selectedContinent, selectedCountry, selectedCity, checkIn, checkOut]);

  function handleMapCity(city: string) {
    setSelectedCity(city === selectedCity ? null : city);
    setSelectedCountry(null);
    setSelectedContinent(null);
  }

  const selectedContinentData = CONTINENTS.find((c) => c.id === selectedContinent);

  return (
    <div className="min-h-screen">
      <div className="bg-linear-to-r from-indigo-600 to-purple-600 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">{t('exploreTitle')}</h1>
          <p className="text-lg opacity-90">{t('exploreSubtext')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Date Filter */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-zinc-700">{t('exploreOptionalDates')}</span>
            <input
              type="date"
              aria-label={t('exploreCheckIn')}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-white text-zinc-900"
            />
            <input
              type="date"
              aria-label={t('exploreCheckOut')}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-white text-zinc-900"
            />
            {(checkIn || checkOut) && (
              <button
                onClick={() => { setCheckIn(''); setCheckOut(''); }}
                className="text-sm text-red-500 hover:text-red-600"
              >
                {t('exploreClearDates')}
              </button>
            )}
          </div>
        </div>

        {/* World map */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-700 mb-3">
            📍 {t('exploreClickCity')}
            {selectedCity && (
              <span className="ml-2 text-sm font-normal text-indigo-600">
                {interpolate(t('exploreShowingDeals'), { city: selectedCity })}
                <button
                  onClick={() => setSelectedCity(null)}
                  className="ml-2 text-red-500 hover:text-red-600 text-xs"
                >
                  ✕ {t('exploreClear')}
                </button>
              </span>
            )}
          </h2>
          <WorldMap
            onCitySelect={handleMapCity}
            selectedCity={selectedCity || undefined}
            className="w-full"
          />
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
                  : 'bg-white text-zinc-700 border border-zinc-200 hover:border-indigo-300 hover:shadow-md'
              }`}
            >
              <span className="text-3xl mb-2">{continent.emoji}</span>
              <span className="font-medium text-sm">{continent.name}</span>
              <span className="text-xs opacity-70 mt-1">
                {interpolate(t('exploreCountriesCount'), { count: continent.countries.length })}
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
                    : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'
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

        {/* Destination Intelligence */}
        {selectedCity && (
          <DestinationIntel
            city={selectedCity}
            checkIn={checkIn || undefined}
            checkOut={checkOut || undefined}
            className="mb-8"
          />
        )}

        {/* Sort + Results */}
        {deals.length > 0 && !loading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-zinc-500">
              {interpolate(t('exploreDealsFound'), { count: deals.length })}
              {strategy === 'cached-agent' && (
                <span className="text-emerald-600 ml-1">{t('exploreInstant')}</span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">{t('exploreSortBy')}</span>
              {(['price', 'name', 'country'] as SortOption[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSortBy(opt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sortBy === opt
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-zinc-600 border border-zinc-200 hover:border-indigo-300'
                  }`}
                >
                  {opt === 'price' ? `💰 ${t('exploreSortPrice')}` : opt === 'name' ? `🏨 ${t('exploreSortName')}` : `🌍 ${t('exploreSortCountry')}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-500 mt-3">{t('exploreFinding')}</p>
          </div>
        ) : sortedDeals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedDeals.map((deal) => (
              <DealCard key={deal.hotel.hotelKey} deal={deal} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-zinc-500">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-lg">{t('exploreNoDeals')}</p>
            <p className="text-sm mt-2">
              {selectedContinent || selectedCountry || selectedCity
                ? t('exploreTryDifferent')
                : t('exploreClickToExplore')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
