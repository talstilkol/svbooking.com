'use client';

import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';
import { CATALOG_STATS } from '@/lib/catalog-stats';

const ACTIONS = [
  { icon: '🔍', labelKey: 'qaSearchHotels', href: '/search', descKey: 'qaBrowseHotels', color: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
  { icon: '📊', labelKey: 'qaComparePrices', href: '/compare', descKey: 'qaSideBySideComparison', color: 'bg-purple-50 hover:bg-purple-100 border-purple-200' },
  { icon: '🔥', labelKey: 'qaTodaysDeals', href: '/deals', descKey: 'qaAvailableRates', color: 'bg-red-50 hover:bg-red-100 border-red-200' },
  { icon: '🌍', labelKey: 'qaExplore', href: '/explore', descKey: 'qaBrowseDestinations', color: 'bg-green-50 hover:bg-green-100 border-green-200' },
  { icon: '❤️', labelKey: 'qaFavorites', href: '/favorites', descKey: 'qaSavedHotels', color: 'bg-pink-50 hover:bg-pink-100 border-pink-200' },
  { icon: '✈️', labelKey: 'qaMyTrips', href: '/trips', descKey: 'qaPlanTrack', color: 'bg-amber-50 hover:bg-amber-100 border-amber-200' },
  { icon: '📈', labelKey: 'qaPriceHistory', href: '/compare', descKey: 'qaTrendReview', color: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200' },
  { icon: '📅', labelKey: 'qaFindDates', href: '/compare', descKey: 'qaCheaperAlternatives', color: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200' },
];

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  ));
}

export default function QuickActions({ className = '' }: { className?: string }) {
  const { t } = useLocale();

  return (
    <div className={className}>
      <h3 className="text-sm font-bold text-slate-900 mb-3">⚡ {t('quickActionsHeading')}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ACTIONS.map((a) => (
          <Link
            key={a.labelKey}
            href={a.href}
            className={`flex items-center gap-3 p-3 rounded-xl border transition ${a.color}`}
          >
            <span className="text-xl">{a.icon}</span>
            <div>
              <p className="text-xs font-semibold text-slate-800">{t(a.labelKey)}</p>
              <p className="text-[9px] text-slate-500">
                {interpolate(t(a.descKey), { hotels: CATALOG_STATS.hotels })}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
