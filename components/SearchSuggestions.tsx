'use client';

import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';

interface SearchSuggestionsProps {
  currentCity?: string;
  className?: string;
}

interface Suggestion {
  type: 'city';
  label: string;
  href: string;
  icon: string;
}

const POPULAR_SEARCHES: Suggestion[] = [
  { type: 'city', label: 'Paris', href: '/search?city=Paris', icon: '📍' },
  { type: 'city', label: 'Tokyo', href: '/search?city=Tokyo', icon: '📍' },
  { type: 'city', label: 'Bangkok', href: '/search?city=Bangkok', icon: '📍' },
  { type: 'city', label: 'Bali', href: '/search?city=Bali', icon: '📍' },
  { type: 'city', label: 'Dubai', href: '/search?city=Dubai', icon: '📍' },
  { type: 'city', label: 'Barcelona', href: '/search?city=Barcelona', icon: '📍' },
  { type: 'city', label: 'London', href: '/search?city=London', icon: '📍' },
  { type: 'city', label: 'New York', href: '/search?city=New%20York', icon: '📍' },
  { type: 'city', label: 'Rome', href: '/search?city=Rome', icon: '📍' },
  { type: 'city', label: 'Tel Aviv', href: '/search?city=Tel%20Aviv', icon: '📍' },
];

export default function SearchSuggestions({ currentCity, className = '' }: SearchSuggestionsProps) {
  const { t } = useLocale();
  const suggestions = (currentCity
    ? POPULAR_SEARCHES.filter((s) => !s.label.toLowerCase().includes(currentCity.toLowerCase()))
    : POPULAR_SEARCHES
  ).slice(0, 6);

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">🔍 {t('ssPopularSearches')}</h3>
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
              <p className="text-[9px] text-slate-500">{t('ssCatalogDestination')}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
