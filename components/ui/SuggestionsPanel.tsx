'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import Link from 'next/link';
import { useFavorites, useTrips } from '@/lib/useLocalStorage';
import { buildSuggestions, type Suggestion } from '@/lib/suggestions';

export default function SuggestionsPanel() {
  const { favorites, hydrated: favHy } = useFavorites();
  const { trips, hydrated: tripHy } = useTrips();
  const [homeCity, setHomeCity] = useState<string | undefined>();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/me/prefs')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setHomeCity(d?.prefs?.homeCity))
      .catch(() => {});
  }, []);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!favHy || !tripHy) return [];
    return buildSuggestions({ favorites, trips, prefsHomeCity: homeCity });
  }, [favorites, trips, homeCity, favHy, tripHy]);

  const visible = suggestions.filter((s) => !dismissed.has(s.id));
  if (visible.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-indigo-500" />
        <h2 className="text-lg font-bold text-zinc-900">Smart suggestions for you</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {visible.map((s, i) => (
          <div
            key={s.id}
            style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'backwards' }}
            className="animate-fade-in relative p-4 rounded-2xl glass border border-indigo-200/40 group hover:border-indigo-400 transition-colors"
          >
            <button
              onClick={() => setDismissed((prev) => new Set(prev).add(s.id))}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-zinc-200/50"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <h3 className="font-semibold text-sm text-zinc-900 pr-6">{s.title}</h3>
            <p className="text-xs text-zinc-600 mt-1 mb-3">{s.description}</p>
            <Link
              href={s.action.href}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:gap-2 transition-all"
            >
              {s.action.label}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
