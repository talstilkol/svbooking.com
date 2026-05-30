import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/JsonLd';
import AboutClient from './AboutClient';

export const metadata: Metadata = {
  title: 'About SV Booking',
  description:
    'Learn about SV Booking — the free hotel price comparison platform that helps travelers compare verified prices across a curated global catalog.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About SV Booking',
    description: 'Free hotel price comparison across a curated global catalog of verified properties.',
    type: 'website',
  },
};

export default function AboutPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://svbooking.com' },
          { name: 'About', url: 'https://svbooking.com/about' },
        ]}
      />
      <AboutClient />
    </>
  );
}
