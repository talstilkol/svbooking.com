'use client';

import { CATALOG_STATS } from '@/lib/catalog-stats';
import { useLocale } from '@/components/LocaleProvider';

export default function TrustBadges({ className = '' }: { className?: string }) {
  const { t } = useLocale();

  const badges = [
    { icon: '🔒', label: t('trustSecure'), desc: t('trustSecureDesc') },
    { icon: '💯', label: t('trustFree'), desc: t('trustFreeDesc') },
    { icon: '⚡', label: t('trustRates'), desc: t('trustRatesDesc') },
    {
      icon: '🌍',
      label: `${CATALOG_STATS.cities} ${t('trustCities')}`,
      desc: `${CATALOG_STATS.hotels} ${t('trustCatalogHotels')}`,
    },
  ];

  return (
    <div className={`flex flex-wrap justify-center gap-6 ${className}`}>
      {badges.map((badge) => (
        <div key={badge.label} className="flex items-center gap-2 text-sm">
          <span className="text-lg" aria-hidden="true">{badge.icon}</span>
          <div>
            <div className="font-semibold text-slate-700">{badge.label}</div>
            <div className="text-xs text-slate-500">{badge.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
