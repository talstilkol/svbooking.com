'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useTrips, SavedTrip } from '@/lib/useLocalStorage';
import CheaperDates from '@/components/CheaperDates';
import { PageSkeleton } from '@/components/Skeleton';

interface CatalogHotel {
  hotelKey: string;
  name: string;
  city: string;
  country: string;
  image: string;
}

interface Rate {
  provider: string;
  code: string;
  total: number;
  currency: string;
  trust?: number;
  score?: number;
}

interface AgentResponse {
  hotel: { hotelKey: string; name: string };
  recommended: Rate | null;
  cheapest: Rate | null;
  mostExpensive: Rate | null;
  ranked: Rate[];
  savingsPct: number;
  savingsVsExpensive: number;
  reasoning: string;
  verdict: string;
  providerCount: number;
  error?: string;
}

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayStr() {
  return todayPlus(0);
}

function TripsInner() {
  const searchParams = useSearchParams();
  const { trips, addTrip, removeTrip, hydrated } = useTrips();
  const [hotels, setHotels] = useState<CatalogHotel[]>([]);
  const [hotelKey, setHotelKey] = useState(searchParams.get('hotelKey') || '');
  const [checkIn, setCheckIn] = useState(todayPlus(7));
  const [checkOut, setCheckOut] = useState(todayPlus(10));
  const [guests, setGuests] = useState(2);
  const [notes, setNotes] = useState('');
  const [agentLoading, setAgentLoading] = useState<string | null>(null);
  const [agentResults, setAgentResults] = useState<Record<string, AgentResponse>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/compare', { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setHotels(d.hotels || []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!hotelKey) return setError('Please select a hotel');
    if (!checkIn || !checkOut) return setError('Please select dates');
    if (new Date(checkIn) >= new Date(checkOut)) return setError('Check-in must be before check-out');
    if (!Number.isInteger(Number(guests)) || Number(guests) < 1)
      return setError('Guests must be a positive integer');

    const hotel = hotels.find((h) => h.hotelKey === hotelKey);
    if (!hotel) return setError('Hotel not found');

    addTrip({
      hotelKey: hotel.hotelKey,
      hotelName: hotel.name,
      city: hotel.city,
      country: hotel.country,
      image: hotel.image,
      checkIn,
      checkOut,
      guests: Number(guests),
      notes: notes.trim() || undefined,
    });
    setNotes('');
  };

  const askAgent = async (trip: SavedTrip) => {
    setAgentLoading(trip.id);
    setError('');
    try {
      const params = new URLSearchParams({
        hotelKey: trip.hotelKey,
        checkIn: trip.checkIn,
        checkOut: trip.checkOut,
      });
      const res = await fetch(`/api/agent?${params}`);
      const data: AgentResponse = await res.json();
      if (!res.ok) throw new Error(data.error || 'Agent failed');
      setAgentResults((prev) => ({ ...prev, [trip.id]: data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent failed');
    } finally {
      setAgentLoading(null);
    }
  };

  if (!hydrated) {
    return <div className="min-h-screen p-8 text-center text-zinc-600">Loading...</div>;
  }

  return (
    <div className="min-h-screen">
      {/* Gradient header */}
      <div className="bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white py-10 px-4 mb-8">
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="text-white/70 hover:text-white text-sm mb-3 inline-block transition-colors">← Home</Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">My Trips</h1>
          <p className="text-white/80">
            Plan future vacations and let our AI agent find the best price across providers.
          </p>
        </div>
      </div>

      <div className="px-4 pb-8">
      <div className="max-w-5xl mx-auto">

        <form
          onSubmit={handleAdd}
          className="bg-white rounded-lg p-6 shadow-md border border-zinc-200 mb-8"
        >
          <h2 className="text-xl font-bold text-zinc-900 mb-4">Plan a New Trip</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="trip-hotel" className="block text-sm font-medium text-zinc-700 mb-1">Hotel</label>
              <select
                id="trip-hotel"
                value={hotelKey}
                onChange={(e) => setHotelKey(e.target.value)}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 bg-white text-zinc-900"
              >
                <option value="">— Select a hotel —</option>
                {hotels.map((h) => (
                  <option key={h.hotelKey} value={h.hotelKey}>
                    {h.name} — {h.city}, {h.country}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="trip-checkin" className="block text-sm font-medium text-zinc-700 mb-1">Check-in</label>
              <input
                id="trip-checkin"
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 bg-white text-zinc-900"
              />
            </div>
            <div>
              <label htmlFor="trip-checkout" className="block text-sm font-medium text-zinc-700 mb-1">Check-out</label>
              <input
                id="trip-checkout"
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 bg-white text-zinc-900"
              />
            </div>
            <div>
              <label htmlFor="trip-guests" className="block text-sm font-medium text-zinc-700 mb-1">Guests</label>
              <input
                id="trip-guests"
                type="number"
                min="1"
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 bg-white text-zinc-900"
              />
            </div>
            <div>
              <label htmlFor="trip-notes" className="block text-sm font-medium text-zinc-700 mb-1">Notes (optional)</label>
              <input
                id="trip-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anniversary trip, work travel, etc."
                className="w-full border border-zinc-300 rounded-lg px-3 py-2 bg-white text-zinc-900"
              />
            </div>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}
          <button type="submit" className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Save Trip
          </button>
        </form>

        <h2 className="text-2xl font-bold text-zinc-900 mb-4">
          Saved Trips ({trips.length})
        </h2>

        {trips.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center border border-zinc-200">
            <p className="text-zinc-600">No trips planned yet. Add your first trip above!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {trips.map((trip) => {
              const result = agentResults[trip.id];
              const loading = agentLoading === trip.id;
              return (
                <div
                  key={trip.id}
                  className="bg-white rounded-lg shadow-md border border-zinc-200 overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row">
                    <Image src={trip.image} alt={trip.hotelName} width={256} height={192} className="w-full md:w-64 h-48 md:h-auto object-cover" />
                    <div className="p-5 flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h3 className="text-xl font-bold text-zinc-900">{trip.hotelName}</h3>
                          <p className="text-sm text-zinc-500">
                            {trip.city}, {trip.country}
                          </p>
                        </div>
                        <button
                          onClick={() => removeTrip(trip.id)}
                          className="px-2 py-1 text-red-500 hover:bg-red-50 rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <div className="text-zinc-500">Check-in</div>
                          <div className="font-medium text-zinc-900">{trip.checkIn}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500">Check-out</div>
                          <div className="font-medium text-zinc-900">{trip.checkOut}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500">Guests</div>
                          <div className="font-medium text-zinc-900">{trip.guests}</div>
                        </div>
                      </div>
                      {trip.notes && (
                        <p className="mt-2 text-sm italic text-zinc-600">&quot;{trip.notes}&quot;</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button
                          onClick={() => askAgent(trip)}
                          disabled={loading}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400 text-sm"
                        >
                          {loading ? 'Agent analyzing...' : result ? '🤖 Re-analyze' : '🤖 Ask AI Agent'}
                        </button>
                      </div>
                      <CheaperDates hotelKey={trip.hotelKey} checkIn={trip.checkIn} checkOut={trip.checkOut} />
                    </div>
                  </div>

                  {result && (
                    <div className="border-t border-zinc-200 p-5 bg-zinc-50">
                      {result.recommended ? (
                        <>
                          <div className="flex flex-col md:flex-row gap-4">
                            <div className="md:w-1/3 p-4 bg-purple-50 rounded-lg border-2 border-purple-500">
                              <div className="text-xs text-purple-700 uppercase font-bold">
                                🤖 Agent recommends
                              </div>
                              <div className="text-2xl font-bold text-purple-700 mt-1">
                                {result.recommended.provider}
                              </div>
                              <div className="text-3xl font-bold text-zinc-900 mt-1">
                                {result.recommended.currency} {result.recommended.total.toFixed(2)}
                              </div>
                              <div className="text-xs text-zinc-500 mt-1">
                                Trust: {((result.recommended.trust || 0) * 100).toFixed(0)}% · Score: {((result.recommended.score || 0) * 100).toFixed(0)}%
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-zinc-700 mb-3">
                                <strong>Why?</strong> {result.reasoning}
                              </p>
                              <div className="text-xs text-zinc-500 mb-2">
                                All offers ({result.providerCount}, sorted by agent score):
                              </div>
                              <div className="space-y-1">
                                {result.ranked.map((r, i) => (
                                  <div
                                    key={r.code}
                                    className={`flex justify-between items-center text-sm p-2 rounded ${
                                      i === 0
                                        ? 'bg-purple-100 font-semibold'
                                        : 'bg-white'
                                    }`}
                                  >
                                    <span>
                                      {i === 0 && '🏆 '}
                                      {r.provider}
                                      <span className="text-xs text-zinc-500 ml-2">
                                        (trust {((r.trust || 0) * 100).toFixed(0)}%)
                                      </span>
                                    </span>
                                    <span className="font-mono">
                                      {r.currency} {r.total.toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {result.savingsPct > 0 && (
                                <p className="mt-3 text-xs text-green-700">
                                  💰 Spread: ${result.savingsVsExpensive.toFixed(2)} ({result.savingsPct}%) between cheapest and most expensive provider
                                </p>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-zinc-600">{result.reasoning}</p>
                      )}
                    </div>
                  )}
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

export default function TripsPage() {
  return (
    <Suspense fallback={<PageSkeleton headerColor="bg-teal-700" />}>
      <TripsInner />
    </Suspense>
  );
}
