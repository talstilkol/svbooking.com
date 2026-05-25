import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Price Comparison',
  description: 'Compare provider-returned hotel prices from configured sources when rates are available.',
  alternates: { canonical: '/compare' },
  openGraph: {
    title: 'Hotel Price Comparison | SV Booking',
    description: 'Compare hotel rates across multiple booking providers when available.',
    type: 'website',
  },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: 'https://svbooking.com' },
        { name: 'Compare Prices', url: 'https://svbooking.com/compare' },
      ]} />
      {children}
    </>
  );
}
