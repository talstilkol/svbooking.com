'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import {
  LEGACY_LOCAL_STORAGE_KEYS,
  LOCAL_STORAGE_KEYS,
  readLocalStorageJsonWithFallback,
} from '@/lib/local-storage-keys';

interface Stats {
  favorites: number;
  trips: number;
  searches: number;
  comparisons: number;
  alerts: number;
}

export default function DashboardStats({ className = '' }: { className?: string }) {
  const { t } = useLocale();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const favs = readLocalStorageJsonWithFallback(LOCAL_STORAGE_KEYS.favorites, [LEGACY_LOCAL_STORAGE_KEYS.favorites], []);
        const trips = readLocalStorageJsonWithFallback(LOCAL_STORAGE_KEYS.trips, [LEGACY_LOCAL_STORAGE_KEYS.trips], []);
        const recent = readLocalStorageJsonWithFallback(LOCAL_STORAGE_KEYS.recentlyViewed, [LEGACY_LOCAL_STORAGE_KEYS.recentlyViewed], []);
        const searches = readLocalStorageJsonWithFallback(
          LOCAL_STORAGE_KEYS.recentSearches,
          [LEGACY_LOCAL_STORAGE_KEYS.recentSearches, LEGACY_LOCAL_STORAGE_KEYS.recentSearchesUnprefixed],
          []
        );
        const alerts = readLocalStorageJsonWithFallback(LOCAL_STORAGE_KEYS.priceAlerts, [], []);

        setStats({
          favorites: favs.length,
          trips: trips.length,
          searches: searches.length,
          comparisons: recent.length,
          alerts: alerts.length,
        });
      } catch {
        setStats({
          favorites: 0, trips: 0, searches: 0, comparisons: 0,
          alerts: 0,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) return null;

  const cards = [
    { icon: '❤️', labelKey: 'dashStatFavorites', value: stats.favorites, color: 'from-red-500 to-pink-600' },
    { icon: '✈️', labelKey: 'dashStatTripsPlanned', value: stats.trips, color: 'from-blue-500 to-blue-600' },
    { icon: '🔍', labelKey: 'dashStatSearches', value: stats.searches, color: 'from-green-500 to-emerald-600' },
    { icon: '📊', labelKey: 'dashStatComparisons', value: stats.comparisons, color: 'from-purple-500 to-indigo-600' },
    { icon: '🔔', labelKey: 'dashStatPriceAlerts', value: stats.alerts, color: 'from-cyan-500 to-blue-600' },
  ];

  return (
    <div className={className}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((card) => (
          <div
            key={card.labelKey}
            className="relative overflow-hidden rounded-xl p-4 text-white"
          >
            <div className={`absolute inset-0 bg-linear-to-br ${card.color}`} />
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-4 translate-x-4" />
            <div className="relative">
              <span className="text-2xl block mb-1">{card.icon}</span>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-[10px] opacity-80">{t(card.labelKey)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
