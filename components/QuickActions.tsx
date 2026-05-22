import Link from 'next/link';
import { CATALOG_STATS } from '@/lib/catalog-stats';

const ACTIONS = [
  { icon: '🔍', label: 'Search Hotels', href: '/search', desc: `Browse ${CATALOG_STATS.hotels} hotels`, color: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
  { icon: '📊', label: 'Compare Prices', href: '/compare', desc: 'Side-by-side comparison', color: 'bg-purple-50 hover:bg-purple-100 border-purple-200' },
  { icon: '🔥', label: "Today's Deals", href: '/deals', desc: 'Available rates', color: 'bg-red-50 hover:bg-red-100 border-red-200' },
  { icon: '🌍', label: 'Explore', href: '/explore', desc: 'Browse destinations', color: 'bg-green-50 hover:bg-green-100 border-green-200' },
  { icon: '❤️', label: 'Favorites', href: '/favorites', desc: 'Saved hotels', color: 'bg-pink-50 hover:bg-pink-100 border-pink-200' },
  { icon: '✈️', label: 'My Trips', href: '/trips', desc: 'Plan & track', color: 'bg-amber-50 hover:bg-amber-100 border-amber-200' },
  { icon: '📈', label: 'Price History', href: '/compare', desc: 'Trend review', color: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200' },
  { icon: '📅', label: 'Find Dates', href: '/compare', desc: 'Cheaper alternatives', color: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200' },
];

export default function QuickActions({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <h3 className="text-sm font-bold text-slate-900 mb-3">⚡ Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ACTIONS.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className={`flex items-center gap-3 p-3 rounded-xl border transition ${a.color}`}
          >
            <span className="text-xl">{a.icon}</span>
            <div>
              <p className="text-xs font-semibold text-slate-800">{a.label}</p>
              <p className="text-[9px] text-slate-500">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
