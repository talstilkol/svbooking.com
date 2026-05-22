import Link from 'next/link';

interface SearchSuggestionsProps {
  currentCity?: string;
  className?: string;
}

interface Suggestion {
  type: 'city';
  label: string;
  href: string;
  icon: string;
  detail?: string;
}

const POPULAR_SEARCHES: Suggestion[] = [
  { type: 'city', label: 'Paris', href: '/search?city=Paris', icon: '📍', detail: 'Catalog destination' },
  { type: 'city', label: 'Tokyo', href: '/search?city=Tokyo', icon: '📍', detail: 'Catalog destination' },
  { type: 'city', label: 'Bangkok', href: '/search?city=Bangkok', icon: '📍', detail: 'Catalog destination' },
  { type: 'city', label: 'Bali', href: '/search?city=Bali', icon: '📍', detail: 'Catalog destination' },
  { type: 'city', label: 'Dubai', href: '/search?city=Dubai', icon: '📍', detail: 'Catalog destination' },
  { type: 'city', label: 'Barcelona', href: '/search?city=Barcelona', icon: '📍', detail: 'Catalog destination' },
  { type: 'city', label: 'London', href: '/search?city=London', icon: '📍', detail: 'Catalog destination' },
  { type: 'city', label: 'New York', href: '/search?city=New%20York', icon: '📍', detail: 'Catalog destination' },
  { type: 'city', label: 'Rome', href: '/search?city=Rome', icon: '📍', detail: 'Catalog destination' },
  { type: 'city', label: 'Tel Aviv', href: '/search?city=Tel%20Aviv', icon: '📍', detail: 'Catalog destination' },
];

export default function SearchSuggestions({ currentCity, className = '' }: SearchSuggestionsProps) {
  const suggestions = (currentCity
    ? POPULAR_SEARCHES.filter((s) => !s.label.toLowerCase().includes(currentCity.toLowerCase()))
    : POPULAR_SEARCHES
  ).slice(0, 6);

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
