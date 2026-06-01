'use client';

import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

/** Localized hero overlay (breadcrumb + title + subtitle) for the city page. */
export function CityHero({ city, country, count }: { city: string; country: string; count: number }) {
  const { t } = useLocale();
  const hotelWord = count === 1 ? t('cityHotelSingular') : t('cityHotelPlural');
  return (
    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
      <div className="max-w-5xl mx-auto">
        <nav className="text-sm text-white/60 mb-2">
          <Link href="/" className="hover:text-white">{t('compareHome')}</Link>
          {' / '}
          <Link href="/search" className="hover:text-white">{t('cityNavHotels')}</Link>
          {' / '}
          <span className="text-white">{city}</span>
        </nav>
        <h1 className="text-3xl md:text-4xl font-bold drop-shadow-lg">
          {interpolate(t('cityHotelsIn'), { city })}
        </h1>
        <p className="text-white/80 mt-1">
          {interpolate(t('citySubtitle'), { count, hotelWord, country })}
        </p>
      </div>
    </div>
  );
}

/** Localized "Compare prices →" call-to-action shown on each hotel card. */
export function CityCompareCta() {
  const { t } = useLocale();
  return (
    <p className="text-xs text-blue-600 font-medium mt-2">
      {t('comparePrices')} →
    </p>
  );
}

/** Localized "Other cities in {country}" heading. */
export function OtherCitiesHeading({ country }: { country: string }) {
  const { t } = useLocale();
  return (
    <h2 className="text-lg font-semibold text-slate-800 mb-4">
      {interpolate(t('cityOtherCities'), { country })}
    </h2>
  );
}
