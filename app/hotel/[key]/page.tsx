import { notFound } from 'next/navigation';
import { findHotel, HOTELS } from '@/lib/hotels-catalog';
import HotelDetailClient from '@/components/HotelDetailClient';
import { kv } from '@/lib/kv';

type Props = {
  params: Promise<{ key: string }>;
};

export const revalidate = 86400;

export function generateStaticParams() {
  return HOTELS.map((h: { hotelKey: string }) => ({ key: h.hotelKey }));
}

/**
 * Attempt to read a cached price snapshot for the hotel.
 * This is best-effort — if KV is unavailable or no data exists, the page
 * still works fine (client-side fetch fills in). When data IS available,
 * the hotel page can show a price hint immediately on load (no waterfall).
 */
async function getInitialPriceHint(hotelKey: string) {
  try {
    const latestKey = `latest-rates:${hotelKey}:USD`;
    const cached = await kv.get(latestKey);
    if (cached?.result?.rates?.length > 0) {
      const cheapest = cached.result.rates.reduce(
        (min: { total?: number; rate?: number } | null, r: { total?: number; rate?: number }) => {
          const total = Number(r.total || r.rate || 0);
          const minTotal = Number(min?.total || min?.rate || Infinity);
          return total > 0 && total < minTotal ? r : min;
        },
        null
      );
      if (cheapest) {
        return {
          price: Number(cheapest.total || cheapest.rate || 0),
          provider: String(cheapest.name || cheapest.provider || 'Provider'),
          currency: cached.result.currency || 'USD',
          freshness: 'cached',
          forDates: cached.forDates || null,
        };
      }
    }
  } catch {
    // Non-critical — page works without initial price
  }
  return null;
}

export default async function HotelDetailPage({ params }: Props) {
  const { key } = await params;
  const hotel = findHotel(key);

  if (!hotel) {
    notFound();
  }

  const initialPrice = await getInitialPriceHint(key);

  return <HotelDetailClient hotel={hotel} initialPrice={initialPrice} />;
}
