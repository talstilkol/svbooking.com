'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Listing {
  _id: string;
  title: string;
  location: string;
  pricePerNight: number;
  rating: number;
  images?: string[];
  description?: string;
}

export default function BookingForm() {
  const { id } = useParams();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [form, setForm] = useState({
    guestName: '',
    checkIn: '',
    checkOut: '',
    guests: 1,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const res = await fetch(`/api/listings/${id}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setListing(data);
      } catch {
        setError('Hotel not found');
      }
    };
    fetchListing();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const getNights = () => {
    if (!form.checkIn || !form.checkOut) return 0;
    const a = new Date(form.checkIn);
    const b = new Date(form.checkOut);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || a >= b) return 0;
    return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  };

  const nights = getNights();
  const totalPrice = listing ? nights * listing.pricePerNight : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanName = form.guestName.trim();
    if (cleanName.length < 2) {
      setError('Guest name must contain at least 2 characters');
      setLoading(false);
      return;
    }
    if (!form.checkIn || !form.checkOut) {
      setError('Please select dates');
      setLoading(false);
      return;
    }
    const guestsNumber = Number(form.guests);
    if (!Number.isInteger(guestsNumber) || guestsNumber < 1) {
      setError('Guests must be a positive integer');
      setLoading(false);
      return;
    }
    if (new Date(form.checkIn) >= new Date(form.checkOut)) {
      setError('Check-in must be before check-out');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: id, ...form }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Booking failed');
      }

      router.push('/search');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  if (!listing) return <div className="min-h-screen p-8">Loading...</div>;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/search" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
          ← Back to search
        </Link>
        <h1 className="text-3xl font-bold text-zinc-900 mb-4">Book: {listing.title}</h1>
        <p className="text-zinc-600 mb-2">{listing.location}</p>
        <p className="text-2xl font-bold text-blue-600 mb-6">${listing.pricePerNight}/night</p>
        {listing.description && (
          <p className="text-zinc-600 mb-6">{listing.description}</p>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 shadow-md border border-zinc-200">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">Booking Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Your Name</label>
              <input
                name="guestName"
                placeholder="Enter your name"
                value={form.guestName}
                onChange={handleChange}
                required
                className="w-full border border-zinc-300 rounded-lg px-4 py-2 bg-white text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Check-in Date</label>
              <input
                type="date"
                name="checkIn"
                value={form.checkIn}
                onChange={handleChange}
                required
                className="w-full border border-zinc-300 rounded-lg px-4 py-2 bg-white text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Check-out Date</label>
              <input
                type="date"
                name="checkOut"
                value={form.checkOut}
                onChange={handleChange}
                required
                className="w-full border border-zinc-300 rounded-lg px-4 py-2 bg-white text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Number of Guests</label>
              <input
                type="number"
                name="guests"
                min="1"
                value={form.guests}
                onChange={handleChange}
                className="w-full border border-zinc-300 rounded-lg px-4 py-2 bg-white text-zinc-900"
              />
            </div>

            {nights > 0 && (
              <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50">
                <div className="flex justify-between text-sm text-zinc-600">
                  <span>Nights</span>
                  <span>{nights}</span>
                </div>
                <div className="flex justify-between text-sm text-zinc-600">
                  <span>${listing.pricePerNight} × {nights} nights</span>
                  <span>${totalPrice}</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-zinc-900 mt-2 pt-2 border-t border-zinc-300">
                  <span>Total</span>
                  <span>${totalPrice}</span>
                </div>
              </div>
            )}

            {error && <p className="text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              {loading ? 'Processing...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
