'use client';

import { useEffect, useState } from 'react';
import DealCard from './DealCard';

interface Deal {
  hotel: { hotelKey: string; name: string; city: string; country: string; image: string };
  bestPrice: number;
  pricePerNight: number;
  bestProvider: string | null;
  priceSourceLabel?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  currency: string;
}

export default function TopDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/deals?limit=3', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setDeals(data.deals || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (deals.length === 0) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 mb-4 text-center">
        Today&apos;s Available Deals
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {deals.map((deal) => (
          <DealCard key={deal.hotel.hotelKey} deal={deal} />
        ))}
      </div>
    </div>
  );
}
