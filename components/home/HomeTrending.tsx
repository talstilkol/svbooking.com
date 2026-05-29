'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';
import type { CatalogHotel } from '@/lib/types';

type Hotel = CatalogHotel;

export default function HomeTrending() {
  const [hotels, setHotels] = useState<Hotel[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/compare', { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setHotels((d.hotels || []).slice(0, 6)))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  if (hotels.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 py-20">
      <Reveal>
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Catalog destinations</h2>
            <p className="mt-2 text-slate-600">Catalog hotels with provider data when available</p>
          </div>
          <Link
            href="/search"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            View all →
          </Link>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hotels.map((h, i) => (
          <Reveal key={h.hotelKey} delay={i * 0.08}>
            <Link href={`/compare?hotelKey=${h.hotelKey}`} className="block">
              <div
                className="group relative aspect-[4/5] rounded-3xl overflow-hidden bg-slate-200 transition-transform duration-300 ease-out hover:-translate-y-1.5"
              >
                <Image
                  src={h.image}
                  alt={h.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <div className="flex items-center gap-1 text-xs opacity-90 mb-1">
                    <MapPin className="w-3 h-3" />
                    {h.city}, {h.country}
                  </div>
                  <h3 className="text-xl font-bold">{h.name}</h3>
                  <div className="mt-3 inline-flex items-center text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Compare prices →
                  </div>
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
