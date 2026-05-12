'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import CheaperDates from '@/components/CheaperDates';
import HolidayWarning from '@/components/HolidayWarning';
import RatingBadge from '@/components/RatingBadge';
import ComparisonSummary from '@/components/ComparisonSummary';
import UrgencyBadge from '@/components/UrgencyBadge';
import RecentlyCompared, { addToRecentlyCompared } from '@/components/RecentlyCompared';
import DateSummary from '@/components/DateSummary';
import ProviderInfo from '@/components/ProviderInfo';
import { CompareCardSkeleton, PageSkeleton } from '@/components/Skeleton';
import GuestSelector from '@/components/GuestSelector';
import ShareBar from '@/components/ShareBar';

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
  'Booking.com': 'bg-blue-100 text-blue-800',
  'Expedia': 'bg-yellow-100 text-yellow-800',
  'Hotels.com': 'bg-red-100 text-red-800',
  'Agoda.com': 'bg-purple-100 text-purple-800',
  'Vio.com': 'bg-green-100 text-green-800',
  'Trip.com': 'bg-sky-100 text-sky-800',
  'Fairfield Inn': 'bg-orange-100 text-orange-800',
};

function getBookingUrl(provider: string, hotelName: string, city: string, checkIn: string, checkOut: string) {
  const query = encodeURIComponent(`${hotelName} ${city}`);
  const urls: Record<string, string> = {
    'Booking.com': `https://www.booking.com/searchresults.html?ss=${query}&checkin=${checkIn}&checkout=${checkOut}`,
    'Expedia': `https://www.expedia.com/Hotel-Search?destination=${query}&startDate=${checkIn}&endDate=${checkOut}`,
    'Hotels.com': `https://www.hotels.com/search.do?q-destination=${query}&q-check-in=${checkIn}&q-check-out=${checkOut}`,
    'Agoda.com': `https://www.agoda.com/search?city=${encodeURIComponent(city)}&checkIn=${checkIn}&checkOut=${checkOut}`,
    'Vio.com': `https://www.vio.com/hotels?q=${query}&checkIn=${checkIn}&checkOut=${checkOut}`,
    'Trip.com': `https://www.trip.com/hotels/?city=${encodeURIComponent(city)}&checkin=${checkIn}&checkout=${checkOut}`,
  };
  return urls[provider] || `https://www.google.com/travel/hotels?q=${query}`;
}

function localDate(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayStr() {
  return localDate(0);
}

function CompareInner() {
  const searchParams = useSearchParams();
  const urlHotelKey = searchParams.get('hotelKey') || '';
  const urlCheckIn = searchParams.get('checkIn') || '';
  const urlCheckOut = searchParams.get('checkOut') || '';

  const [cities, setCities] = useState<string[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [checkIn, setCheckIn] = useState(urlCheckIn || localDate(5));
  const [checkOut, setCheckOut] = useState(urlCheckOut || localDate(7));
  const [comparing, setComparing] = useState<string | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/compare', { signal: controller.signal });
        const data = await res.json();
        setCities(data.cities || []);
        setHotels(data.hotels || []);

        if (urlHotelKey) {
          const hotel = (data.hotels || []).find((h: Hotel) => h.hotelKey === urlHotelKey);
          if (hotel) {
            const ci = urlCheckIn || localDate(5);
            const co = urlCheckOut || localDate(7);
            setCheckIn(ci);
            setCheckOut(co);
            setTimeout(() => compareHotelDirect(hotel, ci, co), 100);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') setError('Failed to load catalog');
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const filteredHotels = selectedCity
    ? hotels.filter((h) => h.city === selectedCity)
    : hotels;

  async function compareHotelDirect(hotel: Hotel, ci: string, co: string) {
    setComparing(hotel.hotelKey);
    setComparison(null);
    setError('');
    try {
      const params = new URLSearchParams({ hotelKey: hotel.hotelKey, checkIn: ci, checkOut: co });
      const res = await fetch(`/api/compare?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      setComparison(data);
      // Track recently compared
      if (data.cheapest) {
        addToRecentlyCompared({
          hotelKey: hotel.hotelKey,
          name: hotel.name,
          city: hotel.city,
          cheapest: { provider: data.cheapest.provider, total: data.cheapest.total, currency: data.cheapest.currency },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare');
    } finally {
      setComparing(null);
    }
  }

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
      // Track recently compared
      if (data.cheapest) {
        addToRecentlyCompared({
          hotelKey: hotel.hotelKey,
          name: hotel.name,
          city: hotel.city,
          cheapest: { provider: data.cheapest.provider, total: data.cheapest.total, currency: data.cheapest.currency },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare');
    } finally {
      setComparing(null);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Gradient header */}
      <div className="bg-linear-to-r from-blue-600 via-blue-700 to-cyan-600 text-white py-10 px-4 mb-8">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="text-white/70 hover:text-white text-sm mb-3 inline-block transition-colors">← Home</Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Hotel Price Comparison
          </h1>
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-white/80 flex-1">
              Real-time prices from Booking.com, Expedia, Hotels.com, Agoda, Vio & more
            </p>
            <Link
              href="/compare-hotels"
              className="px-4 py-2 bg-white/20 backdrop-blur text-white rounded-lg hover:bg-white/30 text-sm font-medium transition shrink-0"
            >
              &#9878;&#65039; Side-by-side comparison
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 pb-8">
      <div className="max-w-6xl mx-auto">

        <div className="bg-white rounded-lg p-6 shadow-md border border-slate-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="compare-city" className="block text-sm font-medium text-slate-700 mb-1">
                City
              </label>
              <select
                id="compare-city"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900"
              >
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="compare-checkin" className="block text-sm font-medium text-slate-700 mb-1">
                Check-in
              </label>
              <input
                id="compare-checkin"
                type="date"
                value={checkIn}
                min={todayStr()}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="compare-checkout" className="block text-sm font-medium text-slate-700 mb-1">
                Check-out
              </label>
              <input
                id="compare-checkout"
                type="date"
                value={checkOut}
                min={checkIn || todayStr()}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900"
              />
            </div>
            <GuestSelector
              guests={guests}
              rooms={rooms}
              onGuestsChange={setGuests}
              onRoomsChange={setRooms}
            />
          </div>
        </div>

        <DateSummary checkIn={checkIn} checkOut={checkOut} className="mb-4" />

        <RecentlyCompared />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => <CompareCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredHotels.map((hotel) => {
              const isComparing = comparing === hotel.hotelKey;
              const result = comparison?.hotel.hotelKey === hotel.hotelKey ? comparison : null;
              return (
                <div
                  key={hotel.hotelKey}
                  className="bg-white rounded-lg shadow-md border border-zinc-200 overflow-hidden"
                >
                  <Link href={`/hotel/${hotel.hotelKey}`}>
                    <Image src={hotel.image} alt={hotel.name} width={600} height={192} className="w-full h-48 object-cover hover:opacity-90 transition-opacity" />
                  </Link>
                  <div className="p-5">
                    <Link href={`/hotel/${hotel.hotelKey}`} className="hover:text-blue-600 transition-colors">
                      <h2 className="text-xl font-bold text-zinc-900">{hotel.name}</h2>
                    </Link>
                    <p className="text-sm text-zinc-500 mt-0.5 mb-1">
                      📍 {hotel.city}, {hotel.country}
                    </p>
                    <RatingBadge hotelKey={hotel.hotelKey} size="sm" className="mb-3" />

                    {result && result.rates.length > 0 && (
                      <div className="mb-3">
                        <UrgencyBadge hotelKey={hotel.hotelKey} providerCount={result.providerCount} />
                      </div>
                    )}

                    {result && result.rates.length > 0 && (
                      <div className="mb-3 p-3 bg-green-50 rounded border border-green-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-xs text-green-700 uppercase">
                              Cheapest
                            </div>
                            <div className="text-2xl font-bold text-green-700">
                              {result.cheapest?.currency} {result.cheapest?.total.toFixed(2)}
                            </div>
                            <div className="text-sm text-green-700">
                              on {result.cheapest?.provider}
                            </div>
                          </div>
                          {result.savingsPct > 0 && (
                            <div className="text-right">
                              <div className="inline-block px-2 py-1 bg-green-600 text-white text-xs font-bold rounded">
                                SAVE {result.savingsPct}%
                              </div>
                              <div className="text-xs text-green-700 mt-1">
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
                          <a
                            key={rate.code}
                            href={getBookingUrl(rate.provider, hotel.name, hotel.city, checkIn, checkOut)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex justify-between items-center p-2 rounded border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                          >
                            <span className="flex items-center gap-1">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  PROVIDER_COLORS[rate.provider] ||
                                  'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {rate.provider}
                                {idx === 0 && ' ⭐'}
                              </span>
                              <ProviderInfo provider={rate.provider} />
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">
                                {rate.currency} {rate.total.toFixed(2)}
                              </span>
                              <span className="text-blue-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                Book ↗
                              </span>
                            </span>
                          </a>
                        ))}
                      </div>
                    )}

                    {result && result.rates.length === 0 && (
                      <div className="mb-3 p-3 bg-amber-50 rounded border border-amber-200 text-sm">
                        <p className="text-amber-800 font-medium">No rates available</p>
                        <p className="text-amber-700 mt-1">
                          This hotel has no live pricing data for the selected dates. Try adjusting dates or check directly on{' '}
                          <a href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotel.name + ' ' + hotel.city)}`} target="_blank" rel="noopener noreferrer" className="underline">Booking.com</a>
                        </p>
                      </div>
                    )}

                    <button
                      onClick={() => compareHotel(hotel)}
                      disabled={isComparing}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                    >
                      {isComparing ? 'Comparing...' : result ? 'Refresh prices' : 'Compare prices'}
                    </button>

                    {result && result.rates.length > 0 && (
                      <>
                        <ComparisonSummary
                          hotelName={hotel.name}
                          city={hotel.city}
                          checkIn={checkIn}
                          checkOut={checkOut}
                          rates={result.rates}
                          cheapest={result.cheapest}
                          savingsPct={result.savingsPct}
                        />
                        <HolidayWarning country={hotel.country} checkIn={checkIn} checkOut={checkOut} className="mt-3" />
                        <CheaperDates hotelKey={hotel.hotelKey} checkIn={checkIn} checkOut={checkOut} />
                        <ShareBar
                          url={`${typeof window !== 'undefined' ? window.location.origin : ''}/compare?hotelKey=${hotel.hotelKey}&checkIn=${checkIn}&checkOut=${checkOut}`}
                          title={`${hotel.name} from $${result.cheapest?.total.toFixed(0)} on ${result.cheapest?.provider}`}
                          className="mt-3 pt-3 border-t border-slate-100"
                        />
                      </>
                    )}
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

export default function ComparePage() {
  return (
    <Suspense fallback={<PageSkeleton headerColor="bg-blue-700" />}>
      <CompareInner />
    </Suspense>
  );
}
