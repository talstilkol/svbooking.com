'use client';

import Link from 'next/link';

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
  bestProvider: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  currency: string;
}

export default function DealCard({ deal }: { deal: Deal }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="relative">
        <img
          src={deal.hotel.image}
          alt={deal.hotel.name}
          className="w-full h-40 object-cover"
        />
        <div className="absolute top-2 right-2 px-2 py-1 bg-emerald-600 text-white text-xs font-bold rounded">
          ${deal.pricePerNight}/night
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-zinc-900 text-sm truncate">
          {deal.hotel.name}
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          {deal.hotel.city}, {deal.hotel.country}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-zinc-900">
              ${deal.bestPrice.toFixed(0)}
            </p>
            <p className="text-xs text-zinc-500">
              {deal.nights} nights · {deal.bestProvider}
            </p>
          </div>
          <Link
            href={`/compare?hotelKey=${deal.hotel.hotelKey}&checkIn=${deal.checkIn}&checkOut=${deal.checkOut}`}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Deal
          </Link>
        </div>
      </div>
    </div>
  );
}
