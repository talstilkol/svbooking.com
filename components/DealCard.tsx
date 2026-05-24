'use client';

import Link from 'next/link';
import Image from 'next/image';
import RatingBadge from '@/components/RatingBadge';

interface Deal {
  hotel: {
    hotelKey: string;
    name: string;
    city: string;
    country: string;
    image: string;
  };
  bestPrice: number;
  pricePerNight: number;
  bestProvider: string | null;
  priceSourceLabel?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  currency: string;
}

export default function DealCard({ deal }: { deal: Deal }) {
  const currency = deal.currency || 'USD';
  const sourceLabel = deal.bestProvider ? `via ${deal.bestProvider}` : deal.priceSourceLabel || 'Provider unavailable';
  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-200 transition-all group">
      <Link href={`/hotel/${deal.hotel.hotelKey}`} className="block relative">
        <Image
          src={deal.hotel.image}
          alt={deal.hotel.name}
          width={400}
          height={160}
          className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute top-2 right-2 px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow">
          {currency} {deal.pricePerNight.toFixed(0)}/night
        </div>
      </Link>
      <div className="p-4">
        <Link href={`/hotel/${deal.hotel.hotelKey}`} className="hover:text-blue-600 transition-colors">
          <h3 className="font-semibold text-zinc-900 text-sm truncate">{deal.hotel.name}</h3>
        </Link>
        <p className="text-xs text-zinc-500 mt-0.5 mb-2">
          📍 {deal.hotel.city}, {deal.hotel.country}
        </p>
        <RatingBadge size="sm" className="mb-3" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-zinc-900">
              {currency} {deal.bestPrice.toFixed(0)}
            </p>
            <p className="text-xs text-zinc-500">
              {deal.nights} night{deal.nights !== 1 ? 's' : ''} · {sourceLabel}
            </p>
          </div>
          <Link
            href={`/hotel/${deal.hotel.hotelKey}`}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            See prices →
          </Link>
        </div>
      </div>
    </div>
  );
}
