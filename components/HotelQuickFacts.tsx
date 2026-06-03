'use client';

import { useLocale } from '@/components/LocaleProvider';

interface HotelQuickFactsProps {
  hotelKey: string;
  hotelName: string;
  city: string;
  className?: string;
}

export default function HotelQuickFacts({
  hotelKey,
  hotelName,
  city,
  className = '',
}: HotelQuickFactsProps) {
  const { t } = useLocale();
  const unavailable = t('hdUnavailable');
  const facts = [
    { icon: '📍', label: t('compareCity'), value: city || unavailable },
    { icon: '🔑', label: t('qfCatalogKey'), value: hotelKey },
    { icon: '⭐', label: t('qfCategory'), value: unavailable },
    { icon: '🏨', label: t('qfRooms'), value: unavailable },
    { icon: '🏗️', label: t('qfBuilt'), value: unavailable },
    { icon: '🔧', label: t('qfRenovated'), value: unavailable },
    { icon: '📌', label: t('qfDistanceData'), value: unavailable },
    { icon: '🕐', label: t('qfCheckInOut'), value: t('qfProviderSite') },
    { icon: '🌐', label: t('qfLanguages'), value: unavailable },
  ];

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
      <h3 className="text-sm font-bold text-slate-900 mb-3">📋 {t('qfTitle')} — {hotelName}</h3>

      <div className="grid grid-cols-2 gap-2">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg"
          >
            <span className="text-sm">{fact.icon}</span>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500">{fact.label}</p>
              <p className="text-xs text-slate-700 font-medium truncate">{fact.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
