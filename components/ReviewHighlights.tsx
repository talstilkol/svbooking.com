'use client';

import { useLocale } from '@/components/LocaleProvider';

interface ReviewHighlightsProps {
  hotelKey: string;
  hotelName: string;
  className?: string;
}

export default function ReviewHighlights({ hotelKey, hotelName, className = '' }: ReviewHighlightsProps) {
  const { t } = useLocale();
  void hotelKey;
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 ${className}`}>
      <h3 className="text-lg font-semibold text-slate-800">{t('reviewHighlightsHeading')}</h3>
      <p className="text-sm text-slate-600 mt-2">
        {t('reviewHighlightsUnavailable').replace('{hotelName}', hotelName)}
      </p>
      <div className="mt-4 rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-slate-500">
        {t('reviewHighlightsStatus')}
      </div>
    </div>
  );
}
