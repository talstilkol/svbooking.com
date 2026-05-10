'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useFavorites } from '@/lib/useLocalStorage';

export interface CatalogHotel {
  hotelKey: string;
  name: string;
  city: string;
  country: string;
  image: string;
}

export default function HotelCard({ hotel }: { hotel: CatalogHotel }) {
  const { isFavorite, toggleFavorite, hydrated } = useFavorites();
  const fav = hydrated && isFavorite(hotel.hotelKey);

  return (
    <div className="bg-white rounded-lg shadow-md border border-zinc-200 overflow-hidden flex flex-col">
      <div className="relative">
        <Image src={hotel.image} alt={hotel.name} width={400} height={192} className="w-full h-48 object-cover" />
        <button
          onClick={() => toggleFavorite(hotel)}
          aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md hover:scale-110 transition"
        >
          <span className={`text-2xl ${fav ? 'text-red-500' : 'text-zinc-400'}`}>
            {fav ? '♥' : '♡'}
          </span>
        </button>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h2 className="text-xl font-bold text-zinc-900">{hotel.name}</h2>
        <p className="text-sm text-zinc-500 mb-4">
          {hotel.city}, {hotel.country}
        </p>
        <div className="mt-auto flex gap-2">
          <Link
            href={`/compare?hotelKey=${hotel.hotelKey}`}
            className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Compare prices
          </Link>
          <Link
            href={`/trips?hotelKey=${hotel.hotelKey}`}
            className="flex-1 text-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            Plan trip
          </Link>
        </div>
      </div>
    </div>
  );
}
