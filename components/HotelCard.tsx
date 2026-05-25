'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useFavorites } from '@/lib/useLocalStorage';
import { useToast } from '@/components/Toast';
import RatingBadge from '@/components/RatingBadge';

import type { CatalogHotel } from '@/lib/types';
export type { CatalogHotel } from '@/lib/types';

export default function HotelCard({ hotel }: { hotel: CatalogHotel }) {
  const { isFavorite, toggleFavorite, hydrated } = useFavorites();
  const { showToast } = useToast();
  const fav = hydrated && isFavorite(hotel.hotelKey);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col hover:shadow-md hover:border-blue-200 transition-all group">
      <Link href={`/hotel/${hotel.hotelKey}`} className="relative block">
        <Image src={hotel.image} alt={hotel.name} width={400} height={192} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(hotel); showToast(fav ? `Removed ${hotel.name} from favorites` : `Added ${hotel.name} to favorites`, 'success'); }}
          aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md hover:scale-110 transition"
        >
          <span className={`text-2xl ${fav ? 'text-red-500' : 'text-zinc-400'}`}>
            {fav ? '♥' : '♡'}
          </span>
        </button>
      </Link>
      <div className="p-5 flex-1 flex flex-col">
        <Link href={`/hotel/${hotel.hotelKey}`} className="hover:text-blue-600 transition-colors">
          <h2 className="text-lg font-bold text-zinc-900 leading-snug">{hotel.name}</h2>
        </Link>
        <p className="text-sm text-zinc-500 mt-0.5 mb-2">
          📍 {hotel.city}, {hotel.country}
        </p>
        <RatingBadge size="sm" className="mb-3" />
        <div className="mt-auto flex gap-2">
          <Link
            href={`/hotel/${hotel.hotelKey}`}
            className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition"
          >
            See prices
          </Link>
          <Link
            href={`/trips?hotelKey=${hotel.hotelKey}`}
            className="flex-1 text-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium transition"
          >
            Plan trip
          </Link>
        </div>
      </div>
    </div>
  );
}
