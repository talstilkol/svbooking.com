import type { Metadata } from 'next';
import DealsClient from '@/components/DealsClient';
import { BreadcrumbJsonLd } from '@/components/JsonLd';

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
      <DealsClient />
    </>
  );
}
