'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import RatingBadge from '@/components/RatingBadge';

interface Hotel {
  hotelKey: string;
  name: string;
  city: string;
  country: string;
  image: string;
}

interface SimilarHotelsProps {
  currentHotelKey: string;
  city: string;
  country: string;
}

export default function SimilarHotels({ currentHotelKey, city, country }: SimilarHotelsProps) {
  const [hotels, setHotels] = useState<Hotel[]>([]);

  useEffect(() => {
    fetch('/api/compare')
      .then((r) => r.json())
      .then((data) => {
        const all: Hotel[] = data.hotels || [];
        // Same city first, then same country, exclude current
        const sameCity = all.filter(
          (h) => h.city === city && h.hotelKey !== currentHotelKey
        );
        const sameCountry = all.filter(
          (h) => h.country === country && h.city !== city && h.hotelKey !== currentHotelKey
        );
        setHotels([...sameCity, ...sameCountry].slice(0, 4));
      })
      .catch(() => {});
  }, [currentHotelKey, city, country]);

  if (hotels.length === 0) return null;

  return (
    <section className="mt-10">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        Similar hotels in {city}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {hotels.map((h) => (
          <Link
            key={h.hotelKey}
            href={`/hotel/${h.hotelKey}`}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="relative h-28">
              <Image
                src={h.image}
                alt={h.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
            <div className="p-3">
              <p className="font-semibold text-slate-900 text-sm truncate">{h.name}</p>
              <p className="text-xs text-slate-500 mt-0.5 mb-1">
                📍 {h.city}, {h.country}
              </p>
              <RatingBadge size="sm" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
