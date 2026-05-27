import type { Metadata } from 'next';
import DealsClient from '@/components/DealsClient';
import { BreadcrumbJsonLd, ItemListJsonLd } from '@/components/JsonLd';
import { HOTELS } from '@/lib/hotels-catalog';

export const metadata: Metadata = {
  title: 'Hotel Deals — Compare Provider Prices | SVBooking',
  description:
    'Compare provider-returned hotel rates from configured sources when verified deal data is available.',
  alternates: { canonical: '/deals' },
  openGraph: {
    title: 'Hotel Deals | SVBooking',
    description:
      'AI-powered deal scanner reports provider-returned hotel rates with source metadata when available.',
    type: 'website',
  },
};

export default function DealsPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://svbooking.com' },
          { name: 'Deals', url: 'https://svbooking.com/deals' },
        ]}
      />
      <ItemListJsonLd
        name="Hotel Deals"
        items={HOTELS.slice(0, 20).map((h) => ({
          name: h.name,
          url: `https://svbooking.com/hotel/${h.hotelKey}`,
          image: h.image,
        }))}
      />
      <DealsClient />
    </>
  );
}
