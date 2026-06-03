'use client';

import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';

const QUICK_SEARCHES = [
  { labelKey: 'qsBeachHotels', query: 'Bali' },
  { labelKey: 'qsCityBreaks', query: 'London' },
  { labelKey: 'qsLuxuryStays', query: 'Dubai' },
  { labelKey: 'qsBudgetFriendly', query: 'Bangkok' },
  { labelKey: 'qsRomantic', query: 'Paris' },
  { labelKey: 'qsFamily', query: 'Barcelona' },
  { labelKey: 'qsBusiness', query: 'Tokyo' },
  { labelKey: 'qsAdventure', query: 'Phuket' },
];

export default function QuickSearchChips({ className = '' }: { className?: string }) {
  const { t } = useLocale();
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <span className="text-xs text-slate-500 self-center me-1">{t('qsPopular')}</span>
      {QUICK_SEARCHES.map((s) => (
        <Link
          key={s.query}
          href={`/search?city=${encodeURIComponent(s.query)}`}
          className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
        >
          {t(s.labelKey)}
        </Link>
      ))}
    </div>
  );
}
