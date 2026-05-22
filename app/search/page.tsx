import type { Metadata } from 'next';
import { HOTELS, listCities } from '@/lib/hotels-catalog';
import SearchClient from '@/components/SearchClient';
import { BreadcrumbJsonLd } from '@/components/JsonLd';

type Props = {
  searchParams: Promise<{ city?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { city } = await searchParams;
  if (city) {
    return {
      title: `Hotels in ${city} — Compare Prices | SVBooking`,
      description: `Compare provider-returned hotel prices in ${city} when configured sources return rates.`,
      alternates: { canonical: `/search?city=${encodeURIComponent(city)}` },
    };
  }
  return {
    title: 'Find Hotels — Compare Prices | SVBooking',
    description: 'Search and compare provider-returned hotel prices when configured sources return rates.',
    alternates: { canonical: '/search' },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { city } = await searchParams;
  const hotels = HOTELS;
  const cities = listCities();

  const breadcrumbs = [
    { name: 'Home', url: 'https://svbooking.com' },
    { name: 'Search', url: 'https://svbooking.com/search' },
    ...(city ? [{ name: city, url: `https://svbooking.com/search?city=${encodeURIComponent(city)}` }] : []),
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <SearchClient hotels={hotels} cities={cities} initialCity={city || ''} />
    </>
  );
}
