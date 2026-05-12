import type { Metadata } from 'next';
import { HOTELS, listCities } from '@/lib/hotels-catalog';
import SearchClient from '@/components/SearchClient';

type Props = {
  searchParams: Promise<{ city?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { city } = await searchParams;
  if (city) {
    return {
      title: `Hotels in ${city} — Compare Prices | SVBooking`,
      description: `Compare live hotel prices in ${city} from Booking.com, Expedia, Hotels.com, Agoda & more. Find the best deals across multiple providers.`,
    };
  }
  return {
    title: 'Find Hotels — Compare Prices | SVBooking',
    description: 'Search and compare hotel prices from Booking.com, Expedia, Hotels.com, Agoda and more. Find the best deals across multiple providers.',
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { city } = await searchParams;
  const hotels = HOTELS;
  const cities = listCities();

  return <SearchClient hotels={hotels} cities={cities} initialCity={city || ''} />;
}
