'use client';

import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';

export default function HomeQuickLinks() {
  const { t } = useLocale();
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 text-center">
      <h2 className="text-xl font-bold text-slate-800 mb-6">{t('homeGetStarted')}</h2>
      <div className="flex justify-center gap-3 flex-wrap">
        <Link href="/search" className="px-6 py-3 bg-white text-slate-700 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all font-medium">
          {t('footerBrowseHotels')}
        </Link>
        <Link href="/compare" className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm">
          {t('footerComparePrices')}
        </Link>
        <Link href="/deals" className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium shadow-sm">
          {t('footerTodaysDeals')}
        </Link>
        <Link href="/explore" className="px-6 py-3 bg-white text-slate-700 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all font-medium">
          {t('footerExploreDestinations')}
        </Link>
      </div>
    </div>
  );
}
