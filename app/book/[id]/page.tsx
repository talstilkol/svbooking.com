'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Hotel { hotelKey: string; name: string; city: string; country: string; image: string; }

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/compare?hotelKey=${encodeURIComponent(id)}`).then(r => r.json()).then(d => {
      const h = d.hotel || (d.hotels || []).find((x: Hotel) => x.hotelKey === id);
      if (h) setHotel(h); else setError('Hotel not found');
    }).catch(() => setError('Failed to load'));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true);
    if (!checkIn || !checkOut) { setError('Please select dates'); setSaving(false); return; }
    if (new Date(checkIn) >= new Date(checkOut)) { setError('Check-in must be before check-out'); setSaving(false); return; }
    try {
      const res = await fetch('/api/me/trips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hotelKey: id, hotelName: hotel?.name, city: hotel?.city, country: hotel?.country, image: hotel?.image, checkIn, checkOut, guests, notes }) });
      if (!res.ok) throw new Error('Trip save failed');
      router.push('/trips');
    } catch { setError('Trip could not be saved right now.'); }
    finally { setSaving(false); }
  };

  if (error && !hotel) return <div className="min-h-screen p-8 text-center"><p className="text-red-600 mb-4">{error}</p><Link href="/search" className="text-blue-600 underline">Browse hotels</Link></div>;
  if (!hotel) return <div className="min-h-screen p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href={`/compare?hotelKey=${id}`} className="text-blue-600 hover:underline text-sm mb-4 inline-block">← Back to compare</Link>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-2">Plan trip: {hotel.name}</h1>
        <p className="text-zinc-600 mb-6">{hotel.city}, {hotel.country}</p>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-zinc-200 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Check-in</label>
            <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} required className="w-full border border-zinc-300 rounded-lg px-4 py-2 bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Check-out</label>
            <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} required className="w-full border border-zinc-300 rounded-lg px-4 py-2 bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Guests</label>
            <input type="number" min={1} max={20} value={guests} onChange={e => setGuests(Number(e.target.value))} className="w-full border border-zinc-300 rounded-lg px-4 py-2 bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={280} rows={3} className="w-full border border-zinc-300 rounded-lg px-4 py-2 bg-white" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-linear-to-r from-indigo-600 to-pink-600 text-white font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save trip'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
