'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ComparedHotel {
  hotelKey: string;
  name: string;
  city: string;
  cheapest?: { provider: string; total: number; currency: string };
  timestamp: string;
}

const STORAGE_KEY = 'svbooking:recently-compared';
const MAX_ITEMS = 6;

export function addToRecentlyCompared(hotel: Omit<ComparedHotel, 'timestamp'>) {
  try {
    const existing: ComparedHotel[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const filtered = existing.filter((h) => h.hotelKey !== hotel.hotelKey);
    const updated = [{ ...hotel, timestamp: new Date().toISOString() }, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export default function RecentlyCompared() {
  const [hotels, setHotels] = useState<ComparedHotel[]>([]);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setHotels(data);
    } catch {
      setHotels([]);
    }
  }, []);

  if (hotels.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Recently Compared
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {hotels.map((hotel) => (
          <Link
            key={hotel.hotelKey}
            href={`/hotel/${hotel.hotelKey}`}
            className="shrink-0 bg-white border border-slate-200 rounded-lg px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all min-w-[200px]"
          >
            <div className="font-medium text-slate-800 text-sm truncate">{hotel.name}</div>
            <div className="text-xs text-slate-500 mt-0.5">{hotel.city}</div>
            {hotel.cheapest && (
              <div className="text-sm font-bold text-emerald-600 mt-1">
                {hotel.cheapest.currency} {hotel.cheapest.total.toFixed(0)}
                <span className="text-xs font-normal text-slate-400 ml-1">
                  on {hotel.cheapest.provider}
                </span>
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
