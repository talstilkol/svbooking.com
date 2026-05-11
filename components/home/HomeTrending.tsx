'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';

interface Hotel {
  hotelKey: string;
  name: string;
  city: string;
  country: string;
  image: string;
}

export default function HomeTrending() {
  const [hotels, setHotels] = useState<Hotel[]>([]);

  useEffect(() => {
    fetch('/api/compare')
      .then((r) => r.json())
      .then((d) => setHotels((d.hotels || []).slice(0, 6)))
      .catch(() => {});
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 py-20">
      <Reveal>
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white">Trending destinations</h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">Real hotels with live prices</p>
          </div>
          <Link
            href="/search"
            className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            View all →
          </Link>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hotels.map((h, i) => (
          <Reveal key={h.hotelKey} delay={i * 0.08}>
            <Link href={`/compare?hotelKey=${h.hotelKey}`} className="block">
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="group relative aspect-4/5 rounded-3xl overflow-hidden bg-zinc-200 dark:bg-zinc-800"
              >
                <motion.img
                  src={h.image}
                  alt={h.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 0.6 }}
                />
                <div className="absolute inset-0 bg-linear-to-rt from-black/80 via-black/30 to-transparent" />
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
              </motion.div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
