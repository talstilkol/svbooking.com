import { notFound } from 'next/navigation';
import { findHotel, HOTELS } from '@/lib/hotels-catalog';
import HotelDetailClient from '@/components/HotelDetailClient';

type Props = {
  params: Promise<{ key: string }>;
};

export function generateStaticParams() {
  return HOTELS.map((h: { hotelKey: string }) => ({ key: h.hotelKey }));
}

export default async function HotelDetailPage({ params }: Props) {
  const { key } = await params;
  const hotel = findHotel(key);

  if (!hotel) {
    notFound();
  }

  return <HotelDetailClient hotel={hotel} />;
}
