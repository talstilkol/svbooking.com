'use client';

import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';

const SUGGESTIONS = [
  { href: '/search', labelKey: 'nfBrowseHotels', icon: '🏨' },
  { href: '/compare', labelKey: 'nfComparePrices', icon: '💰' },
  { href: '/explore', labelKey: 'nfExploreDestinations', icon: '🗺️' },
  { href: '/deals', labelKey: 'nfAvailableDeals', icon: '🔥' },
];

export default function NotFound() {
  const { t } = useLocale();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-8">
      <div className="max-w-lg w-full text-center">
        <div className="text-8xl mb-6 opacity-80">🏝️</div>
        <h1 className="text-4xl font-bold text-slate-900 mb-3">{t('nfTitle')}</h1>
        <p className="text-lg text-slate-600 mb-8">{t('nfDescription')}</p>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {SUGGESTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all text-left"
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="font-medium text-slate-700 text-sm">{t(s.labelKey)}</span>
            </Link>
          ))}
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t('nfBackHome')}
        </Link>
      </div>
    </div>
  );
}
