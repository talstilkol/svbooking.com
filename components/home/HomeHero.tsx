'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import SearchAutocomplete from '@/components/SearchAutocomplete';

const ROTATING_CITIES = ['Tel Aviv', 'Paris', 'Tokyo', 'New York', 'Dubai', 'Barcelona', 'Rome'];

const HERO_BG_IMAGES = [
  'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1600&q=80',
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80',
  'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1600&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1600&q=80',
];

const POPULAR_CHIPS = ['Tel Aviv', 'Paris', 'Tokyo', 'New York', 'Dubai'];

export default function HomeHero() {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, 150]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);
  const [bgIdx, setBgIdx] = useState(0);
  const [cityIdx, setCityIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setBgIdx((i) => (i + 1) % HERO_BG_IMAGES.length), 6000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setCityIdx((i) => (i + 1) % ROTATING_CITIES.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <section ref={ref} className="relative overflow-hidden min-h-[640px] flex items-center">
      {HERO_BG_IMAGES.map((src, i) => (
        <motion.div
          key={src}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${src})`, y }}
          animate={{ opacity: i === bgIdx ? 0.35 : 0 }}
          transition={{ duration: 1.6, ease: 'easeInOut' }}
        />
      ))}
      <motion.div
        style={{ opacity }}
        className="absolute inset-0 bg-linear-to-b from-transparent via-zinc-50/40 to-zinc-50 dark:via-black/60 dark:to-black"
      />

      <div className="relative max-w-7xl mx-auto px-4 py-20 w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-6"
          >
            <Sparkles className="w-3 h-3" />
            AI-powered hotel price comparison
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] text-zinc-900 dark:text-white">
            Find the best hotel deal in{' '}
            <span className="relative inline-block">
              <motion.span
                key={ROTATING_CITIES[cityIdx]}
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -60, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent inline-block"
              >
                {ROTATING_CITIES[cityIdx]}
              </motion.span>
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-zinc-700 dark:text-zinc-300 max-w-2xl">
            Compare live prices from Booking.com, Expedia, Hotels.com, Agoda &amp; more — let our AI agent pick the
            winner.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-10 max-w-2xl"
          >
            <SearchAutocomplete />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-5 flex flex-wrap gap-2"
          >
            <span className="text-sm text-zinc-600 dark:text-zinc-400 mr-1">Popular:</span>
            {POPULAR_CHIPS.map((c, i) => (
              <motion.button
                key={c}
                onClick={() => router.push(`/search?city=${encodeURIComponent(c)}`)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.05 }}
                whileHover={{ scale: 1.05 }}
                className="px-3 py-1 rounded-full text-xs font-medium bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-indigo-400"
              >
                {c}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
