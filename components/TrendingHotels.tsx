'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import RatingBadge from '@/components/RatingBadge';

interface TrendingHotel {
  hotelKey: string;
  name: string;
  city: string;
  country: string;
  image: string;
}

// Rotate "trending" hotels based on day of year for variety
function getTrendingIndices(total: number, count: number): number[] {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    indices.push((dayOfYear * 7 + i * 11) % total);
  }
  return [...new Set(indices)].slice(0, count);
}

export default function TrendingHotels({ className = '' }: { className?: string }) {
  const [hotels, setHotels] = useState<TrendingHotel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/compare', { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        const all: TrendingHotel[] = data.hotels || [];
        if (all.length > 0) {
          const indices = getTrendingIndices(all.length, 6);
          setHotels(indices.map((i) => all[i]).filter(Boolean));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className={className}>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">🔥 Trending Now</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-slate-200 rounded-xl mb-2" />
              <div className="h-3 bg-slate-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (hotels.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-900">🔥 Trending Now</h2>
        <Link
          href="/search"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {hotels.map((hotel, idx) => (
          <Link
            key={hotel.hotelKey}
            href={`/hotel/${hotel.hotelKey}`}
            className="group relative overflow-hidden rounded-xl bg-white border border-slate-200 hover:shadow-lg hover:border-blue-200 transition-all"
          >
            <div className="relative h-28 overflow-hidden">
              <Image
                src={hotel.image}
                alt={hotel.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 50vw, 16vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <span className="absolute top-2 left-2 bg-white/90 backdrop-blur text-[10px] font-bold px-1.5 py-0.5 rounded text-slate-700">
                #{idx + 1}
              </span>
            </div>
            <div className="p-2.5">
              <h3 className="text-xs font-semibold text-slate-800 truncate">
                {hotel.name}
              </h3>
              <p className="text-[10px] text-slate-400 truncate">
                {hotel.city}, {hotel.country}
              </p>
              <RatingBadge hotelKey={hotel.hotelKey} size="sm" className="mt-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
