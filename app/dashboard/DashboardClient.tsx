'use client';

import Link from 'next/link';
import { Heart, Calendar, BarChart3, Search, ArrowRight } from 'lucide-react';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import Reveal from '@/components/ui/Reveal';
import SuggestionsPanel from '@/components/ui/SuggestionsPanel';
import { useFavorites, useTrips } from '@/lib/useLocalStorage';
import { useLocale } from '@/components/LocaleProvider';

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

export default function DashboardClient({ userName }: { userName: string }) {
  const { favorites } = useFavorites();
  const { trips } = useTrips();
  const { t } = useLocale();

  const upcoming = trips.filter((t) => new Date(t.checkIn) > new Date()).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="animate-fade-in mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          {t('dashWelcomeBack')}{' '}
          <span className="bg-linear-to-br from-indigo-600 to-pink-600 bg-clip-text text-transparent">
            {userName}
          </span>
        </h1>
        <p className="mt-2 text-zinc-600">{t('dashSubtitle')}</p>
      </div>

      <SuggestionsPanel />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Reveal delay={0.0}>
          <Link href="/favorites" className="block group">
            <div className="p-6 rounded-2xl bg-white border border-zinc-200/60 hover:border-pink-400 transition-colors">
              <Heart className="w-8 h-8 text-pink-500 mb-3" />
              <div className="text-3xl font-bold">
                <AnimatedCounter value={favorites.length} />
              </div>
              <div className="text-sm text-zinc-600 mt-1">{t('dashFavoriteHotels')}</div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-pink-600 group-hover:gap-2 transition-all">
                {t('dashManage')} <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </Link>
        </Reveal>
        <Reveal delay={0.08}>
          <Link href="/trips" className="block group">
            <div className="p-6 rounded-2xl bg-white border border-zinc-200/60 hover:border-purple-400 transition-colors">
              <Calendar className="w-8 h-8 text-purple-500 mb-3" />
              <div className="text-3xl font-bold">
                <AnimatedCounter value={trips.length} />
              </div>
              <div className="text-sm text-zinc-600 mt-1">
                {interpolate(t('dashSavedTrips'), { count: upcoming })}
              </div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-purple-600 group-hover:gap-2 transition-all">
                {t('dashViewAll')} <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </Link>
        </Reveal>
        <Reveal delay={0.16}>
          <Link href="/compare" className="block group">
            <div className="p-6 rounded-2xl bg-white border border-zinc-200/60 hover:border-amber-400 transition-colors">
              <BarChart3 className="w-8 h-8 text-amber-500 mb-3" />
              <div className="text-3xl font-bold">5+</div>
              <div className="text-sm text-zinc-600 mt-1">{t('dashProvidersCompared')}</div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 group-hover:gap-2 transition-all">
                {t('dashCompareNow')} <ArrowRight className="w-3 h-3" />
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
              <span className="font-semibold">{t('dashFindHotel')}</span>
            </div>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/profile"
            className="flex items-center justify-between p-5 rounded-2xl bg-linear-to-br from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚙</span>
              <span className="font-semibold">{t('dashEditPrefs')}</span>
            </div>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
