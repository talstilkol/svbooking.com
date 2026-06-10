'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from '@/components/LocaleProvider';
import { useRecentlyViewed } from '@/lib/useLocalStorage';

export default function RecentlyViewed() {
  const { t } = useLocale();
  const { items, hydrated } = useRecentlyViewed();

  if (!hydrated || items.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-xl font-bold text-slate-800 mb-4">{t('recentlyViewedHeading')}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {items.map((hotel) => (
          <Link
            key={hotel.hotelKey}
            href={`/hotel/${hotel.hotelKey}`}
            className="flex-none w-48 bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-blue-300 transition-all group"
          >
            <div className="relative h-28">
              <Image
                src={hotel.image}
                alt={hotel.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="192px"
              />
            </div>
            <div className="p-3">
              <p className="font-semibold text-slate-900 text-sm truncate">{hotel.name}</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {hotel.city}, {hotel.country}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
