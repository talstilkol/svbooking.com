'use client';

import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import ProviderLogos from '@/components/ProviderLogos';
import { useLocale } from '@/components/LocaleProvider';

const ROTATING_CITIES = ['Tel Aviv', 'Paris', 'Tokyo', 'New York', 'Dubai', 'Barcelona', 'Rome', 'London'];

// Self-hosted hero images — eliminates Unsplash CDN latency for LCP
const HERO_BG_IMAGES = [
  '/images/hero/hero-beach.webp',
  '/images/hero/hero-paris.webp',
  '/images/hero/hero-pool.webp',
  '/images/hero/hero-hotel.webp',
];

const POPULAR_CHIPS = ['Tel Aviv', 'Paris', 'Tokyo', 'New York', 'Dubai'];

// Tiny blur placeholder (4x3 gradient matching typical hero aesthetic)
const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSIzIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjMiIGZpbGw9IiMxZTNhNWYiLz48L3N2Zz4=';

export default function HomeHero() {
  const router = useRouter();
  const { t } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, 150]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);
  const [bgIdx, setBgIdx] = useState(0);
  const [prevBgIdx, setPrevBgIdx] = useState(0);
  const [cityIdx, setCityIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setBgIdx((i) => {
        setPrevBgIdx(i);
        return (i + 1) % HERO_BG_IMAGES.length;
      });
    }, 6000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setCityIdx((i) => (i + 1) % ROTATING_CITIES.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <section ref={ref} className="relative overflow-hidden min-h-[640px] flex items-center">
      {/* Only mount active + previous image for crossfade — avoids loading all 4 upfront */}
      {HERO_BG_IMAGES.map((src, i) => {
        const isActive = i === bgIdx;
        const isPrev = i === prevBgIdx;
        if (!isActive && !isPrev) return null;
        return (
          <motion.div
            key={src}
            className="absolute inset-0"
            aria-hidden="true"
            style={{ y }}
            animate={{ opacity: isActive ? 0.35 : 0 }}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
          >
            <Image
              src={src}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
              priority={i === 0}
              quality={75}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
            />
          </motion.div>
        );
      })}
      <motion.div
        style={{ opacity }}
        className="absolute inset-0 bg-linear-to-b from-blue-900/60 via-blue-800/40 to-sky-50"
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
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-white text-xs font-semibold mb-6"
          >
            <Sparkles className="w-3 h-3" />
            {t('heroBadge')}
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] text-white drop-shadow-lg">
            {t('heroHeadline')}{' '}
            <span className="relative inline-block">
              <AnimatePresence mode="wait">
                <motion.span
                  key={ROTATING_CITIES[cityIdx]}
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -60, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className="bg-linear-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent inline-block"
                >
                  {ROTATING_CITIES[cityIdx]}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-white/90 max-w-2xl drop-shadow">
            {t('heroSubtext')}
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-10 max-w-2xl bg-white/95 backdrop-blur p-5 rounded-2xl shadow-2xl"
          >
            <SearchAutocomplete />
            <ProviderLogos className="mt-3 justify-center" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-5 flex flex-wrap gap-2"
          >
            <span className="text-sm text-white/80 mr-1">{t('popular')}</span>
            {POPULAR_CHIPS.map((c, i) => (
              <motion.button
                key={c}
                onClick={() => router.push(`/search?city=${encodeURIComponent(c)}`)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.05 }}
                whileHover={{ scale: 1.05 }}
                className="px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur border border-white/30 text-white hover:bg-white/30 transition"
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
