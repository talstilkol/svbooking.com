import Link from 'next/link';

const QUICK_SEARCHES = [
  { label: 'Beach Hotels', query: 'Bali' },
  { label: 'City Breaks', query: 'London' },
  { label: 'Luxury Stays', query: 'Dubai' },
  { label: 'Budget Friendly', query: 'Bangkok' },
  { label: 'Romantic', query: 'Paris' },
  { label: 'Family', query: 'Barcelona' },
  { label: 'Business', query: 'Tokyo' },
  { label: 'Adventure', query: 'Phuket' },
];

export default function QuickSearchChips({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <span className="text-xs text-slate-400 self-center mr-1">Popular:</span>
      {QUICK_SEARCHES.map((s) => (
        <Link
          key={s.query}
          href={`/search?city=${encodeURIComponent(s.query)}`}
          className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}
