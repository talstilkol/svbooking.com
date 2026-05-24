import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Explore Destinations',
  description: 'Browse hotel deals by continent, country, and city. Discover available provider rates for your next trip across Europe, Asia, Middle East and Americas.',
  alternates: { canonical: '/explore' },
  openGraph: {
    title: 'Explore Hotel Destinations | SV Booking',
    description: 'Browse deals by continent, country, and city across Europe, Asia, Middle East and Americas.',
    type: 'website',
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: 'https://svbooking.com' },
        { name: 'Explore Destinations', url: 'https://svbooking.com/explore' },
      ]} />
      {children}
    </>
  );
}
