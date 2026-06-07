'use client';

import { useLocale } from '@/components/LocaleProvider';

export default function PriceComparisonNotice({ className = '' }: { className?: string }) {
  const { t } = useLocale();

  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-xl p-5 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
          <span className="text-2xl" aria-hidden="true">&#128269;</span>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 mb-1">{t('priceComparisonNoticeTitle')}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {t('priceComparisonNoticeDesc')}
          </p>
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span aria-hidden="true">&#10003;</span> {t('priceComparisonProviderRates')}
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden="true">&#10003;</span> {t('priceComparisonDateSpecific')}
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden="true">&#10003;</span> {t('priceComparisonCheckout')}
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden="true">&#10003;</span> {t('priceComparisonTerms')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
