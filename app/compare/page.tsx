'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
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
  source?: string | null;
  freshness?: string;
  partial?: boolean;
  deepLink?: string | null;
  taxesIncluded?: boolean | null;
  priceAccuracyState?: string;
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

function localDate(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayStr() {
  return localDate(0);
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
  const [page, setPage] = useState(1);
  const HOTELS_PER_PAGE = 20;

  const compareHotelWithDates = useCallback(async (hotel: Hotel, ci: string, co: string) => {
    setComparing(hotel.hotelKey);
    setComparison(null);
    setError('');
    try {
      const params = new URLSearchParams({ hotelKey: hotel.hotelKey, checkIn: ci, checkOut: co });
      const res = await fetch(`/api/compare?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error('Price comparison unavailable');
      setComparison(data);
      if (data.cheapest) {
        addToRecentlyCompared({
          hotelKey: hotel.hotelKey,
          name: hotel.name,
          city: hotel.city,
          cheapest: { provider: data.cheapest.provider, total: data.cheapest.total, currency: data.cheapest.currency },
        });
      }
    } catch {
      setError('Price comparison is unavailable right now.');
    } finally {
      setComparing(null);
    }
  }, []);

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
            void compareHotelWithDates(hotel, ci, co);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') setError('Failed to load catalog');
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [urlHotelKey, urlCheckIn, urlCheckOut, compareHotelWithDates]);

  const filteredHotels = selectedCity
    ? hotels.filter((h) => h.city === selectedCity)
    : hotels;

  const totalPages = Math.ceil(filteredHotels.length / HOTELS_PER_PAGE);
  const paginatedHotels = filteredHotels.slice(
    (page - 1) * HOTELS_PER_PAGE,
    page * HOTELS_PER_PAGE
  );

  // Reset to page 1 when city filter changes
  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setPage(1);
  };

  const compareHotel = (hotel: Hotel) => compareHotelWithDates(hotel, checkIn, checkOut);

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
              Provider-returned prices when configured sources return rates
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
                onChange={(e) => handleCityChange(e.target.value)}
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
            {paginatedHotels.map((hotel) => {
              const isComparing = comparing === hotel.hotelKey;
              const result = comparison?.hotel.hotelKey === hotel.hotelKey ? comparison : null;
              return (
                <div
                  key={hotel.hotelKey}
                  className="bg-white rounded-lg shadow-md border border-zinc-200 overflow-hidden"
                >
                  <Link href={`/hotel/${hotel.hotelKey}`} aria-label={`Open ${hotel.name} details`}>
                    <Image src={hotel.image} alt={hotel.name} width={600} height={192} className="w-full h-48 object-cover hover:opacity-90 transition-opacity" />
                  </Link>
                  <div className="p-5">
                    <Link href={`/hotel/${hotel.hotelKey}`} className="hover:text-blue-600 transition-colors">
                      <h2 className="text-xl font-bold text-zinc-900">{hotel.name}</h2>
                    </Link>
                    <p className="text-sm text-zinc-500 mt-0.5 mb-1">
                      📍 {hotel.city}, {hotel.country}
                    </p>
                    <RatingBadge size="sm" className="mb-3" />

                    {result && result.rates.length > 0 && (
                      <div className="mb-3">
                        <UrgencyBadge providerCount={result.providerCount} />
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
                        {result.rates.map((rate, idx) => {
                          const rowClass = 'w-full flex justify-between items-start gap-3 p-3 rounded border border-slate-200 transition-colors group text-left';
                          const content = (
                            <>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-1">
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
                              <span
                                className="mt-2 flex flex-wrap gap-1.5"
                                aria-label={`Rate metadata for ${rate.provider}`}
                              >
                                {[
                                  rateSourceLabel(rate),
                                  rateFreshnessLabel(rate),
                                  rateCompletenessLabel(rate),
                                  rateTaxLabel(rate),
                                  rateAccuracyLabel(rate),
                                ].map((label) => (
                                  <span
                                    key={label}
                                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                                  >
                                    {label}
                                  </span>
                                ))}
                              </span>
                            </span>
                            <span className="flex shrink-0 flex-col items-end gap-1 text-right">
                              <span className="font-semibold text-slate-900 whitespace-nowrap">
                                {rate.currency} {rate.total.toFixed(2)}
                              </span>
                              <span className="text-xs text-slate-500">
                                {rate.deepLink ? 'Open provider ↗' : 'Provider search unavailable'}
                              </span>
                            </span>
                            </>
                          );

                          return rate.deepLink ? (
                            <button
                              key={`${rate.code}-${idx}`}
                              type="button"
                              onClick={async () => {
                                if (!rate.deepLink) return;
                                const tab = window.open('about:blank', '_blank');
                                if (tab) tab.opener = null;
                                try {
                                  const res = await fetch('/api/click', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      hotelKey: hotel.hotelKey,
                                      provider: rate.provider,
                                      url: rate.deepLink,
                                      price: rate.total,
                                      currency: rate.currency,
                                      taxesIncluded: rate.taxesIncluded,
                                    }),
                                  });
                                  const clickData = await res.json();
                                  if (tab && clickData.redirectUrl) tab.location.href = clickData.redirectUrl;
                                  else if (tab) tab.close();
                                } catch {
                                  if (tab) tab.close();
                                }
                              }}
                              className={`${rowClass} hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer`}
                            >
                              {content}
                            </button>
                          ) : (
                            <div
                              key={`${rate.code}-${idx}`}
                              className={`${rowClass} bg-slate-50`}
                            >
                              {content}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {result && result.rates.length === 0 && (
                      <div className="mb-3 p-3 bg-amber-50 rounded border border-amber-200 text-sm">
                        <p className="text-amber-800 font-medium">No rates available</p>
                        <p className="text-amber-700 mt-1">
                          This hotel has no provider-returned pricing data for the selected dates. Try adjusting dates or another catalog hotel.
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

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <nav aria-label="Hotel list pagination" className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={page === 1}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              ← Prev
            </button>
            <span className="text-sm text-slate-600 px-3">
              Page {page} of {totalPages} ({filteredHotels.length} hotels)
            </span>
            <button
              onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={page === totalPages}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Next →
            </button>
          </nav>
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
