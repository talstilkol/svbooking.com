'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CATALOG_STATS } from '@/lib/catalog-stats';
import {
  LEGACY_LOCAL_STORAGE_KEYS,
  LOCAL_STORAGE_KEYS,
  readLocalStorageJsonWithFallback,
  readLocalStorageStringWithFallback,
  writeLocalStorageJson,
} from '@/lib/local-storage-keys';

interface Step {
  icon: string;
  title: string;
  description: string;
  action: string;
  href: string;
  completed: boolean;
}

export default function OnboardingTour({ className = '' }: { className?: string }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        if (readLocalStorageStringWithFallback(LOCAL_STORAGE_KEYS.onboardingDismissed, [], null) === 'true') {
          setDismissed(true);
          return;
        }

        const favs = readLocalStorageJsonWithFallback(LOCAL_STORAGE_KEYS.favorites, [LEGACY_LOCAL_STORAGE_KEYS.favorites], []);
        const trips = readLocalStorageJsonWithFallback(LOCAL_STORAGE_KEYS.trips, [LEGACY_LOCAL_STORAGE_KEYS.trips], []);
        const recent = readLocalStorageJsonWithFallback(LOCAL_STORAGE_KEYS.recentlyViewed, [LEGACY_LOCAL_STORAGE_KEYS.recentlyViewed], []);
        const searches = readLocalStorageJsonWithFallback(
          LOCAL_STORAGE_KEYS.recentSearches,
          [LEGACY_LOCAL_STORAGE_KEYS.recentSearches, LEGACY_LOCAL_STORAGE_KEYS.recentSearchesUnprefixed],
          []
        );

        setSteps([
          {
            icon: '🔍',
            title: 'Search for a hotel',
            description: `Browse our catalog of ${CATALOG_STATS.hotels} hotels across ${CATALOG_STATS.cities} cities`,
            action: 'Search Now',
            href: '/search',
            completed: searches.length > 0,
          },
          {
            icon: '📊',
            title: 'Compare prices',
            description: 'See available provider prices side by side',
            action: 'Compare',
            href: '/compare',
            completed: recent.length > 0,
          },
          {
            icon: '❤️',
            title: 'Save a favorite',
            description: 'Heart any hotel to track it in your favorites',
            action: 'Browse Hotels',
            href: '/search',
            completed: favs.length > 0,
          },
          {
            icon: '✈️',
            title: 'Plan a trip',
            description: 'Save hotels with dates for follow-up',
            action: 'Plan Trip',
            href: '/trips',
            completed: trips.length > 0,
          },
          {
            icon: '🌍',
            title: 'Explore destinations',
            description: 'Browse catalog destinations by region',
            action: 'Explore',
            href: '/explore',
            completed: false,
          },
        ]);
      } catch {}
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (dismissed || steps.length === 0) return null;

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  // Don't show if all steps completed
  if (completedCount === steps.length) return null;

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">🚀 Getting Started</h3>
          <p className="text-[10px] text-slate-500">{completedCount}/{steps.length} completed</p>
        </div>
        <button
          onClick={() => {
            setDismissed(true);
            writeLocalStorageJson(LOCAL_STORAGE_KEYS.onboardingDismissed, 'true');
          }}
          className="text-xs text-slate-500 hover:text-slate-600 transition"
        >
          Dismiss
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-100">
        <div
          className="h-full bg-blue-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-4 space-y-2">
        {steps.map((step) => (
          <div
            key={step.title}
            className={`flex items-center gap-3 p-3 rounded-xl transition ${
              step.completed ? 'bg-green-50' : 'bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <span className="text-xl">{step.completed ? '✅' : step.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold ${step.completed ? 'text-green-700 line-through' : 'text-slate-800'}`}>
                {step.title}
              </p>
              <p className="text-[10px] text-slate-500">{step.description}</p>
            </div>
            {!step.completed && (
              <Link
                href={step.href}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-medium hover:bg-blue-700 transition shrink-0"
              >
                {step.action}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
