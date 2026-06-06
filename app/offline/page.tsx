'use client';

import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';

export default function OfflinePage() {
  const { t } = useLocale();

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">&#x1F4F6;</div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">{t('offlineTitle')}</h1>
        <p className="text-slate-600 mb-6">{t('offlineDescription')}</p>
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            {t('offlineTryAgain')}
          </button>
          <Link
            href="/"
            className="block w-full px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
          >
            {t('offlineGoHome')}
          </Link>
        </div>
        <p className="mt-8 text-xs text-slate-500">{t('offlineLocalData')}</p>
      </div>
    </div>
  );
}
