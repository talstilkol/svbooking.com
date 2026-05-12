import { notFound } from 'next/navigation';
import { findHotel } from '@/lib/hotels-catalog';
import HotelDetailClient from '@/components/HotelDetailClient';

type Props = {
  params: Promise<{ key: string }>;
};

export default async function HotelDetailPage({ params }: Props) {
  const { key } = await params;
  const hotel = findHotel(key);

  if (!hotel) {
    notFound();
  }

  return <HotelDetailClient hotel={hotel} />;
}
