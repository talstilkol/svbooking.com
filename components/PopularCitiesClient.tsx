'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from '@/components/LocaleProvider';

export interface PopularCityItem {
  city: string;
  count: number;
  image?: string;
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  ));
}

export default function PopularCitiesClient({ cities }: { cities: PopularCityItem[] }) {
  const { t } = useLocale();

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <h2 className="text-2xl font-bold text-slate-800 text-center mb-2">
        {t('popularCitiesHeading')}
      </h2>
      <p className="text-center text-slate-500 mb-8">
        {t('popularCitiesSubtext')}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cities.map((item) => {
          const hotelWord = item.count === 1 ? t('cityHotelSingular') : t('cityHotelPlural');
          return (
            <Link
              key={item.city}
              href={`/city/${encodeURIComponent(item.city)}`}
              className="group relative rounded-xl overflow-hidden aspect-[4/3] bg-slate-200"
            >
              {item.image && (
                <Image
                  src={item.image}
                  alt={interpolate(t('cityHotelsIn'), { city: item.city })}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              )}
              <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h3 className="font-bold text-lg drop-shadow-lg">{item.city}</h3>
                <p className="text-sm text-white/80">
                  {interpolate(t('popularCitiesHotelCount'), {
                    count: item.count,
                    hotelWord,
                  })}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
