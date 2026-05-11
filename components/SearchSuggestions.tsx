'use client';

import { useMemo } from 'react';
import Link from 'next/link';

interface SearchSuggestionsProps {
  currentCity?: string;
  className?: string;
}

interface Suggestion {
  type: 'city' | 'deal' | 'trending';
  label: string;
  href: string;
  icon: string;
  detail?: string;
}

const POPULAR_SEARCHES: Suggestion[] = [
  { type: 'trending', label: 'Paris Hotels', href: '/search?city=Paris', icon: '🔥', detail: 'Most searched this week' },
  { type: 'trending', label: 'Tokyo Stays', href: '/search?city=Tokyo', icon: '🔥', detail: 'Trending destination' },
  { type: 'deal', label: 'Bangkok Deals', href: '/search?city=Bangkok', icon: '💰', detail: 'From $25/night' },
  { type: 'deal', label: 'Bali Budget', href: '/search?city=Bali', icon: '💰', detail: 'From $30/night' },
  { type: 'city', label: 'Dubai Luxury', href: '/search?city=Dubai', icon: '✨', detail: '4+ star hotels' },
  { type: 'city', label: 'Barcelona Beach', href: '/search?city=Barcelona', icon: '🏖️', detail: 'Beachfront hotels' },
  { type: 'city', label: 'London Central', href: '/search?city=London', icon: '🏛️', detail: 'Zone 1 hotels' },
  { type: 'city', label: 'New York Manhattan', href: '/search?city=New%20York', icon: '🗽', detail: 'Midtown hotels' },
  { type: 'deal', label: 'Rome Last Minute', href: '/search?city=Rome', icon: '⏰', detail: 'Book today, save 20%' },
  { type: 'trending', label: 'Tel Aviv Beach', href: '/search?city=Tel%20Aviv', icon: '☀️', detail: 'Mediterranean stays' },
];

export default function SearchSuggestions({ currentCity, className = '' }: SearchSuggestionsProps) {
  const suggestions = useMemo(() => {
    const filtered = currentCity
      ? POPULAR_SEARCHES.filter(
          (s) => !s.label.toLowerCase().includes(currentCity.toLowerCase())
        )
      : POPULAR_SEARCHES;

    // Pick 6 suggestions, rotating daily
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    const start = dayOfYear % filtered.length;
    const result: Suggestion[] = [];
    for (let i = 0; i < 6; i++) {
      result.push(filtered[(start + i) % filtered.length]);
    }
    return result;
  }, [currentCity]);

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">🔍 Popular Searches</h3>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition"
          >
            <span className="text-sm">{s.icon}</span>
            <div>
              <p className="text-xs font-medium text-slate-800 group-hover:text-blue-600 transition">
                {s.label}
              </p>
              {s.detail && (
                <p className="text-[9px] text-slate-400">{s.detail}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
