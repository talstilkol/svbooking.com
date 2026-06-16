'use client';

import { useLocale } from '@/components/LocaleProvider';

interface HotelPoliciesProps {
  className?: string;
}

export default function HotelPolicies({ className = '' }: HotelPoliciesProps) {
  const { t } = useLocale();
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 ${className}`}>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{t('hotelPoliciesHeading')}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">
        {t('hotelPoliciesUnavailable')}
      </p>
    </div>
  );
}
