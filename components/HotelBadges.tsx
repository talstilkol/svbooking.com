'use client';

import { useLocale } from '@/components/LocaleProvider';

interface HotelBadgesProps {
  className?: string;
}

export default function HotelBadges({ className = '' }: HotelBadgesProps) {
  const { t } = useLocale();
  return (
    <div className={`text-xs text-slate-500 ${className}`}>
      {t('hotelBadgesUnavailable')}
    </div>
  );
}
