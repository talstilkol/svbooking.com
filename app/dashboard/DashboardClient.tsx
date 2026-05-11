'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Calendar, BarChart3, Search, ArrowRight } from 'lucide-react';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import Reveal from '@/components/ui/Reveal';
import SuggestionsPanel from '@/components/ui/SuggestionsPanel';
import { useFavorites, useTrips } from '@/lib/useLocalStorage';

export default function DashboardClient({ userName }: { userName: string }) {
  const { favorites } = useFavorites();
  const { trips } = useTrips();

  const upcoming = trips.filter((t) => new Date(t.checkIn) > new Date()).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Welcome back,{' '}
          <span className="bg-linear-to-br from-indigo-600 to-pink-600 bg-clip-text text-transparent">
            {userName}
          </span>
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">Your travel command center.</p>
      </motion.div>

      <SuggestionsPanel />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Reveal delay={0.0}>
          <Link href="/favorites" className="block group">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 hover:border-pink-400 transition-colors">
              <Heart className="w-8 h-8 text-pink-500 mb-3" />
              <div className="text-3xl font-bold">
                <AnimatedCounter value={favorites.length} />
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Favorite hotels</div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-pink-600 group-hover:gap-2 transition-all">
                Manage <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </Link>
        </Reveal>
        <Reveal delay={0.08}>
          <Link href="/trips" className="block group">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 hover:border-purple-400 transition-colors">
              <Calendar className="w-8 h-8 text-purple-500 mb-3" />
              <div className="text-3xl font-bold">
                <AnimatedCounter value={trips.length} />
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Saved trips ({upcoming} upcoming)
              </div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-purple-600 group-hover:gap-2 transition-all">
                View all <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </Link>
        </Reveal>
        <Reveal delay={0.16}>
          <Link href="/compare" className="block group">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 hover:border-amber-400 transition-colors">
              <BarChart3 className="w-8 h-8 text-amber-500 mb-3" />
              <div className="text-3xl font-bold">5+</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Price providers compared</div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 group-hover:gap-2 transition-all">
                Compare now <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </Link>
        </Reveal>
      </div>

      <Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/search"
            className="flex items-center justify-between p-5 rounded-2xl bg-linear-to-br from-indigo-500 to-blue-500 text-white shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center gap-3">
              <Search className="w-6 h-6" />
              <span className="font-semibold">Find a new hotel</span>
            </div>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/profile"
            className="flex items-center justify-between p-5 rounded-2xl bg-linear-to-br from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚙</span>
              <span className="font-semibold">Edit preferences</span>
            </div>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
